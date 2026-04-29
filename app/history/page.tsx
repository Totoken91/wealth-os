"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import {
  calculateTotalCapitalInvested,
  calculateTotalNet,
} from "@/lib/finance";
import { formatEuro } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";

type Range = "1M" | "3M" | "6M" | "1A" | "3A" | "TOUT";
const RANGES: Range[] = ["1M", "3M", "6M", "1A", "3A", "TOUT"];
const DAYS: Record<Range, number | null> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1A": 365,
  "3A": 365 * 3,
  TOUT: null,
};

export default function HistoryPage() {
  const hydrated = useHydrated();
  const snapshots = useWealthStore((s) => s.snapshots);
  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const vehicles = useWealthStore((s) => s.vehicles);
  const goals = useWealthStore((s) => s.goals);
  const settings = useWealthStore((s) => s.settings);
  const deleteSnapshot = useWealthStore((s) => s.deleteSnapshot);

  const [range, setRange] = useState<Range>("1A");

  const points = useMemo(() => {
    const liveState = {
      holdings,
      transactions,
      vehicles,
      snapshots,
      goals,
      settings,
    };
    const liveNet = calculateTotalNet(liveState);
    const liveCapital = calculateTotalCapitalInvested(liveState);
    const todayKey = new Date().toISOString().slice(0, 10);

    const byDay = new Map<
      string,
      { net: number; capital: number }
    >();
    for (const s of [...snapshots].sort((a, b) =>
      a.date.localeCompare(b.date),
    )) {
      byDay.set(s.date.slice(0, 10), {
        net: s.totalNet,
        capital: s.capitalInvested,
      });
    }
    byDay.set(todayKey, { net: liveNet, capital: liveCapital });

    let arr = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        ts: new Date(date).getTime(),
        net: v.net,
        capital: v.capital,
        gain: Math.max(0, v.net - v.capital),
        loss: Math.min(0, v.net - v.capital),
      }));

    const days = DAYS[range];
    if (days !== null) {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      arr = arr.filter((p) => p.ts >= cutoff);
    }
    return arr;
  }, [snapshots, holdings, transactions, vehicles, goals, settings, range]);

  const sortedSnapshots = useMemo(
    () => [...snapshots].sort((a, b) => b.date.localeCompare(a.date)),
    [snapshots],
  );

  const handleDelete = (id: string) => {
    if (confirm("Supprimer ce snapshot ?")) {
      deleteSnapshot(id);
      toast.success("Snapshot supprimé");
    }
  };

  return (
    <div className="text-blueberry-900">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
        ◆ Wealth OS
      </div>
      <h1 className="mt-1 mb-6 font-sans text-3xl font-extralight tracking-tight">
        Historique
      </h1>

      {!hydrated ? (
        <div className="text-blueberry-900/60 text-sm">Chargement…</div>
      ) : (
        <>
          <Card>
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    "h-7 px-3 rounded-[14px] border text-[11px] font-bold uppercase tracking-wider transition-colors",
                    "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
                    range === r
                      ? "bg-gradient-to-b from-[#6ec0f0] via-[#3a7fc4] to-[#2a5a9a] text-white border-black/40 [text-shadow:0_-1px_0_rgba(0,0,0,0.3)]"
                      : "bg-gradient-to-b from-white to-[#d0d0d0] text-[#1a1a1a] border-black/30",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            {points.length < 2 ? (
              <div className="py-12 text-center text-[12.5px] text-blueberry-900/60">
                Pas encore d&apos;historique sur cette période. Les snapshots
                quotidiens s&apos;accumulent automatiquement à chaque
                modification.
              </div>
            ) : (
              <div className="h-[360px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={points}
                    margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="histNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3a7fc4" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#3a7fc4" stopOpacity={0.04} />
                      </linearGradient>
                      <linearGradient id="histGain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#80c020" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="#80c020" stopOpacity={0.04} />
                      </linearGradient>
                      <linearGradient id="histLoss" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#e84858" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="#e84858" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 4"
                      stroke="rgba(60,100,150,0.15)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "rgba(20,60,110,0.7)" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(60,100,150,0.25)" }}
                      minTickGap={32}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "rgba(20,60,110,0.7)" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(60,100,150,0.25)" }}
                      width={70}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k €` : `${v} €`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(255,255,255,0.95)",
                        border: "1px solid rgba(60,100,150,0.4)",
                        borderRadius: 10,
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                      }}
                      formatter={(value, name) => {
                        const label =
                          name === "net"
                            ? "Patrimoine"
                            : name === "capital"
                              ? "Capital investi"
                              : name === "gain"
                                ? "Gain latent"
                                : "Perte latente";
                        return [
                          typeof value === "number" ? formatEuro(value) : String(value),
                          label,
                        ];
                      }}
                      labelStyle={{ color: "#0a3a6a", fontWeight: 700 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="gain"
                      stroke="none"
                      fill="url(#histGain)"
                    />
                    <Area
                      type="monotone"
                      dataKey="loss"
                      stroke="none"
                      fill="url(#histLoss)"
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      stroke="#3a7fc4"
                      strokeWidth={2.5}
                      fill="url(#histNet)"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="capital"
                      stroke="#666"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card header={`Snapshots (${sortedSnapshots.length})`}>
            {sortedSnapshots.length === 0 ? (
              <p className="text-[13px] text-blueberry-900/70">
                Aucun snapshot pour l&apos;instant.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-blueberry-700/30">
                      <Th>Date</Th>
                      <Th align="right">Patrimoine</Th>
                      <Th align="right">Capital</Th>
                      <Th align="right">P&amp;L latent</Th>
                      <Th align="right">ETF</Th>
                      <Th align="right">Crypto</Th>
                      <Th align="right">Stock</Th>
                      <Th align="right">Cash</Th>
                      <Th align="right">Véhicules</Th>
                      <Th align="right">&nbsp;</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSnapshots.map((s, i) => {
                      const pnl = s.totalNet - s.capitalInvested;
                      return (
                        <tr
                          key={s.id}
                          className={
                            i % 2 === 0
                              ? "bg-blueberry-100/15"
                              : "hover:bg-blueberry-200/15"
                          }
                        >
                          <Td mono>{s.date.slice(0, 10)}</Td>
                          <Td mono align="right" className="font-bold">
                            {formatEuro(s.totalNet)}
                          </Td>
                          <Td mono align="right">
                            {formatEuro(s.capitalInvested)}
                          </Td>
                          <Td
                            mono
                            align="right"
                            className={cn(
                              "font-bold",
                              pnl > 0
                                ? "text-lime-700"
                                : pnl < 0
                                  ? "text-strawberry-700"
                                  : "text-blueberry-900/60",
                            )}
                          >
                            {pnl >= 0 ? "+" : ""}
                            {formatEuro(pnl)}
                          </Td>
                          <Td mono align="right">
                            {formatEuro(s.breakdown.etf)}
                          </Td>
                          <Td mono align="right">
                            {formatEuro(s.breakdown.crypto)}
                          </Td>
                          <Td mono align="right">
                            {formatEuro(s.breakdown.stock)}
                          </Td>
                          <Td mono align="right">
                            {formatEuro(s.breakdown.cash)}
                          </Td>
                          <Td mono align="right">
                            {formatEuro(s.breakdown.vehicles)}
                          </Td>
                          <Td align="right">
                            <button
                              type="button"
                              onClick={() => handleDelete(s.id)}
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
            )}
          </Card>
        </>
      )}
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
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-2.5 py-2 border-b border-blueberry-700/10 text-[#1a1a1a]",
        mono && "font-mono tabular-nums text-[11px]",
        className,
      )}
      style={{ textAlign: align ?? "left" }}
    >
      {children}
    </td>
  );
}
