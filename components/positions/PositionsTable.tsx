"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryFilters } from "@/components/positions/CategoryFilters";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import {
  calculateAveragePurchasePrice,
  calculateCurrentQuantity,
  calculateCurrentValueEUR,
  calculateUnrealizedPnL,
} from "@/lib/finance";
import { formatEuro, formatPct, formatQuantity } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import type { Holding, HoldingType, Transaction } from "@/types";

interface Row {
  id: string;
  ticker: string;
  name: string;
  type: HoldingType;
  currency: "EUR" | "USD";
  quantity: number;
  pruEur: number;
  currentPriceEur: number;
  valueEur: number;
  pnlEur: number;
  pnlPct: number;
}

function buildRows(
  holdings: Holding[],
  transactions: Transaction[],
  rate?: number,
): Row[] {
  const txByHolding = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const arr = txByHolding.get(tx.holdingId);
    if (arr) arr.push(tx);
    else txByHolding.set(tx.holdingId, [tx]);
  }
  return holdings.map((h) => {
    const txs = txByHolding.get(h.id) ?? [];
    const qty = calculateCurrentQuantity(txs);
    const pru = calculateAveragePurchasePrice(txs);
    const value = calculateCurrentValueEUR(h, txs, rate);
    const pnl = calculateUnrealizedPnL(h, txs, rate);
    const liveEurPrice =
      h.currentPrice * (h.currency === "USD" ? rate ?? 1 : 1);
    return {
      id: h.id,
      ticker: h.ticker,
      name: h.name,
      type: h.type,
      currency: h.currency,
      quantity: qty,
      pruEur: pru,
      currentPriceEur: liveEurPrice,
      valueEur: value,
      pnlEur: pnl.eur,
      pnlPct: pnl.pct,
    };
  });
}

export function PositionsTable() {
  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const rate = useWealthStore((s) => s.settings.currentEurUsdRate);

  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<HoldingType>>(
    new Set(),
  );
  const [sorting, setSorting] = useState<SortingState>([
    { id: "valueEur", desc: true },
  ]);

  const data = useMemo(() => {
    let rows = buildRows(holdings, transactions, rate);
    if (selectedTypes.size > 0) {
      rows = rows.filter((r) => selectedTypes.has(r.type));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.ticker.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [holdings, transactions, rate, search, selectedTypes]);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: "ticker",
        header: "Ticker",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Link
              href={`/positions/${row.original.id}`}
              className="font-bold text-blueberry-900 hover:underline"
            >
              {row.original.ticker}
            </Link>
            <Pill flavor={row.original.type}>{row.original.type}</Pill>
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "Nom",
        cell: ({ row }) => (
          <span className="text-[12px] text-blueberry-900/80">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: "quantity",
        header: () => <span className="block text-right">Qté</span>,
        cell: ({ row }) => (
          <span className="block text-right num">
            {formatQuantity(
              row.original.quantity,
              row.original.type === "crypto" ? 8 : 4,
            )}
          </span>
        ),
      },
      {
        accessorKey: "pruEur",
        header: () => <span className="block text-right">PRU €</span>,
        cell: ({ row }) => (
          <span className="block text-right num">
            {formatEuro(row.original.pruEur, 4)}
          </span>
        ),
      },
      {
        accessorKey: "currentPriceEur",
        header: () => <span className="block text-right">Prix actuel €</span>,
        cell: ({ row }) => (
          <span className="block text-right num">
            {formatEuro(row.original.currentPriceEur, 4)}
          </span>
        ),
      },
      {
        accessorKey: "valueEur",
        header: () => <span className="block text-right">Valeur</span>,
        cell: ({ row }) => (
          <span className="block text-right num font-bold text-blueberry-900">
            {formatEuro(row.original.valueEur)}
          </span>
        ),
      },
      {
        accessorKey: "pnlEur",
        header: () => <span className="block text-right">P&amp;L €</span>,
        cell: ({ row }) => {
          const v = row.original.pnlEur;
          const tone = v > 0 ? "text-lime-700" : v < 0 ? "text-strawberry-700" : "text-blueberry-900/60";
          return (
            <span className={cn("block text-right num font-bold", tone)}>
              {v >= 0 ? "+" : ""}
              {formatEuro(v)}
            </span>
          );
        },
      },
      {
        accessorKey: "pnlPct",
        header: () => <span className="block text-right">P&amp;L %</span>,
        cell: ({ row }) => {
          const v = row.original.pnlPct;
          const tone = v > 0 ? "text-lime-700" : v < 0 ? "text-strawberry-700" : "text-blueberry-900/60";
          return (
            <span className={cn("block text-right num font-bold", tone)}>
              {formatPct(v)}
            </span>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const toggleType = (t: HoldingType) =>
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const totalValue = data.reduce((s, r) => s + r.valueEur, 0);

  if (holdings.length === 0) {
    return (
      <Card header="Positions">
        <p className="text-[13px] text-blueberry-900/70">
          Aucune position. Va sur{" "}
          <Link
            href="/dca"
            className="font-semibold text-blueberry-700 underline-offset-4 hover:underline"
          >
            la page DCA
          </Link>{" "}
          pour en créer une.
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <CategoryFilters
            selected={selectedTypes}
            onToggle={toggleType}
            onClear={() => setSelectedTypes(new Set())}
          />
          <div className="sm:w-64">
            <Input
              placeholder="Rechercher ticker ou nom…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card header={`Positions (${data.length}) — total ${formatEuro(totalValue)}`}>
        {/* Mobile: card list */}
        <ul className="md:hidden space-y-2">
          {table.getRowModel().rows.map((row) => {
            const r = row.original;
            return (
              <li key={r.id}>
                <Link
                  href={`/positions/${r.id}`}
                  className="block rounded-[10px] border border-blueberry-700/15 bg-blueberry-100/15 px-3 py-2.5 active:bg-blueberry-100/35 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-blueberry-900 text-[14px]">
                        {r.ticker}
                      </span>
                      <Pill flavor={r.type}>{r.type}</Pill>
                    </div>
                    <span className="num font-bold text-blueberry-900 text-[14px] whitespace-nowrap">
                      {formatEuro(r.valueEur)}
                    </span>
                  </div>
                  <div className="text-[11px] text-blueberry-900/65 mt-0.5 truncate">
                    {r.name}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[11px]">
                    <MiniStat
                      label="Qté"
                      value={formatQuantity(
                        r.quantity,
                        r.type === "crypto" ? 8 : 4,
                      )}
                    />
                    <MiniStat
                      label="PRU €"
                      value={formatEuro(r.pruEur, 4)}
                    />
                    <MiniStat
                      label="Prix €"
                      value={formatEuro(r.currentPriceEur, 4)}
                    />
                    <MiniStat
                      label="P&L"
                      value={`${r.pnlEur >= 0 ? "+" : ""}${formatEuro(r.pnlEur)} (${formatPct(r.pnlPct)})`}
                      tone={
                        r.pnlEur > 0
                          ? "pos"
                          : r.pnlEur < 0
                            ? "neg"
                            : "neutral"
                      }
                    />
                  </div>
                </Link>
              </li>
            );
          })}
          {data.length === 0 && (
            <li className="px-3 py-6 text-center text-blueberry-900/60 text-[12px]">
              Aucune position ne correspond aux filtres.
            </li>
          )}
        </ul>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto -mx-2">
          <table className="w-full text-[12px]">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-blueberry-700/30">
                  {hg.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className="
                          px-2.5 py-2 cursor-pointer select-none whitespace-nowrap
                          text-[10px] font-extrabold uppercase tracking-[0.06em]
                          text-blueberry-800/75 [text-shadow:0_1px_0_rgba(255,255,255,0.7)]
                          bg-gradient-to-b from-[rgba(220,235,250,0.6)] to-[rgba(195,215,235,0.6)]
                        "
                        style={{ textAlign: "left" }}
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sorted === "asc" ? (
                            <span className="text-blueberry-700">▲</span>
                          ) : sorted === "desc" ? (
                            <span className="text-blueberry-700">▼</span>
                          ) : null}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={
                    i % 2 === 0
                      ? "bg-blueberry-100/15 hover:bg-blueberry-200/25"
                      : "hover:bg-blueberry-200/15"
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-2.5 py-2 border-b border-blueberry-700/10 align-middle"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td
                    className="px-2.5 py-6 text-center text-blueberry-900/60 text-[12px]"
                    colSpan={columns.length}
                  >
                    Aucune position ne correspond aux filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "neutral";
}) {
  const toneClass =
    tone === "pos"
      ? "text-lime-700"
      : tone === "neg"
        ? "text-strawberry-700"
        : "text-blueberry-900";
  return (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className="text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-blueberry-800/65 shrink-0">
        {label}
      </span>
      <span className={cn("num font-mono tabular-nums truncate", toneClass)}>
        {value}
      </span>
    </div>
  );
}
