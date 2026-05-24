"use client";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { TokenSelector } from "./TokenSelector";
import { SlippageSettings } from "./SlippageSettings";
import { Token, ROUTER_ADDRESS, FACTORY_ADDRESS } from "@/lib/contracts";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useApprove } from "@/hooks/useApprove";
import { routerAbi } from "@/abis/router";
import { factoryAbi } from "@/abis/factory";
import { useToast } from "./Toast";

const poolAbi = [{
  inputs: [],
  name: "getReserves",
  outputs: [
    { name: "reserve0", type: "uint112" },
    { name: "reserve1", type: "uint112" },
    { name: "blockTimestampLast", type: "uint32" },
  ],
  stateMutability: "view",
  type: "function",
}] as const;

function calcPriceImpact(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): number {
  if (reserveIn === 0n || reserveOut === 0n) return 0;
  const amountInWithFee = amountIn * 997n;
  const amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000n + amountInWithFee);
  const midPrice = (reserveOut * amountIn) / reserveIn;
  if (midPrice === 0n) return 0;
  const impact = Number((midPrice - amountOut) * 10000n / midPrice) / 100;
  return Math.max(0, impact);
}

export function SwapPanel() {
  const { address } = useAccount();
  const { toast } = useToast();
  const [tokenIn, setTokenIn] = useState<Token | null>(null);
  const [tokenOut, setTokenOut] = useState<Token | null>(null);
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState("0.5");

  const path = tokenIn && tokenOut ? [tokenIn.address, tokenOut.address] : [];

  const { amountOut, amountOutFormatted, isLoading: quoteLoading } = useSwapQuote(
    amountIn, path as `0x${string}`[], tokenIn?.decimals ?? 18, tokenOut?.decimals ?? 18
  );

  const balanceIn  = useTokenBalance(tokenIn?.address,  address, tokenIn?.decimals);
  const balanceOut = useTokenBalance(tokenOut?.address, address, tokenOut?.decimals);

  // Pool reserves for price impact
  const { data: poolAddr } = useReadContract({
    address: FACTORY_ADDRESS, abi: factoryAbi, functionName: "getPool",
    args: tokenIn && tokenOut ? [tokenIn.address, tokenOut.address] : undefined,
    query: { enabled: !!tokenIn && !!tokenOut },
  });
  const { data: reserves } = useReadContract({
    address: poolAddr as `0x${string}`, abi: poolAbi, functionName: "getReserves",
    query: { enabled: !!poolAddr && poolAddr !== "0x0000000000000000000000000000000000000000" },
  });

  const priceImpact = (() => {
    if (!reserves || !amountIn || !tokenIn || !tokenOut) return 0;
    const parsedIn = parseUnits(amountIn, tokenIn.decimals);
    const [r0, r1] = reserves;
    const [rIn, rOut] = tokenIn.address < tokenOut.address ? [r0, r1] : [r1, r0];
    return calcPriceImpact(parsedIn, BigInt(rIn), BigInt(rOut));
  })();

  const minReceived = (() => {
    if (!amountOut || !tokenOut) return "";
    const slip = parseFloat(slippage) / 100;
    const min = Number(formatUnits(amountOut, tokenOut.decimals)) * (1 - slip);
    return min.toFixed(6);
  })();

  const parsedIn = amountIn && tokenIn ? parseUnits(amountIn, tokenIn.decimals) : 0n;
  const { needsApproval, approve, isApproving } = useApprove(tokenIn?.address, address, parsedIn);

  const { writeContract, data: swapTxHash, isPending: isSwapping, reset } = useWriteContract();
  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({
    hash: swapTxHash,
    query: { enabled: !!swapTxHash },
  });

  useEffect(() => {
    if (isSuccess) toast(`Swapped ${amountIn} ${tokenIn?.symbol} → ${amountOutFormatted} ${tokenOut?.symbol}`, "success");
  }, [isSuccess]);

  function handleSwap() {
    if (!tokenIn || !tokenOut || !address || !amountIn || !amountOut) return;
    const slip = parseFloat(slippage) / 100;
    const minOut = (amountOut * BigInt(Math.floor((1 - slip) * 10000))) / 10000n;
    writeContract({
      address: ROUTER_ADDRESS, abi: routerAbi,
      functionName: "swapExactTokensForTokens",
      args: [
        parseUnits(amountIn, tokenIn.decimals),
        minOut,
        [tokenIn.address, tokenOut.address],
        address,
        BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
      ],
    });
  }

  function flipTokens() {
    setTokenIn(tokenOut); setTokenOut(tokenIn); setAmountIn(amountOutFormatted);
  }

  const impactColor = priceImpact > 5 ? "text-red-400" : priceImpact > 2 ? "text-arc-warning" : "text-arc-success";
  const busy = isApproving || isSwapping || isWaiting;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-5 w-full max-w-md mx-auto shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--text)]">Swap</h2>
        <SlippageSettings slippage={slippage} onChange={setSlippage} />
      </div>

      {/* Input */}
      <div className="bg-[var(--bg)] rounded-2xl p-4 mb-1">
        <div className="flex justify-between mb-2">
          <span className="text-xs text-[var(--muted)]">You pay</span>
          {address && tokenIn && (
            <button onClick={() => setAmountIn(balanceIn.formatted)} className="text-xs text-arc-primary hover:underline">
              Balance: {parseFloat(balanceIn.formatted).toFixed(4)}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            value={amountIn}
            onChange={e => { setAmountIn(e.target.value.replace(/[^0-9.]/g, "")); reset?.(); }}
            placeholder="0.0"
            className="flex-1 bg-transparent text-2xl font-bold text-[var(--text)] outline-none placeholder-[var(--muted)]/40 min-w-0"
          />
          <TokenSelector selected={tokenIn} onSelect={setTokenIn} excluded={tokenOut?.address} />
        </div>
      </div>

      {/* Flip */}
      <div className="flex justify-center my-1">
        <button onClick={flipTokens} className="bg-[var(--border)] hover:bg-arc-primary/20 rounded-xl p-2 transition-colors">
          <svg className="w-5 h-5 text-[var(--text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* Output */}
      <div className="bg-[var(--bg)] rounded-2xl p-4 mb-3">
        <div className="flex justify-between mb-2">
          <span className="text-xs text-[var(--muted)]">You receive</span>
          {address && tokenOut && (
            <span className="text-xs text-[var(--muted)]">Balance: {parseFloat(balanceOut.formatted).toFixed(4)}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-2xl font-bold min-w-0">
            {quoteLoading
              ? <span className="text-[var(--muted)] text-base animate-pulse">Fetching quote...</span>
              : <span className={amountOutFormatted ? "text-arc-success" : "text-[var(--muted)]/40"}>{amountOutFormatted || "0.0"}</span>
            }
          </div>
          <TokenSelector selected={tokenOut} onSelect={setTokenOut} excluded={tokenIn?.address} />
        </div>
      </div>

      {/* Details */}
      {amountOutFormatted && (
        <div className="bg-[var(--bg)] rounded-xl px-4 py-3 mb-4 flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Rate</span>
            <span className="text-[var(--text)]">1 {tokenIn?.symbol} ≈ {(parseFloat(amountOutFormatted) / parseFloat(amountIn || "1")).toFixed(6)} {tokenOut?.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Price impact</span>
            <span className={impactColor}>{priceImpact.toFixed(2)}%{priceImpact > 5 ? " ⚠" : ""}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Min received ({slippage}% slippage)</span>
            <span className="text-[var(--text)]">{minReceived} {tokenOut?.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Fee</span>
            <span className="text-[var(--text)]">0.3%</span>
          </div>
        </div>
      )}

      {priceImpact > 5 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-red-400 mb-3">
          ⚠ High price impact ({priceImpact.toFixed(1)}%) — consider a smaller trade
        </div>
      )}

      {!address
        ? <div className="text-center text-[var(--muted)] text-sm py-3">Connect wallet to swap</div>
        : needsApproval
          ? <button onClick={approve} disabled={busy} className="w-full bg-arc-primary hover:bg-arc-primaryHover disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors">
              {isApproving ? "Approving..." : `Approve ${tokenIn?.symbol}`}
            </button>
          : <button onClick={handleSwap} disabled={busy || !tokenIn || !tokenOut || !amountIn || !amountOutFormatted} className="w-full bg-arc-primary hover:bg-arc-primaryHover disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors">
              {isSwapping || isWaiting ? "Swapping..." : isSuccess ? "✓ Swapped!" : "Swap"}
            </button>
      }
    </div>
  );
}
