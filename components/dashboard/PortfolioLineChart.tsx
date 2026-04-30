"use client";

import { useMemo, useState } from "react";
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
import type { Snapshot } from "@/types";

type Range = "30J" | "90J" | "1A" | "TOUT";
const RANGES: Range[] = ["30J", "90J", "1A", "TOUT"];
const RANGE_DAYS: Record<Range, number | null> = {
  "30J": 30,
  "90J": 90,
  "1A": 365,
  TOUT: null,
};

interface ChartPoint {
  date: string;
  ts: number;
  net: number;
  capital: number;
}

function dayOnly(iso: string): string {
  return iso.slice(0, 10);
}

function downsample(points: ChartPoint[], maxPoints = 365): ChartPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const result: ChartPoint[] = [];
  for (let i = 0; i < points.length; i += step) result.push(points[i]);
  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1]);
  }
  return result;
}

export function PortfolioLineChart() {
  const snapshots = useWealthStore((s) => s.snapshots);
  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const vehicles = useWealthStore((s) => s.vehicles);
  const accounts = useWealthStore((s) => s.accounts);
  const settings = useWealthStore((s) => s.settings);
  const goals = useWealthStore((s) => s.goals);
  const dcaRules = useWealthStore((s) => s.dcaRules);

  const [range, setRange] = useState<Range>("90J");

  const data = useMemo(() => {
    const liveState = {
      holdings,
      transactions,
      vehicles,
      accounts: accounts ?? [],
      snapshots,
      goals,
      dcaRules,
      settings,
    };
    const liveNet = calculateTotalNet(liveState);
    const liveCapital = calculateTotalCapitalInvested(liveState);
    const todayKey = dayOnly(new Date().toISOString());

    // Build daily points: keep latest snapshot per day, then append today
    const byDay = new Map<string, Snapshot>();
    const sorted = [...snapshots].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    for (const s of sorted) byDay.set(dayOnly(s.date), s);

    let points: ChartPoint[] = [];
    for (const [day, snap] of Array.from(byDay.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      points.push({
        date: day,
        ts: new Date(day).getTime(),
        net: snap.totalNet,
        capital: snap.capitalInvested,
      });
    }
    if (!byDay.has(todayKey)) {
      points.push({
        date: todayKey,
        ts: new Date(todayKey).getTime(),
        net: liveNet,
        capital: liveCapital,
      });
    } else {
      // ensure today reflects live state
      const last = points[points.length - 1];
      last.net = liveNet;
      last.capital = liveCapital;
    }

    const days = RANGE_DAYS[range];
    if (days !== null) {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      points = points.filter((p) => p.ts >= cutoff);
    }
    return downsample(points);
  }, [snapshots, holdings, transactions, vehicles, accounts, goals, dcaRules, settings, range]);

  const last = data[data.length - 1];
  const first = data[0];
  const trend = last && first ? last.net - first.net : 0;
  const trendPct =
    last && first && first.net !== 0 ? (trend / first.net) * 100 : 0;

  return (
    <Card header="Évolution du patrimoine">
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              "h-6 px-2.5 rounded-[12px] border text-[10.5px] font-bold uppercase tracking-wider transition-colors",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
              range === r
                ? "bg-gradient-to-b from-[#6ec0f0] via-[#3a7fc4] to-[#2a5a9a] text-white border-black/40 [text-shadow:0_-1px_0_rgba(0,0,0,0.3)]"
                : "bg-gradient-to-b from-white to-[#d0d0d0] text-[#1a1a1a] border-black/30",
            )}
          >
            {r}
          </button>
        ))}
        {data.length > 1 && (
          <span className="ml-auto text-[11px] text-blueberry-900/65">
            <span
              className={cn(
                "font-bold",
                trend > 0
                  ? "text-lime-700"
                  : trend < 0
                    ? "text-strawberry-700"
                    : "text-blueberry-900/60",
              )}
            >
              {trend >= 0 ? "+" : ""}
              {formatEuro(trend)}
            </span>
            {first && first.net !== 0 ? (
              <>
                {" "}
                ({trend >= 0 ? "+" : ""}
                {trendPct.toFixed(1)}%)
              </>
            ) : null}{" "}
            sur la période
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="py-12 text-center text-[12.5px] text-blueberry-900/60">
          Pas encore d&apos;historique sur cette période. Les snapshots
          quotidiens s&apos;accumulent automatiquement à chaque modification.
        </div>
      ) : (
        <div className="h-[220px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3a7fc4" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#3a7fc4" stopOpacity={0.05} />
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
                formatter={(value, name) => [
                  typeof value === "number" ? formatEuro(value) : String(value),
                  name === "net" ? "Patrimoine" : "Capital investi",
                ]}
                labelStyle={{ color: "#0a3a6a", fontWeight: 700 }}
              />
              <Area
                type="monotone"
                dataKey="net"
                stroke="#3a7fc4"
                strokeWidth={2.5}
                fill="url(#netFill)"
                dot={false}
                activeDot={{ r: 5, fill: "#3a7fc4", stroke: "#fff", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="capital"
                stroke="#888"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
