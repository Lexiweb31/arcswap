import { BridgePanel } from "@/components/BridgePanel";

export default function BridgePage() {
  return (
    <div className="flex flex-col items-center gap-6 pt-6">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-[var(--text)] mb-2">
          <span className="text-arc-primary">Bridge</span> to Arc
        </h1>
        <p className="text-[var(--muted)] text-sm">
          Move USDC between Arc Testnet and Ethereum, Base, Avalanche, or Polygon
        </p>
      </div>
      <BridgePanel />
    </div>
  );
}
