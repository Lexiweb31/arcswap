"use client";
import { useState } from "react";

const PRESETS = ["0.1", "0.5", "1.0"];

interface Props {
  slippage: string;
  onChange: (v: string) => void;
}

export function SlippageSettings({ slippage, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const isHigh = parseFloat(slippage) > 1;
  const isLow  = parseFloat(slippage) < 0.05;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Slippage: {slippage}%
        {isHigh && <span className="text-arc-warning">⚠</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 w-64 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--text)]">Slippage tolerance</span>
            <button onClick={() => setOpen(false)} className="text-[var(--muted)] hover:text-[var(--text)]">✕</button>
          </div>

          <div className="flex gap-2 mb-3">
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => { onChange(p); setCustom(""); }}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  slippage === p && !custom
                    ? "bg-arc-primary text-white"
                    : "bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              value={custom}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9.]/g, "");
                setCustom(v);
                if (v) onChange(v);
              }}
              placeholder="Custom %"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] outline-none pr-8"
            />
            <span className="absolute right-3 top-2 text-sm text-[var(--muted)]">%</span>
          </div>

          {isHigh && <p className="text-xs text-arc-warning mt-2">⚠ High slippage — you may get a bad rate</p>}
          {isLow  && <p className="text-xs text-arc-primary mt-2">Low slippage — transaction may fail</p>}
        </div>
      )}
    </div>
  );
}
