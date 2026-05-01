"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { formatEuro, formatQuantity } from "@/lib/formatters";
import { useWealthStore } from "@/lib/store";
import type { Holding, Transaction } from "@/types";

function txEur(tx: Transaction): number {
  return tx.quantity * tx.pricePerUnit * (tx.exchangeRate ?? 1);
}

export function TransactionsTable() {
  const transactions = useWealthStore((s) => s.transactions);
  const holdings = useWealthStore((s) => s.holdings);
  const deleteTransaction = useWealthStore((s) => s.deleteTransaction);

  const holdingsById = useMemo(() => {
    const m = new Map<string, Holding>();
    for (const h of holdings) m.set(h.id, h);
    return m;
  }, [holdings]);

  const sorted = useMemo(
    () =>
      [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions],
  );

  const handleDelete = (tx: Transaction) => {
    deleteTransaction(tx.id);
    toast.success("Transaction supprimée");
  };

  if (sorted.length === 0) {
    return (
      <Card header="Transactions">
        <p className="text-[13px] text-blueberry-900/70">
          Aucune transaction enregistrée.
        </p>
      </Card>
    );
  }

  return (
    <Card header={`Transactions (${sorted.length})`}>
      {/* Mobile: card list */}
      <ul className="md:hidden space-y-2">
        {sorted.map((tx) => {
          const holding = holdingsById.get(tx.holdingId);
          const isBuy = tx.type === "buy";
          return (
            <li
              key={tx.id}
              className="rounded-[10px] border border-blueberry-700/15 bg-blueberry-100/15 px-3 py-2.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-blueberry-900 text-[13px]">
                    {holding?.ticker ?? "?"}
                  </span>
                  {holding && <Pill flavor={holding.type}>{holding.type}</Pill>}
                  <span
                    className={
                      isBuy
                        ? "text-[10.5px] font-bold uppercase tracking-wider text-lime-700"
                        : "text-[10.5px] font-bold uppercase tracking-wider text-strawberry-700"
                    }
                  >
                    {isBuy ? "Achat" : "Vente"}
                  </span>
                </div>
                <span className="num font-mono tabular-nums text-[10.5px] text-blueberry-900/65">
                  {tx.date}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-1.5">
                <span className="num font-mono tabular-nums text-[11.5px] text-blueberry-900/85">
                  {formatQuantity(
                    tx.quantity,
                    holding?.type === "crypto" ? 8 : 4,
                  )}{" "}
                  ×{" "}
                  {formatQuantity(tx.pricePerUnit, 4)}
                  {holding?.currency === "USD" ? " $" : " €"}
                  {tx.fees > 0 && (
                    <span className="text-blueberry-900/55">
                      {" "}
                      · frais {formatEuro(tx.fees)}
                    </span>
                  )}
                </span>
                <span className="num font-mono tabular-nums text-[13px] font-bold text-blueberry-900 whitespace-nowrap">
                  {formatEuro(txEur(tx))}
                </span>
              </div>
              <div className="mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDelete(tx)}
                  className="text-[10.5px] font-bold uppercase tracking-wider text-strawberry-700 hover:underline"
                >
                  Suppr
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto -mx-2">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-blueberry-700/30">
              <Th>Date</Th>
              <Th>Position</Th>
              <Th>Type</Th>
              <Th align="right">Qté</Th>
              <Th align="right">Prix</Th>
              <Th align="right">Frais</Th>
              <Th align="right">Total EUR</Th>
              <Th align="right">&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx, i) => {
              const holding = holdingsById.get(tx.holdingId);
              return (
                <tr
                  key={tx.id}
                  className={
                    i % 2 === 0
                      ? "bg-blueberry-100/15"
                      : "hover:bg-blueberry-200/15"
                  }
                >
                  <Td mono>{tx.date}</Td>
                  <Td>
                    <span className="font-bold text-blueberry-900 mr-2">
                      {holding?.ticker ?? "?"}
                    </span>
                    {holding ? <Pill flavor={holding.type}>{holding.type}</Pill> : null}
                  </Td>
                  <Td>
                    <span
                      className={
                        tx.type === "buy"
                          ? "font-bold text-lime-700"
                          : "font-bold text-strawberry-700"
                      }
                    >
                      {tx.type === "buy" ? "Achat" : "Vente"}
                    </span>
                  </Td>
                  <Td mono align="right">
                    {formatQuantity(
                      tx.quantity,
                      holding?.type === "crypto" ? 8 : 4,
                    )}
                  </Td>
                  <Td mono align="right">
                    {formatQuantity(tx.pricePerUnit, 4)}
                    {holding?.currency === "USD" ? " $" : " €"}
                  </Td>
                  <Td mono align="right">
                    {tx.fees ? formatEuro(tx.fees) : "—"}
                  </Td>
                  <Td mono align="right" className="font-bold">
                    {formatEuro(txEur(tx))}
                  </Td>
                  <Td align="right">
                    <button
                      type="button"
                      onClick={() => handleDelete(tx)}
                      className="text-[11px] font-bold uppercase tracking-wider text-strawberry-700 hover:underline"
                    >
                      Suppr
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className="
        px-2.5 py-2
        text-[10px] font-extrabold uppercase tracking-[0.06em]
        text-blueberry-800/75 [text-shadow:0_1px_0_rgba(255,255,255,0.7)]
        bg-gradient-to-b from-[rgba(220,235,250,0.6)] to-[rgba(195,215,235,0.6)]
      "
      style={{ textAlign: align ?? "left" }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  mono,
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={[
        "px-2.5 py-2 border-b border-blueberry-700/10 text-[#1a1a1a]",
        mono ? "font-mono tabular-nums text-[11px]" : "",
        className ?? "",
      ].join(" ")}
      style={{ textAlign: align ?? "left" }}
    >
      {children}
    </td>
  );
}
