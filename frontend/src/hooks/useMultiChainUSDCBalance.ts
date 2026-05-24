"use client";
import { useEffect, useState } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { sepolia, avalancheFuji, baseSepolia } from "viem/chains";
import { defineChain } from "viem";

const polygonAmoy = defineChain({
  id: 80002,
  name: "Polygon Amoy",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc-amoy.polygon.technology"] } },
});

// USDC contract addresses on each testnet
const USDC_ADDRESSES: Record<string, `0x${string}`> = {
  Ethereum_Sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  Avalanche_Fuji:   "0x5425890298aed601595a70AB815c96711a31Bc65",
  Base_Sepolia:     "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  Polygon_Mumbai:   "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CLIENTS: Record<string, any> = {
  Ethereum_Sepolia: createPublicClient({ chain: sepolia,       transport: http() }),
  Avalanche_Fuji:   createPublicClient({ chain: avalancheFuji, transport: http() }),
  Base_Sepolia:     createPublicClient({ chain: baseSepolia,   transport: http() }),
  Polygon_Mumbai:   createPublicClient({ chain: polygonAmoy,   transport: http() }),
};

const balanceOfAbi = [{
  inputs: [{ name: "account", type: "address" }],
  name: "balanceOf",
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view",
  type: "function",
}] as const;

export function useMultiChainUSDCBalance(address: `0x${string}` | undefined) {
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);

    Promise.all(
      Object.entries(CLIENTS).map(async ([chainId, client]) => {
        try {
          const raw = await client.readContract({
            address: USDC_ADDRESSES[chainId],
            abi: balanceOfAbi,
            functionName: "balanceOf",
            args: [address],
          });
          return [chainId, parseFloat(formatUnits(raw, 6)).toFixed(2)] as const;
        } catch {
          return [chainId, "—"] as const;
        }
      })
    ).then(results => {
      setBalances(Object.fromEntries(results));
      setLoading(false);
    });
  }, [address]);

  return { balances, loading };
}
