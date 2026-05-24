import { PositionsPanel } from "@/components/PositionsPanel";

export default function PositionsPage() {
  return (
    <div className="flex flex-col items-center gap-6 pt-6">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-[var(--text)] mb-2">
          My <span className="text-arc-primary">Positions</span>
        </h1>
        <p className="text-[var(--muted)] text-sm">
          Your active liquidity positions and earned fees
        </p>
      </div>
      <PositionsPanel />
    </div>
  );
}
