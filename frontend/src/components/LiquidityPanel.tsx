"use client";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { TokenSelector } from "./TokenSelector";
import { SlippageSettings } from "./SlippageSettings";
import { Token, ROUTER_ADDRESS, FACTORY_ADDRESS } from "@/lib/contracts";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useApprove } from "@/hooks/useApprove";
import { routerAbi } from "@/abis/router";
import { factoryAbi } from "@/abis/factory";
import { useToast } from "./Toast";

const lpBalAbi = [{
  inputs: [{ name: "account", type: "address" }],
  name: "balanceOf",
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view",
  type: "function",
}] as const;

export function LiquidityPanel() {
  const { address } = useAccount();
  const { toast } = useToast();
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [tab, setTab] = useState<"add" | "remove">("add");
  const [removeAmount, setRemoveAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");

  const balA = useTokenBalance(tokenA?.address, address, tokenA?.decimals);
  const balB = useTokenBalance(tokenB?.address, address, tokenB?.decimals);

  const parsedA = amountA && tokenA ? parseUnits(amountA, tokenA.decimals) : 0n;
  const parsedB = amountB && tokenB ? parseUnits(amountB, tokenB.decimals) : 0n;

  const approveA = useApprove(tokenA?.address, address, parsedA);
  const approveB = useApprove(tokenB?.address, address, parsedB);

  const { data: poolAddress } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "getPool",
    args: tokenA && tokenB ? [tokenA.address, tokenB.address] : undefined,
    query: { enabled: !!tokenA && !!tokenB },
  });

  const poolExists = poolAddress && poolAddress !== "0x0000000000000000000000000000000000000000";

  const { data: lpBalance } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: lpBalAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!poolAddress && !!poolExists && !!address },
  });

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      toast(tab === "add" ? "Liquidity added successfully!" : "Liquidity removed successfully!", "success");
    }
  }, [isSuccess]);

  const slip = parseFloat(slippage) / 100;
  const minA = parsedA > 0n ? (parsedA * BigInt(Math.floor((1 - slip) * 10000))) / 10000n : 0n;
  const minB = parsedB > 0n ? (parsedB * BigInt(Math.floor((1 - slip) * 10000))) / 10000n : 0n;

  function handleAdd() {
    if (!tokenA || !tokenB || !address || !amountA || !amountB) return;
    writeContract({
      address: ROUTER_ADDRESS,
      abi: routerAbi,
      functionName: "addLiquidity",
      args: [
        tokenA.address,
        tokenB.address,
        parsedA,
        parsedB,
        minA,
        minB,
        address,
        BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
      ],
    });
  }

  function handleRemove() {
    if (!tokenA || !tokenB || !address || !removeAmount || !poolAddress) return;
    const liq = parseUnits(removeAmount, 18);
    writeContract({
      address: ROUTER_ADDRESS,
      abi: routerAbi,
      functionName: "removeLiquidity",
      args: [
        tokenA.address,
        tokenB.address,
        liq,
        0n,
        0n,
        address,
        BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
      ],
    });
  }

  const busy = isPending || isWaiting;
  const lpFormatted = lpBalance ? parseFloat(formatUnits(lpBalance, 18)).toFixed(6) : "0";

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 w-full max-w-md mx-auto shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2">
          {(["add", "remove"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); reset?.(); }}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
                tab === t ? "bg-arc-primary text-white" : "bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {t === "add" ? "Add" : "Remove"}
            </button>
          ))}
        </div>
        {tab === "add" && <SlippageSettings slippage={slippage} onChange={setSlippage} />}
      </div>

      {tab === "add" ? (
        <>
          {/* Token A */}
          <div className="bg-[var(--bg)] rounded-2xl p-4 mb-2">
            <div className="flex justify-between mb-2">
              <span className="text-xs text-[var(--muted)]">Token A</span>
              {address && tokenA && (
                <button onClick={() => setAmountA(balA.formatted)} className="text-xs text-arc-primary hover:underline">
                  Balance: {parseFloat(balA.formatted).toFixed(4)}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                value={amountA}
                onChange={e => { setAmountA(e.target.value.replace(/[^0-9.]/g, "")); reset?.(); }}
                placeholder="0.0"
                className="flex-1 bg-transparent text-2xl font-bold text-[var(--text)] outline-none placeholder-[var(--muted)]/40 min-w-0"
              />
              <TokenSelector selected={tokenA} onSelect={setTokenA} excluded={tokenB?.address} />
            </div>
          </div>

          <div className="flex justify-center my-1">
            <div className="bg-[var(--border)] rounded-xl p-2">
              <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
              </svg>
            </div>
          </div>

          {/* Token B */}
          <div className="bg-[var(--bg)] rounded-2xl p-4 mb-3">
            <div className="flex justify-between mb-2">
              <span className="text-xs text-[var(--muted)]">Token B</span>
              {address && tokenB && (
                <button onClick={() => setAmountB(balB.formatted)} className="text-xs text-arc-primary hover:underline">
                  Balance: {parseFloat(balB.formatted).toFixed(4)}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                value={amountB}
                onChange={e => { setAmountB(e.target.value.replace(/[^0-9.]/g, "")); reset?.(); }}
                placeholder="0.0"
                className="flex-1 bg-transparent text-2xl font-bold text-[var(--text)] outline-none placeholder-[var(--muted)]/40 min-w-0"
              />
              <TokenSelector selected={tokenB} onSelect={setTokenB} excluded={tokenA?.address} />
            </div>
          </div>

          {/* Min received preview */}
          {amountA && amountB && tokenA && tokenB && (
            <div className="bg-[var(--bg)] rounded-xl px-4 py-3 mb-4 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Min {tokenA.symbol} deposited</span>
                <span className="text-[var(--text)]">{formatUnits(minA, tokenA.decimals)} {tokenA.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Min {tokenB.symbol} deposited</span>
                <span className="text-[var(--text)]">{formatUnits(minB, tokenB.decimals)} {tokenB.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Slippage tolerance</span>
                <span className="text-[var(--text)]">{slippage}%</span>
              </div>
            </div>
          )}

          {!poolExists && tokenA && tokenB && (
            <div className="bg-arc-warning/10 border border-arc-warning/30 rounded-xl px-3 py-2 text-xs text-arc-warning mb-4">
              No pool exists yet — adding liquidity will create a new pool and set the initial price.
            </div>
          )}

          {!address ? (
            <div className="text-center text-[var(--muted)] text-sm py-3">Connect wallet</div>
          ) : approveA.needsApproval ? (
            <button onClick={approveA.approve} disabled={busy} className="w-full bg-arc-primary hover:bg-arc-primaryHover disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors">
              {approveA.isApproving ? "Approving..." : `Approve ${tokenA?.symbol}`}
            </button>
          ) : approveB.needsApproval ? (
            <button onClick={approveB.approve} disabled={busy} className="w-full bg-arc-primary hover:bg-arc-primaryHover disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors">
              {approveB.isApproving ? "Approving..." : `Approve ${tokenB?.symbol}`}
            </button>
          ) : (
            <button onClick={handleAdd} disabled={busy || !tokenA || !tokenB || !amountA || !amountB} className="w-full bg-arc-primary hover:bg-arc-primaryHover disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors">
              {isPending || isWaiting ? "Adding..." : isSuccess ? "✓ Added!" : poolExists ? "Add Liquidity" : "Create Pool & Add Liquidity"}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="text-xs text-[var(--muted)] mb-1 block">Token A</label>
              <TokenSelector selected={tokenA} onSelect={setTokenA} excluded={tokenB?.address} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[var(--muted)] mb-1 block">Token B</label>
              <TokenSelector selected={tokenB} onSelect={setTokenB} excluded={tokenA?.address} />
            </div>
          </div>

          {poolExists && address && (
            <div className="flex justify-between items-center text-xs mb-2 px-1">
              <span className="text-[var(--muted)]">Your LP balance</span>
              <button
                onClick={() => setRemoveAmount(lpFormatted)}
                className="text-arc-primary hover:underline font-medium"
              >
                {lpFormatted} LP
              </button>
            </div>
          )}

          <div className="bg-[var(--bg)] rounded-2xl p-4 mb-4">
            <label className="text-xs text-[var(--muted)] mb-2 block">LP tokens to remove</label>
            <input
              value={removeAmount}
              onChange={e => setRemoveAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.0"
              className="w-full bg-transparent text-2xl font-bold text-[var(--text)] outline-none placeholder-[var(--muted)]/40"
            />
          </div>

          <button
            onClick={handleRemove}
            disabled={busy || !tokenA || !tokenB || !removeAmount}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors"
          >
            {isPending || isWaiting ? "Removing..." : isSuccess ? "✓ Removed!" : "Remove Liquidity"}
          </button>
        </>
      )}
    </div>
  );
}
