"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import {
  calculateAveragePurchasePrice,
  calculateCapitalInvestedEUR,
  calculateCurrentQuantity,
  calculateCurrentValueEUR,
  calculateRealizedPnL,
  calculateUnrealizedPnL,
} from "@/lib/finance";
import { formatEuro, formatPct, formatQuantity } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";

interface Props {
  id: string;
}

export function PositionDetail({ id }: Props) {
  const hydrated = useHydrated();
  const holding = useWealthStore((s) => s.holdings.find((h) => h.id === id));
  const transactions = useWealthStore((s) => s.transactions);
  const rate = useWealthStore((s) => s.settings.currentEurUsdRate);

  const txs = useMemo(
    () =>
      transactions
        .filter((t) => t.holdingId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, id],
  );

  if (!hydrated) {
    return <div className="text-blueberry-900/60 text-sm">Chargement…</div>;
  }

  if (!holding) {
    return (
      <Card header="Position introuvable">
        <p className="text-[13px] text-blueberry-900/70">
          Cette position n&apos;existe pas (ou plus).{" "}
          <Link
            href="/positions"
            className="font-semibold text-blueberry-700 underline-offset-4 hover:underline"
          >
            ← Retour à la liste
          </Link>
        </p>
      </Card>
    );
  }

  const qty = calculateCurrentQuantity(txs);
  const pru = calculateAveragePurchasePrice(txs);
  const capital = calculateCapitalInvestedEUR(txs);
  const value = calculateCurrentValueEUR(holding, txs, rate);
  const pnl = calculateUnrealizedPnL(holding, txs, rate);
  const realized = calculateRealizedPnL(txs);

  return (
    <div>
      <Link
        href="/positions"
        className="text-[12px] font-semibold text-blueberry-700 underline-offset-4 hover:underline"
      >
        ← Retour aux positions
      </Link>

      <div className="mt-3 mb-4 flex items-baseline gap-3">
        <h2 className="font-sans text-3xl font-extralight tracking-tight text-blueberry-900">
          {holding.ticker}
        </h2>
        <Pill flavor={holding.type}>{holding.type}</Pill>
        <span className="text-[12px] text-blueberry-900/60">
          {holding.currency}
        </span>
      </div>
      <div className="mb-5 text-[13px] text-blueberry-900/70">{holding.name}</div>

      <Card header="Synthèse">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          <Stat label="Quantité" value={formatQuantity(qty, holding.type === "crypto" ? 8 : 4)} />
          <Stat label="PRU (EUR)" value={formatEuro(pru, 4)} />
          <Stat
            label={`Prix actuel (${holding.currency})`}
            value={formatQuantity(holding.currentPrice, 4)}
          />
          <Stat label="Valeur (EUR)" value={formatEuro(value)} bold />
          <Stat
            label="P&L latent"
            value={`${pnl.eur >= 0 ? "+" : ""}${formatEuro(pnl.eur)} (${formatPct(pnl.pct)})`}
            tone={pnl.eur > 0 ? "pos" : pnl.eur < 0 ? "neg" : "neutral"}
          />
          <Stat
            label="P&L réalisé"
            value={`${realized >= 0 ? "+" : ""}${formatEuro(realized)}`}
            tone={realized > 0 ? "pos" : realized < 0 ? "neg" : "neutral"}
          />
          <Stat label="Capital investi" value={formatEuro(capital)} />
        </dl>
      </Card>

      <Card header={`Transactions (${txs.length})`}>
        {txs.length === 0 ? (
          <p className="text-[13px] text-blueberry-900/70">
            Aucune transaction sur cette position.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-blueberry-700/30">
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th align="right">Qté</Th>
                  <Th align="right">Prix</Th>
                  <Th align="right">Taux EUR/USD</Th>
                  <Th align="right">Frais</Th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx, i) => (
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
                      {formatQuantity(tx.quantity, holding.type === "crypto" ? 8 : 4)}
                    </Td>
                    <Td mono align="right">
                      {formatQuantity(tx.pricePerUnit, 4)}
                      {holding.currency === "USD" ? " $" : " €"}
                    </Td>
                    <Td mono align="right">
                      {tx.exchangeRate ? formatQuantity(tx.exchangeRate, 4) : "—"}
                    </Td>
                    <Td mono align="right">
                      {tx.fees ? formatEuro(tx.fees) : "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: "pos" | "neg" | "neutral";
}) {
  const toneClass =
    tone === "pos"
      ? "text-lime-700"
      : tone === "neg"
        ? "text-strawberry-700"
        : "text-blueberry-900";
  return (
    <div>
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/70">
        {label}
      </dt>
      <dd
        className={cn(
          "num mt-0.5",
          bold ? "text-[18px] font-bold" : "text-[14px]",
          toneClass,
        )}
      >
        {value}
      </dd>
    </div>
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
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      className={[
        "px-2.5 py-2 border-b border-blueberry-700/10 text-[#1a1a1a]",
        mono ? "font-mono tabular-nums text-[11px]" : "",
      ].join(" ")}
      style={{ textAlign: align ?? "left" }}
    >
      {children}
    </td>
  );
}
