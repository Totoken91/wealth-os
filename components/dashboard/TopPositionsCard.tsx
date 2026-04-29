"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import {
  calculateCurrentValueEUR,
  calculateUnrealizedPnL,
} from "@/lib/finance";
import { formatEuro, formatPct } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import type { Transaction } from "@/types";

export function TopPositionsCard() {
  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const rate = useWealthStore((s) => s.settings.currentEurUsdRate);

  const top = useMemo(() => {
    const txByHolding = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const arr = txByHolding.get(tx.holdingId);
      if (arr) arr.push(tx);
      else txByHolding.set(tx.holdingId, [tx]);
    }
    return holdings
      .map((h) => {
        const txs = txByHolding.get(h.id) ?? [];
        const value = calculateCurrentValueEUR(h, txs, rate);
        const pnl = calculateUnrealizedPnL(h, txs, rate);
        return { holding: h, value, pnlPct: pnl.pct };
      })
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [holdings, transactions, rate]);

  return (
    <Card header="Top positions">
      {top.length === 0 ? (
        <p className="text-[12.5px] text-blueberry-900/60">
          Aucune position valorisée.
        </p>
      ) : (
        <ul className="space-y-2">
          {top.map(({ holding, value, pnlPct }) => (
            <li
              key={holding.id}
              className="flex items-center gap-2 text-[12px] py-1 border-b border-dashed border-blueberry-700/15 last:border-none"
            >
              <Link
                href={`/positions/${holding.id}`}
                className="font-bold text-blueberry-900 hover:underline truncate"
              >
                {holding.ticker}
              </Link>
              <Pill flavor={holding.type}>{holding.type}</Pill>
              <span
                className={cn(
                  "num text-[10.5px] font-bold ml-auto whitespace-nowrap",
                  pnlPct > 0
                    ? "text-lime-700"
                    : pnlPct < 0
                      ? "text-strawberry-700"
                      : "text-blueberry-900/55",
                )}
              >
                {formatPct(pnlPct)}
              </span>
              <span className="num text-[11.5px] font-bold text-blueberry-900 whitespace-nowrap w-[80px] text-right">
                {formatEuro(value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
