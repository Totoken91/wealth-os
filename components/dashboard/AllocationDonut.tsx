"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { calculateBreakdown } from "@/lib/finance";
import { formatEuro } from "@/lib/formatters";
import { useWealthStore } from "@/lib/store";

interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
  textColor: string;
}

export function AllocationDonut() {
  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const vehicles = useWealthStore((s) => s.vehicles);
  const snapshots = useWealthStore((s) => s.snapshots);
  const goals = useWealthStore((s) => s.goals);
  const settings = useWealthStore((s) => s.settings);

  const segments = useMemo<Segment[]>(() => {
    const breakdown = calculateBreakdown({
      holdings,
      transactions,
      vehicles,
      snapshots,
      goals,
      settings,
    });
    return [
      { key: "etf", label: "ETF", value: breakdown.etf, color: "#3a8acc", textColor: "#0a3a6a" },
      { key: "stock", label: "Stocks", value: breakdown.stock, color: "#80c020", textColor: "#2a4a08" },
      { key: "crypto", label: "Crypto", value: breakdown.crypto, color: "#9858c8", textColor: "#4a0a6a" },
      { key: "cash", label: "Cash", value: breakdown.cash, color: "#e84858", textColor: "#5a0a18" },
      { key: "vehicles", label: "Véhicules", value: breakdown.vehicles, color: "#f06820", textColor: "#6a2a0a" },
    ].filter((s) => s.value > 0);
  }, [holdings, transactions, vehicles, snapshots, goals, settings]);

  const total = segments.reduce((s, x) => s + x.value, 0);

  return (
    <Card header="Allocation">
      {total === 0 ? (
        <div className="py-10 text-center text-[12.5px] text-blueberry-900/60">
          Pas encore de positions ni véhicules.
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Donut segments={segments} total={total} />
          <ul className="w-full text-[11.5px]">
            {segments.map((s) => {
              const pct = (s.value / total) * 100;
              return (
                <li
                  key={s.key}
                  className="flex items-center justify-between py-1 border-b border-dashed border-blueberry-700/15 last:border-none"
                >
                  <span className="flex items-center gap-2 font-semibold text-blueberry-900">
                    <span
                      className="inline-block w-3 h-3 rounded-full border border-black/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]"
                      style={{ background: s.color }}
                    />
                    {s.label}
                  </span>
                  <span className="num text-[#1a1a1a]">
                    {formatEuro(s.value)}{" "}
                    <span className="text-blueberry-900/55">
                      · {pct.toFixed(1)}%
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Donut({ segments, total }: { segments: Segment[]; total: number }) {
  const size = 180;
  const stroke = 28;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;

  let acc = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id="donutGloss" cx="50%" cy="35%" r="55%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="rgba(60,100,150,0.12)"
          strokeWidth={stroke}
          fill="none"
        />
        {segments.map((s) => {
          const frac = s.value / total;
          const len = c * frac;
          const offset = -c * (acc / total);
          acc += s.value;
          return (
            <circle
              key={s.key}
              cx={cx}
              cy={cy}
              r={r}
              stroke={s.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: "stroke-dasharray 300ms" }}
            />
          );
        })}
        {/* Glossy center */}
        <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill="url(#donutGloss)" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/70">
          Total
        </div>
        <div className="num font-sans text-[18px] font-light text-blueberry-900 leading-none mt-0.5">
          {formatEuro(total)}
        </div>
      </div>
    </div>
  );
}
