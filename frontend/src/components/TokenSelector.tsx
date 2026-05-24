"use client";
import { useState } from "react";
import { Token, KNOWN_TOKENS } from "@/lib/contracts";
import { isAddress } from "viem";
import { useReadContracts } from "wagmi";
import { erc20Abi } from "@/abis/erc20";

interface Props {
  selected: Token | null;
  onSelect: (token: Token) => void;
  excluded?: `0x${string}`;
}

export function TokenSelector({ selected, onSelect, excluded }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const isCustomAddr = isAddress(query) && !KNOWN_TOKENS.find(t => t.address.toLowerCase() === query.toLowerCase());

  const { data: customData } = useReadContracts({
    contracts: isCustomAddr
      ? [
          { address: query as `0x${string}`, abi: erc20Abi, functionName: "symbol" },
          { address: query as `0x${string}`, abi: erc20Abi, functionName: "name" },
          { address: query as `0x${string}`, abi: erc20Abi, functionName: "decimals" },
        ]
      : [],
    query: { enabled: isCustomAddr },
  });

  const customToken: Token | null = isCustomAddr && customData?.[0]?.result
    ? {
        address: query as `0x${string}`,
        symbol: customData[0].result as string,
        name: customData[1]?.result as string,
        decimals: customData[2]?.result as number ?? 18,
      }
    : null;

  const filtered = KNOWN_TOKENS.filter(t =>
    t.address.toLowerCase() !== excluded?.toLowerCase() &&
    (t.symbol.toLowerCase().includes(query.toLowerCase()) || t.name.toLowerCase().includes(query.toLowerCase()))
  );

  function handleSelect(token: Token) {
    onSelect(token);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-[var(--border)] hover:bg-arc-primary/20 text-[var(--text)] font-semibold px-3 py-2 rounded-xl transition-colors min-w-[120px]"
      >
        {selected ? (
          <>
            <span className="text-sm">{selected.symbol}</span>
            <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        ) : (
          <>
            <span className="text-sm text-[var(--muted)]">Select token</span>
            <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-3">
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name or paste address"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] outline-none mb-2"
          />
          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {filtered.map(token => (
              <button
                key={token.address}
                onClick={() => handleSelect(token)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--border)] transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-arc-primary/20 flex items-center justify-center text-xs font-bold text-arc-primary">
                  {token.symbol[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">{token.symbol}</div>
                  <div className="text-xs text-[var(--muted)]">{token.name}</div>
                </div>
              </button>
            ))}
            {customToken && (
              <button
                onClick={() => handleSelect(customToken)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--border)] transition-colors text-left border border-arc-primary/30"
              >
                <div className="w-8 h-8 rounded-full bg-arc-primary/20 flex items-center justify-center text-xs font-bold text-arc-primary">
                  {customToken.symbol[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">{customToken.symbol}</div>
                  <div className="text-xs text-[var(--muted)] truncate w-40">{query}</div>
                </div>
              </button>
            )}
            {filtered.length === 0 && !customToken && (
              <div className="text-center text-[var(--muted)] text-sm py-4">
                {isAddress(query) ? "Loading token info..." : "No tokens found"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
