"use client";
import { useEffect, useState } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { FACTORY_ADDRESS, KNOWN_TOKENS } from "@/lib/contracts";
import { factoryAbi } from "@/abis/factory";

const arcTestnetChain = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
} as const;

const poolAbi = [
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = createPublicClient({ chain: arcTestnetChain as any, transport: http() });

export interface Position {
  poolAddress: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  token0Symbol: string;
  token1Symbol: string;
  lpBalance: string;
  share: number;
  token0Amount: string;
  token1Amount: string;
}

function tokenMeta(addr: string) {
  const t = KNOWN_TOKENS.find(t => t.address.toLowerCase() === addr.toLowerCase());
  return { symbol: t?.symbol ?? addr.slice(2, 6).toUpperCase(), decimals: t?.decimals ?? 18 };
}

export function usePositions(address: `0x${string}` | undefined) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) { setPositions([]); return; }
    setLoading(true);

    async function load() {
      const count = await client.readContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "allPoolsLength",
      });

      if (count === 0n) { setPositions([]); setLoading(false); return; }

      const poolAddrs = await Promise.all(
        Array.from({ length: Number(count) }, (_, i) =>
          client.readContract({
            address: FACTORY_ADDRESS,
            abi: factoryAbi,
            functionName: "allPools",
            args: [BigInt(i)],
          })
        )
      );

      const data = await Promise.all(
        poolAddrs.map(async poolAddr => {
          const [lpBal, totalSup, t0, t1, reserves] = await Promise.all([
            client.readContract({ address: poolAddr, abi: poolAbi, functionName: "balanceOf", args: [address!] }),
            client.readContract({ address: poolAddr, abi: poolAbi, functionName: "totalSupply" }),
            client.readContract({ address: poolAddr, abi: poolAbi, functionName: "token0" }),
            client.readContract({ address: poolAddr, abi: poolAbi, functionName: "token1" }),
            client.readContract({ address: poolAddr, abi: poolAbi, functionName: "getReserves" }),
          ]);
          return { poolAddr, lpBal, totalSup, t0, t1, reserves };
        })
      );

      const userPositions: Position[] = data
        .filter(r => r.lpBal > 0n && r.totalSup > 0n)
        .map(r => {
          const share = Number(r.lpBal * 1000000n / r.totalSup) / 10000;
          const t0Meta = tokenMeta(r.t0);
          const t1Meta = tokenMeta(r.t1);
          const [res0, res1] = r.reserves;
          const t0Amount = formatUnits((BigInt(res0) * r.lpBal) / r.totalSup, t0Meta.decimals);
          const t1Amount = formatUnits((BigInt(res1) * r.lpBal) / r.totalSup, t1Meta.decimals);
          return {
            poolAddress: r.poolAddr,
            token0: r.t0,
            token1: r.t1,
            token0Symbol: t0Meta.symbol,
            token1Symbol: t1Meta.symbol,
            lpBalance: formatUnits(r.lpBal, 18),
            share,
            token0Amount: parseFloat(t0Amount).toFixed(4),
            token1Amount: parseFloat(t1Amount).toFixed(4),
          };
        });

      setPositions(userPositions);
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [address]);

  return { positions, loading };
}
