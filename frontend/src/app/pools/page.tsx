"use client";
import { useReadContract } from "wagmi";
import { factoryAbi } from "@/abis/factory";
import { FACTORY_ADDRESS } from "@/lib/contracts";
import { PoolRow } from "@/components/PoolRow";

export default function PoolsPage() {
  const { data: poolCount } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "allPoolsLength",
  });

  const count = poolCount ? Number(poolCount) : 0;

  return (
    <div className="max-w-3xl mx-auto pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-arc-text">
          Pools <span className="text-arc-muted text-lg font-normal">({count})</span>
        </h1>
      </div>

      {count === 0 ? (
        <div className="bg-arc-card border border-arc-border rounded-3xl p-12 text-center text-arc-muted">
          No pools yet — be the first to create one on the Liquidity page!
        </div>
      ) : (
        <div className="bg-arc-card border border-arc-border rounded-3xl overflow-hidden">
          <div className="grid grid-cols-4 px-5 py-3 text-xs font-semibold text-arc-muted border-b border-arc-border uppercase tracking-wide">
            <span>Pool</span>
            <span className="text-right">Reserve 0</span>
            <span className="text-right">Reserve 1</span>
            <span className="text-right">TVL</span>
          </div>
          {Array.from({ length: count }, (_, i) => (
            <PoolRow key={i} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
