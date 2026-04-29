"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { formatEuro, formatQuantity } from "@/lib/formatters";
import { useWealthStore } from "@/lib/store";
import type { Holding } from "@/types";

export function RecentActivityCard() {
  const transactions = useWealthStore((s) => s.transactions);
  const holdings = useWealthStore((s) => s.holdings);

  const holdingsById = useMemo(() => {
    const m = new Map<string, Holding>();
    for (const h of holdings) m.set(h.id, h);
    return m;
  }, [holdings]);

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [transactions],
  );

  return (
    <Card header="Activité récente">
      {recent.length === 0 ? (
        <p className="text-[12.5px] text-blueberry-900/60">
          Aucune transaction.{" "}
          <Link
            href="/dca"
            className="font-semibold text-blueberry-700 underline-offset-4 hover:underline"
          >
            En saisir une
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-2">
          {recent.map((tx) => {
            const holding = holdingsById.get(tx.holdingId);
            const totalEur =
              tx.quantity * tx.pricePerUnit * (tx.exchangeRate ?? 1);
            return (
              <li
                key={tx.id}
                className="flex items-center gap-2 text-[12px] py-1 border-b border-dashed border-blueberry-700/15 last:border-none"
              >
                <span className="num text-[10.5px] text-blueberry-900/55 w-[68px] shrink-0">
                  {tx.date}
                </span>
                <span
                  className={
                    tx.type === "buy"
                      ? "text-[10.5px] font-extrabold uppercase text-lime-700 w-[42px] shrink-0"
                      : "text-[10.5px] font-extrabold uppercase text-strawberry-700 w-[42px] shrink-0"
                  }
                >
                  {tx.type === "buy" ? "Achat" : "Vente"}
                </span>
                <span className="font-bold text-blueberry-900 truncate">
                  {holding?.ticker ?? "?"}
                </span>
                {holding ? <Pill flavor={holding.type}>{holding.type}</Pill> : null}
                <span className="num text-[10.5px] text-blueberry-900/65 ml-auto whitespace-nowrap">
                  {formatQuantity(
                    tx.quantity,
                    holding?.type === "crypto" ? 6 : 4,
                  )}
                </span>
                <span className="num text-[11.5px] font-bold text-blueberry-900 whitespace-nowrap">
                  {formatEuro(totalEur)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
