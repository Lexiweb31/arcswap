"use client";
import { useAccount } from "wagmi";
import { usePositions } from "@/hooks/usePositions";

export function PositionsPanel() {
  const { address } = useAccount();
  const { positions, loading } = usePositions(address);

  if (!address) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-10 text-center max-w-lg mx-auto shadow-xl">
        <p className="text-[var(--muted)]">Connect your wallet to view your LP positions.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-10 text-center max-w-lg mx-auto shadow-xl">
        <p className="text-[var(--muted)] animate-pulse">Loading positions...</p>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-10 text-center max-w-lg mx-auto shadow-xl">
        <p className="text-[var(--text)] font-semibold mb-2">No active positions</p>
        <p className="text-xs text-[var(--muted)]">Add liquidity to a pool to start earning 0.3% fees on every swap.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
      {positions.map(pos => (
        <div
          key={pos.poolAddress}
          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-arc-primary/20 border-2 border-[var(--card)] flex items-center justify-center text-xs font-bold text-arc-primary">
                  {pos.token0Symbol[0]}
                </div>
                <div className="w-8 h-8 rounded-full bg-arc-success/20 border-2 border-[var(--card)] -ml-2 flex items-center justify-center text-xs font-bold text-arc-success">
                  {pos.token1Symbol[0]}
                </div>
              </div>
              <span className="font-bold text-[var(--text)]">{pos.token0Symbol} / {pos.token1Symbol}</span>
            </div>
            <span className="text-xs bg-arc-primary/10 text-arc-primary px-2.5 py-1 rounded-lg font-semibold">
              {pos.share.toFixed(2)}% share
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-[var(--bg)] rounded-xl px-3 py-2.5">
              <div className="text-xs text-[var(--muted)] mb-1">{pos.token0Symbol}</div>
              <div className="font-semibold text-[var(--text)]">{pos.token0Amount}</div>
            </div>
            <div className="bg-[var(--bg)] rounded-xl px-3 py-2.5">
              <div className="text-xs text-[var(--muted)] mb-1">{pos.token1Symbol}</div>
              <div className="font-semibold text-[var(--text)]">{pos.token1Amount}</div>
            </div>
            <div className="bg-[var(--bg)] rounded-xl px-3 py-2.5">
              <div className="text-xs text-[var(--muted)] mb-1">LP tokens</div>
              <div className="font-semibold text-[var(--text)]">{parseFloat(pos.lpBalance).toFixed(4)}</div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted)]">
            <span className="font-mono">{pos.poolAddress.slice(0, 10)}...{pos.poolAddress.slice(-8)}</span>
            <span className="text-arc-success">Earning 0.3% fees</span>
          </div>
        </div>
      ))}
    </div>
  );
}
