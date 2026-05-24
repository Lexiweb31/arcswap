import { LiquidityPanel } from "@/components/LiquidityPanel";

export default function LiquidityPage() {
  return (
    <div className="flex flex-col items-center gap-6 pt-6">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-[var(--text)] mb-2">
          <span className="text-arc-primary">Provide</span> Liquidity
        </h1>
        <p className="text-[var(--muted)] text-sm">Add tokens to a pool and earn 0.3% on every swap</p>
      </div>
      <LiquidityPanel />
    </div>
  );
}
