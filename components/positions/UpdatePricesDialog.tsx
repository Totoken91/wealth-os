"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import {
  fetchCryptoPricesEUR,
  fetchEurUsdRate,
  fetchYahooPrice,
  resolveCoingeckoId,
  resolveYahooSymbol,
} from "@/lib/price-fetcher";
import { formatQuantity } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import type { Holding } from "@/types";

type RowKind = "loading" | "ok" | "error" | "skipped";

interface HoldingRow {
  holding: Holding;
  source: "crypto" | "yahoo";
  resolvedId: string | null;
  kind: RowKind;
  newPrice?: number;
  newCurrency?: "EUR" | "USD";
  message?: string;
  selected: boolean;
}

interface RateRow {
  oldRate?: number;
  newRate?: number;
  kind: RowKind;
  message?: string;
  selected: boolean;
}

interface Props {
  onClose: () => void;
}

function pctChange(oldVal: number, newVal: number): number {
  if (oldVal === 0) return 0;
  return ((newVal - oldVal) / oldVal) * 100;
}

export function UpdatePricesDialog({ onClose }: Props) {
  const holdings = useWealthStore((s) => s.holdings);
  const settingsRate = useWealthStore((s) => s.settings.currentEurUsdRate);
  const updateHolding = useWealthStore((s) => s.updateHolding);
  const updateSettings = useWealthStore((s) => s.updateSettings);

  const [rateRow, setRateRow] = useState<RateRow>({
    oldRate: settingsRate,
    kind: "loading",
    selected: true,
  });
  const [rows, setRows] = useState<HoldingRow[]>([]);

  // Build initial rows on mount and kick off all fetches in parallel.
  useEffect(() => {
    const initial: HoldingRow[] = holdings
      .filter((h) => h.type !== "cash")
      .map((h) => {
        if (h.type === "crypto") {
          const id = resolveCoingeckoId(h);
          return {
            holding: h,
            source: "crypto" as const,
            resolvedId: id,
            kind: id ? "loading" : "skipped",
            message: id
              ? undefined
              : "Pas de CoinGecko ID configuré — édite la position pour en saisir un.",
            selected: id !== null,
          };
        }
        const sym = resolveYahooSymbol(h);
        return {
          holding: h,
          source: "yahoo" as const,
          resolvedId: sym,
          kind: sym ? "loading" : "skipped",
          message: sym
            ? undefined
            : "Symbole Yahoo non configuré — édite la position pour en saisir un (ex: WPEA.PA).",
          selected: sym !== null,
        };
      });
    setRows(initial);

    const setRow = (
      holdingId: string,
      patch: Partial<HoldingRow>,
    ) =>
      setRows((prev) =>
        prev.map((r) =>
          r.holding.id === holdingId ? { ...r, ...patch } : r,
        ),
      );

    // EUR/USD rate
    fetchEurUsdRate()
      .then((rate) =>
        setRateRow((s) => ({ ...s, kind: "ok", newRate: rate })),
      )
      .catch((err) =>
        setRateRow((s) => ({
          ...s,
          kind: "error",
          selected: false,
          message: err instanceof Error ? err.message : "Erreur réseau",
        })),
      );

    // Crypto: batch all coin ids in 1 request
    const cryptoRows = initial.filter(
      (r) => r.source === "crypto" && r.resolvedId,
    );
    const cryptoIds = Array.from(
      new Set(cryptoRows.map((r) => r.resolvedId as string)),
    );
    if (cryptoIds.length > 0) {
      fetchCryptoPricesEUR(cryptoIds)
        .then((map) => {
          for (const r of cryptoRows) {
            const id = r.resolvedId as string;
            const price = map[id];
            if (typeof price === "number") {
              setRow(r.holding.id, {
                kind: "ok",
                newPrice: price,
                newCurrency: "EUR",
              });
            } else {
              setRow(r.holding.id, {
                kind: "error",
                selected: false,
                message: `CoinGecko ne renvoie pas de prix pour "${id}". Vérifie l'ID.`,
              });
            }
          }
        })
        .catch((err) => {
          for (const r of cryptoRows) {
            setRow(r.holding.id, {
              kind: "error",
              selected: false,
              message:
                err instanceof Error
                  ? `CoinGecko: ${err.message}`
                  : "Erreur CoinGecko",
            });
          }
        });
    }

    // Yahoo: 1 request per symbol
    const yahooRows = initial.filter(
      (r) => r.source === "yahoo" && r.resolvedId,
    );
    for (const r of yahooRows) {
      const symbol = r.resolvedId as string;
      fetchYahooPrice(symbol)
        .then((quote) => {
          if (!quote) {
            setRow(r.holding.id, {
              kind: "error",
              selected: false,
              message: `Yahoo ne renvoie rien pour "${symbol}". Vérifie le symbole.`,
            });
            return;
          }
          if (quote.currency !== r.holding.currency) {
            setRow(r.holding.id, {
              kind: "error",
              selected: false,
              message: `Yahoo renvoie en ${quote.currency}, holding en ${r.holding.currency}. Corrige le yahooSymbol ou la devise.`,
              newPrice: quote.price,
              newCurrency: quote.currency,
            });
            return;
          }
          setRow(r.holding.id, {
            kind: "ok",
            newPrice: quote.price,
            newCurrency: quote.currency,
          });
        })
        .catch((err) => {
          setRow(r.holding.id, {
            kind: "error",
            selected: false,
            message:
              err instanceof Error
                ? `Yahoo: ${err.message}`
                : "Erreur Yahoo (CORS?)",
          });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  const okRows = useMemo(
    () => rows.filter((r) => r.kind === "ok"),
    [rows],
  );
  const selectedCount =
    rows.filter((r) => r.kind === "ok" && r.selected).length +
    (rateRow.kind === "ok" && rateRow.selected ? 1 : 0);

  const toggleRow = (id: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.holding.id === id && r.kind === "ok"
          ? { ...r, selected: !r.selected }
          : r,
      ),
    );

  const selectAll = () => {
    setRows((prev) =>
      prev.map((r) =>
        r.kind === "ok" ? { ...r, selected: true } : r,
      ),
    );
    if (rateRow.kind === "ok") setRateRow((s) => ({ ...s, selected: true }));
  };

  const deselectAll = () => {
    setRows((prev) =>
      prev.map((r) => (r.kind === "ok" ? { ...r, selected: false } : r)),
    );
    setRateRow((s) => ({ ...s, selected: false }));
  };

  const apply = () => {
    let appliedCount = 0;
    if (rateRow.kind === "ok" && rateRow.selected && rateRow.newRate) {
      updateSettings({ currentEurUsdRate: rateRow.newRate });
      appliedCount += 1;
    }
    const now = new Date().toISOString();
    for (const r of rows) {
      if (r.kind !== "ok" || !r.selected || r.newPrice === undefined) continue;
      updateHolding(r.holding.id, {
        currentPrice: r.newPrice,
        currentPriceUpdatedAt: now,
      });
      appliedCount += 1;
    }
    toast.success(
      `${appliedCount} mise${appliedCount > 1 ? "s" : ""} à jour appliquée${appliedCount > 1 ? "s" : ""}`,
    );
    onClose();
  };

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
            ◆ Mise à jour des prix
          </div>
          <div className="text-[11.5px] text-blueberry-900/65 mt-0.5">
            CoinGecko (crypto) · Yahoo Finance (ETF/actions) · Frankfurter
            (EUR/USD)
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="text-[18px] font-bold text-blueberry-900/50 hover:text-blueberry-900 leading-none px-2"
        >
          ×
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Button variant="neutral" onClick={selectAll}>
          Tout sélectionner
        </Button>
        <Button variant="neutral" onClick={deselectAll}>
          Tout désélectionner
        </Button>
        <span className="text-[11.5px] text-blueberry-900/60 ml-2">
          {selectedCount} ligne{selectedCount > 1 ? "s" : ""} cochée
          {selectedCount > 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-blueberry-700/30">
              <Th>&nbsp;</Th>
              <Th>Position</Th>
              <Th>Source</Th>
              <Th align="right">Ancien</Th>
              <Th align="right">Nouveau</Th>
              <Th align="right">Δ</Th>
            </tr>
          </thead>
          <tbody>
            <RateLine row={rateRow} onToggle={() => setRateRow((s) => ({ ...s, selected: !s.selected }))} />
            {rows.map((r, i) => (
              <HoldingLine
                key={r.holding.id}
                row={r}
                idx={i + 1}
                onToggle={() => toggleRow(r.holding.id)}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-2.5 py-6 text-center text-[12px] text-blueberry-900/60"
                >
                  Aucune position fetchable. Crée des holdings ETF / Crypto / Stock pour activer la mise à jour automatique.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="neutral" onClick={onClose}>
          Annuler
        </Button>
        <Button
          variant="lime"
          onClick={apply}
          disabled={selectedCount === 0 || (rateRow.kind === "loading" && okRows.length === 0)}
        >
          Appliquer ({selectedCount})
        </Button>
      </div>
    </Card>
  );
}

function RateLine({
  row,
  onToggle,
}: {
  row: RateRow;
  onToggle: () => void;
}) {
  const delta =
    row.oldRate && row.newRate ? pctChange(row.oldRate, row.newRate) : 0;
  return (
    <tr className="bg-blueberry-100/15">
      <Td>
        <input
          type="checkbox"
          checked={row.kind === "ok" && row.selected}
          onChange={onToggle}
          disabled={row.kind !== "ok"}
        />
      </Td>
      <Td>
        <span className="font-bold text-blueberry-900">EUR/USD</span>
        <span className="text-[10.5px] text-blueberry-900/55 ml-2">
          (taux Frankfurter)
        </span>
      </Td>
      <Td>
        <span className="text-[10.5px] uppercase tracking-wider font-bold text-bondi-700">
          Forex
        </span>
      </Td>
      <Td mono align="right">
        {row.oldRate ? formatQuantity(row.oldRate, 4) : "—"}
      </Td>
      <Td mono align="right">
        {row.kind === "loading"
          ? "…"
          : row.kind === "error"
            ? <span className="text-strawberry-700">Erreur</span>
            : row.newRate
              ? formatQuantity(row.newRate, 4)
              : "—"}
      </Td>
      <Td mono align="right">
        {row.kind === "ok" && row.oldRate && row.newRate ? (
          <DeltaPct value={delta} />
        ) : row.kind === "error" ? (
          <span className="text-strawberry-700 text-[10.5px]">{row.message}</span>
        ) : (
          "—"
        )}
      </Td>
    </tr>
  );
}

function HoldingLine({
  row,
  idx,
  onToggle,
}: {
  row: HoldingRow;
  idx: number;
  onToggle: () => void;
}) {
  const { holding } = row;
  const old = holding.currentPrice;
  const newPrice = row.newPrice;
  const delta =
    typeof newPrice === "number" ? pctChange(old, newPrice) : 0;
  return (
    <tr className={idx % 2 === 0 ? "bg-blueberry-100/15" : ""}>
      <Td>
        <input
          type="checkbox"
          checked={row.kind === "ok" && row.selected}
          onChange={onToggle}
          disabled={row.kind !== "ok"}
        />
      </Td>
      <Td>
        <span className="font-bold text-blueberry-900 mr-2">
          {holding.ticker}
        </span>
        <Pill flavor={holding.type}>{holding.type}</Pill>
      </Td>
      <Td>
        <span
          className={cn(
            "text-[10.5px] uppercase tracking-wider font-bold",
            row.source === "crypto" ? "text-grape-700" : "text-blueberry-700",
          )}
        >
          {row.source === "crypto" ? "CoinGecko" : "Yahoo"}
        </span>
        {row.resolvedId && (
          <span className="text-[10.5px] text-blueberry-900/45 ml-1.5">
            {row.resolvedId}
          </span>
        )}
      </Td>
      <Td mono align="right">
        {formatQuantity(old, 4)}{" "}
        {holding.currency === "USD" ? "$" : "€"}
      </Td>
      <Td mono align="right">
        {row.kind === "loading" ? (
          <span className="text-blueberry-900/55">…</span>
        ) : row.kind === "skipped" ? (
          <Link
            href={`/positions/${holding.id}`}
            className="text-[10.5px] text-blueberry-700 underline-offset-4 hover:underline"
          >
            Configurer
          </Link>
        ) : row.kind === "error" ? (
          <span className="text-strawberry-700 text-[10.5px]">
            {row.newPrice !== undefined
              ? `${formatQuantity(row.newPrice, 4)} ${row.newCurrency === "USD" ? "$" : "€"}`
              : "Erreur"}
          </span>
        ) : typeof newPrice === "number" ? (
          <span>
            {formatQuantity(newPrice, 4)}{" "}
            {row.newCurrency === "USD" ? "$" : "€"}
          </span>
        ) : (
          "—"
        )}
      </Td>
      <Td mono align="right">
        {row.kind === "ok" && typeof newPrice === "number" ? (
          <DeltaPct value={delta} />
        ) : row.kind === "error" || row.kind === "skipped" ? (
          <span className="text-[10.5px] text-blueberry-900/55">
            {row.message}
          </span>
        ) : (
          "—"
        )}
      </Td>
    </tr>
  );
}

function DeltaPct({ value }: { value: number }) {
  const tone =
    value > 0
      ? "text-lime-700"
      : value < 0
        ? "text-strawberry-700"
        : "text-blueberry-900/60";
  return (
    <span className={cn("font-bold", tone)}>
      {value >= 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
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
        px-2.5 py-2 whitespace-nowrap
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
      className={cn(
        "px-2.5 py-2 border-b border-blueberry-700/10 align-middle",
        mono && "font-mono tabular-nums text-[11px]",
      )}
      style={{ textAlign: align ?? "left" }}
    >
      {children}
    </td>
  );
}
