import { SwapPanel } from "@/components/SwapPanel";

export default function SwapPage() {
  return (
    <div className="flex flex-col items-center gap-6 pt-6">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-[var(--text)] mb-2">
          Swap <span className="text-arc-primary">any token</span>
        </h1>
        <p className="text-[var(--muted)] text-sm">Trade any ERC-20 on Arc Chain with 0.3% fees</p>
      </div>
      <SwapPanel />
    </div>
  );
}
