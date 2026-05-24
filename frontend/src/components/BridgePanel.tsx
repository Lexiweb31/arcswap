"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { AppKit, type BridgeStep } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { useMultiChainUSDCBalance } from "@/hooks/useMultiChainUSDCBalance";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useToast } from "./Toast";

const EXTERNAL_CHAINS = [
  { id: "Ethereum_Sepolia", label: "Ethereum Sepolia" },
  { id: "Avalanche_Fuji",   label: "Avalanche Fuji" },
  { id: "Base_Sepolia",     label: "Base Sepolia" },
  { id: "Polygon_Mumbai",   label: "Polygon Amoy" },
];

const ARC_USDC = "0x3600000000000000000000000000000000000000" as `0x${string}`;

export function BridgePanel() {
  const { address } = useAccount();
  const { toast } = useToast();
  const { balances, loading: balancesLoading } = useMultiChainUSDCBalance(address);
  const arcBalance = useTokenBalance(ARC_USDC, address, 6);

  const [direction, setDirection] = useState<"to_arc" | "from_arc">("to_arc");
  const [selectedChain, setSelectedChain] = useState(EXTERNAL_CHAINS[0]);
  const [amount, setAmount] = useState("");
  const [steps, setSteps] = useState<BridgeStep[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Reset state when direction changes
  function switchDirection(d: "to_arc" | "from_arc") {
    setDirection(d);
    setAmount("");
    setSteps([]);
    setStatus("idle");
    setErrorMsg("");
  }

  useEffect(() => {
    if (status === "done") toast("Bridge complete!", "success");
    if (status === "error" && errorMsg) toast(errorMsg, "error");
  }, [status]);

  async function handleBridge() {
    if (!address || !amount) return;
    const provider = (window as Window & { ethereum?: unknown }).ethereum;
    if (!provider) {
      setErrorMsg("No wallet found — install MetaMask or another browser wallet.");
      setStatus("error");
      return;
    }
    setStatus("running");
    setSteps([]);
    setErrorMsg("");

    try {
      const adapter = await createViemAdapterFromProvider({ provider });
      const kit = new AppKit();

      const fromChain = direction === "to_arc" ? selectedChain.id : "Arc_Testnet";
      const toChain   = direction === "to_arc" ? "Arc_Testnet" : selectedChain.id;

      const result = await kit.bridge({
        from: { adapter, chain: fromChain as never },
        to:   { adapter, chain: toChain as never },
        amount,
      });
      setSteps(result.steps ?? []);
      setStatus("done");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Bridge failed");
      setStatus("error");
    }
  }

  const stateIcon = (s: BridgeStep["state"]) => {
    if (s === "success") return <span className="text-arc-success">✓</span>;
    if (s === "error")   return <span className="text-red-400">✗</span>;
    if (s === "noop")    return <span className="text-[var(--muted)]">—</span>;
    return <span className="text-[var(--muted)] animate-pulse">○</span>;
  };

  const maxBalance = direction === "to_arc"
    ? (balances[selectedChain.id] ?? "0.00")
    : parseFloat(arcBalance.formatted).toFixed(2);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 w-full max-w-md mx-auto shadow-xl">
      <h2 className="text-lg font-bold text-[var(--text)] mb-1">Bridge USDC</h2>
      <p className="text-xs text-[var(--muted)] mb-5">
        Move USDC between Arc Testnet and other chains using Circle CCTP.
      </p>

      {/* Direction toggle */}
      <div className="flex gap-2 mb-5 bg-[var(--bg)] rounded-2xl p-1">
        <button
          onClick={() => switchDirection("to_arc")}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
            direction === "to_arc"
              ? "bg-arc-primary text-white shadow"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          → To Arc
        </button>
        <button
          onClick={() => switchDirection("from_arc")}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
            direction === "from_arc"
              ? "bg-arc-primary text-white shadow"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          ← From Arc
        </button>
      </div>

      {/* Route visual */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="flex-1 bg-[var(--bg)] rounded-xl px-3 py-2 text-sm">
          <div className="text-xs text-[var(--muted)] mb-0.5">From</div>
          <div className="font-semibold text-[var(--text)]">
            {direction === "to_arc" ? selectedChain.label : "Arc Testnet"}
          </div>
        </div>
        <svg className="w-5 h-5 text-arc-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <div className="flex-1 bg-[var(--bg)] rounded-xl px-3 py-2 text-sm">
          <div className="text-xs text-[var(--muted)] mb-0.5">To</div>
          <div className="font-semibold text-[var(--text)]">
            {direction === "to_arc" ? "Arc Testnet" : selectedChain.label}
          </div>
        </div>
      </div>

      {/* Chain selector */}
      <div className="mb-4">
        <label className="text-xs text-[var(--muted)] mb-1.5 block">
          {direction === "to_arc" ? "Source chain" : "Destination chain"}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {EXTERNAL_CHAINS.map(chain => (
            <button
              key={chain.id}
              onClick={() => setSelectedChain(chain)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border text-left ${
                selectedChain.id === chain.id
                  ? "border-arc-primary bg-arc-primary/10 text-arc-primary"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <div className="font-semibold">{chain.label}</div>
              {direction === "to_arc" && (
                <div className="text-xs mt-0.5 opacity-75">
                  {balancesLoading
                    ? <span className="animate-pulse">loading...</span>
                    : `${balances[chain.id] ?? "0.00"} USDC`
                  }
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Arc USDC balance (shown when bridging out of Arc) */}
      {direction === "from_arc" && address && (
        <div className="bg-[var(--bg)] rounded-xl px-4 py-3 mb-4 flex justify-between items-center text-sm">
          <span className="text-[var(--muted)]">Your Arc USDC balance</span>
          <span className="font-semibold text-[var(--text)]">
            {arcBalance.isLoading ? <span className="animate-pulse">loading...</span> : `${parseFloat(arcBalance.formatted).toFixed(2)} USDC`}
          </span>
        </div>
      )}

      {/* Amount */}
      <div className="bg-[var(--bg)] rounded-2xl p-4 mb-4">
        <div className="flex justify-between mb-2">
          <label className="text-xs text-[var(--muted)]">USDC amount</label>
          {address && maxBalance !== "0.00" && (
            <button onClick={() => setAmount(maxBalance)} className="text-xs text-arc-primary hover:underline">
              Max: {maxBalance}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            className="flex-1 bg-transparent text-2xl font-bold text-[var(--text)] outline-none placeholder-[var(--muted)]/40 min-w-0"
          />
          <span className="text-[var(--muted)] font-semibold">USDC</span>
        </div>
      </div>

      {/* Bridge details */}
      <div className="bg-[var(--bg)] rounded-xl px-4 py-3 mb-4 flex flex-col gap-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Bridge fee</span>
          <span className="text-arc-success">Free (CCTP)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Estimated time</span>
          <span className="text-[var(--text)]">~15–30 min</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">Protocol</span>
          <span className="text-[var(--text)]">Circle CCTP v2</span>
        </div>
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="bg-[var(--bg)] rounded-xl p-3 mb-4 flex flex-col gap-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {stateIcon(step.state)}
              <span className="text-[var(--text)] flex-1">{step.name}</span>
              {step.explorerUrl && (
                <a href={step.explorerUrl} target="_blank" rel="noreferrer" className="text-arc-primary text-xs hover:underline">
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-3 py-2 text-sm text-red-400 mb-4">
          {errorMsg}
        </div>
      )}

      {status === "done" && (
        <div className="bg-arc-success/10 border border-arc-success/30 rounded-xl px-3 py-2 text-sm text-arc-success mb-4">
          Bridge complete — USDC is on its way!
        </div>
      )}

      {!address ? (
        <div className="text-center text-[var(--muted)] text-sm py-3">Connect wallet to bridge</div>
      ) : (
        <button
          onClick={handleBridge}
          disabled={status === "running" || !amount}
          className="w-full bg-arc-primary hover:bg-arc-primaryHover disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors"
        >
          {status === "running"
            ? "Bridging..."
            : direction === "to_arc"
              ? `Bridge to Arc Testnet`
              : `Bridge to ${selectedChain.label}`
          }
        </button>
      )}
    </div>
  );
}
