"use client";
import { useReadContracts } from "wagmi";
import { factoryAbi } from "@/abis/factory";
import { erc20Abi } from "@/abis/erc20";
import { FACTORY_ADDRESS } from "@/lib/contracts";
import { formatUnits } from "viem";

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
  { inputs: [], name: "token0", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "token1", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
] as const;

export function PoolRow({ index }: { index: number }) {
  const { data: poolAddr } = useReadContracts({
    contracts: [{ address: FACTORY_ADDRESS, abi: factoryAbi, functionName: "allPools", args: [BigInt(index)] }],
  });

  const pool = poolAddr?.[0]?.result as `0x${string}` | undefined;

  const { data } = useReadContracts({
    contracts: pool
      ? [
          { address: pool, abi: poolAbi, functionName: "token0" },
          { address: pool, abi: poolAbi, functionName: "token1" },
          { address: pool, abi: poolAbi, functionName: "getReserves" },
        ]
      : [],
    query: { enabled: !!pool },
  });

  const token0 = data?.[0]?.result as `0x${string}` | undefined;
  const token1 = data?.[1]?.result as `0x${string}` | undefined;
  const reserves = data?.[2]?.result as [bigint, bigint, number] | undefined;

  const { data: meta } = useReadContracts({
    contracts: token0 && token1
      ? [
          { address: token0, abi: erc20Abi, functionName: "symbol" },
          { address: token1, abi: erc20Abi, functionName: "symbol" },
          { address: token0, abi: erc20Abi, functionName: "decimals" },
          { address: token1, abi: erc20Abi, functionName: "decimals" },
        ]
      : [],
    query: { enabled: !!token0 && !!token1 },
  });

  const sym0 = meta?.[0]?.result as string | undefined;
  const sym1 = meta?.[1]?.result as string | undefined;
  const dec0 = (meta?.[2]?.result as number | undefined) ?? 18;
  const dec1 = (meta?.[3]?.result as number | undefined) ?? 18;

  if (!pool || !reserves) {
    return (
      <div className="grid grid-cols-4 px-5 py-4 border-b border-arc-border/50 animate-pulse">
        <div className="h-4 bg-arc-border rounded w-24" />
        <div className="h-4 bg-arc-border rounded w-16 ml-auto" />
        <div className="h-4 bg-arc-border rounded w-16 ml-auto" />
        <div className="h-4 bg-arc-border rounded w-12 ml-auto" />
      </div>
    );
  }

  const r0 = formatUnits(reserves[0], dec0);
  const r1 = formatUnits(reserves[1], dec1);

  return (
    <div className="grid grid-cols-4 px-5 py-4 border-b border-arc-border/50 hover:bg-arc-border/20 transition-colors">
      <span className="font-semibold text-arc-text">
        {sym0 ?? "..."}/{sym1 ?? "..."}
      </span>
      <span className="text-right text-arc-muted text-sm">
        {parseFloat(r0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </span>
      <span className="text-right text-arc-muted text-sm">
        {parseFloat(r1).toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </span>
      <span className="text-right text-arc-success text-sm font-medium">
        —
      </span>
    </div>
  );
}
