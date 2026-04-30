"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  calculateObservedMonthlySavings,
  calculateTotalNet,
  findSnapshotNear,
  planForGoal,
  type GoalPlan,
} from "@/lib/finance";
import { formatEuro, formatEuroDelta, formatPct } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import type { AppState, Goal } from "@/types";

interface DashboardSnapshotDelta {
  monthDelta?: number;
  monthDeltaPct?: number;
  ytdDelta?: number;
}

function deriveDeltas(state: AppState, totalNet: number): DashboardSnapshotDelta {
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthBaseline = findSnapshotNear(state.snapshots, monthAgo, 7);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const ytdBaseline = findSnapshotNear(state.snapshots, yearStart, 30);

  return {
    monthDelta: monthBaseline ? totalNet - monthBaseline.totalNet : undefined,
    monthDeltaPct:
      monthBaseline && monthBaseline.totalNet !== 0
        ? ((totalNet - monthBaseline.totalNet) / monthBaseline.totalNet) * 100
        : undefined,
    ytdDelta: ytdBaseline ? totalNet - ytdBaseline.totalNet : undefined,
  };
}

function pickPriorityGoal(goals: Goal[]): Goal | null {
  if (goals.length === 0) return null;
  const now = Date.now();
  const future = goals
    .filter((g) => new Date(g.targetDate).getTime() >= now)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  return future[0] ?? goals[0];
}

const STATUS_TILE_CLASS: Record<GoalPlan["status"], string> = {
  reached:
    "bg-gradient-to-b from-[#c8f0a0]/80 via-[#7ac848]/80 to-[#5aa830]/80 text-[#1a4a08] border-lime-700/40",
  ahead:
    "bg-gradient-to-b from-[#c8f0a0]/80 via-[#7ac848]/80 to-[#5aa830]/80 text-[#1a4a08] border-lime-700/40",
  "on-track":
    "bg-gradient-to-b from-[#b8e0f8]/80 via-[#6ab4e0]/80 to-[#3a8acc]/80 text-[#0a3a6a] border-blueberry-700/40",
  behind:
    "bg-gradient-to-b from-[#ffb4be]/80 via-[#e84858]/80 to-[#a02030]/80 text-[#5a0a18] border-strawberry-700/40",
  unreachable:
    "bg-gradient-to-b from-[#ffb4be]/80 via-[#e84858]/80 to-[#a02030]/80 text-[#5a0a18] border-strawberry-700/40",
  unknown:
    "bg-white/60 text-blueberry-900 border-blueberry-700/30",
};

const STATUS_LABEL: Record<GoalPlan["status"], string> = {
  reached: "Atteint ✓",
  ahead: "En avance",
  "on-track": "Sur la trajectoire",
  behind: "En retard",
  unreachable: "Non atteignable",
  unknown: "Pas assez de données",
};

export function LiveCockpitCard() {
  const hydrated = useHydrated();
  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const vehicles = useWealthStore((s) => s.vehicles);
  const accounts = useWealthStore((s) => s.accounts);
  const snapshots = useWealthStore((s) => s.snapshots);
  const goals = useWealthStore((s) => s.goals);
  const dcaRules = useWealthStore((s) => s.dcaRules);
  const settings = useWealthStore((s) => s.settings);

  const { totalNet, deltas, observedMonthly, priorityGoal, goalPlan } = useMemo(() => {
    const state: AppState = {
      holdings,
      transactions,
      vehicles,
      accounts: accounts ?? [],
      snapshots,
      goals,
      dcaRules,
      settings,
    };
    const total = calculateTotalNet(state);
    const observed = calculateObservedMonthlySavings(state);
    const priority = pickPriorityGoal(goals);
    return {
      totalNet: total,
      deltas: deriveDeltas(state, total),
      observedMonthly: observed,
      priorityGoal: priority,
      goalPlan: priority ? planForGoal(priority, state) : null,
    };
  }, [
    holdings,
    transactions,
    vehicles,
    accounts,
    snapshots,
    goals,
    dcaRules,
    settings,
  ]);

  const value = hydrated ? totalNet : 0;
  const monthDelta = deltas.monthDelta;
  const monthTone =
    monthDelta === undefined
      ? "neutral"
      : monthDelta > 0
        ? "pos"
        : monthDelta < 0
          ? "neg"
          : "neutral";

  return (
    <div
      className="
        relative overflow-hidden
        rounded-[18px] px-7 py-[26px] mb-4
        bg-[linear-gradient(135deg,rgba(255,220,180,0.7)_0%,rgba(180,220,250,0.7)_50%,rgba(220,180,240,0.7)_100%)]
        backdrop-blur-[15px] backdrop-saturate-[1.3]
        border-2 border-[rgba(60,100,150,0.4)]
        shadow-[inset_0_2px_0_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.08),0_8px_24px_rgba(40,80,130,0.2)]
      "
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[30%] -left-[10%] w-[60%] h-full bg-[radial-gradient(ellipse_at_50%_50%,rgba(255,255,255,0.7)_0%,transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[40%] -right-[10%] w-[50%] h-full bg-[radial-gradient(ellipse_at_50%_50%,rgba(255,255,255,0.4)_0%,transparent_60%)]"
      />

      <div className="relative z-[1]">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[rgba(20,50,100,0.8)] [text-shadow:0_1px_0_rgba(255,255,255,0.9)] mb-[6px]">
          ◆ Patrimoine net total
        </div>
        <div
          className="
            num font-sans font-extralight leading-none
            text-[56px] tracking-[-1.5px] text-[#0a2855]
            [text-shadow:0_2px_0_rgba(255,255,255,0.7),0_-1px_1px_rgba(0,0,0,0.1)]
          "
        >
          {formatEuro(value)}
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Tile: Ce mois */}
          <Tile label="Ce mois">
            {monthDelta === undefined ? (
              <span className="text-[12px] text-blueberry-900/55">
                Pas d&apos;historique 30j
              </span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "num text-[18px] font-bold",
                    monthTone === "pos"
                      ? "text-lime-700"
                      : monthTone === "neg"
                        ? "text-strawberry-700"
                        : "text-blueberry-900",
                  )}
                >
                  {formatEuroDelta(monthDelta)}
                </span>
                {deltas.monthDeltaPct !== undefined && (
                  <span
                    className={cn(
                      "num text-[11px] font-bold",
                      monthTone === "pos"
                        ? "text-lime-700"
                        : monthTone === "neg"
                          ? "text-strawberry-700"
                          : "text-blueberry-900/65",
                    )}
                  >
                    ({formatPct(deltas.monthDeltaPct)})
                  </span>
                )}
              </div>
            )}
            {deltas.ytdDelta !== undefined && (
              <div className="num text-[10.5px] text-blueberry-900/60 mt-1">
                YTD : {formatEuroDelta(deltas.ytdDelta)}
              </div>
            )}
          </Tile>

          {/* Tile: Épargne 90j */}
          <Tile label="Épargne observée 90j">
            {observedMonthly === null ? (
              <span className="text-[12px] text-blueberry-900/55">
                Crée des snapshots quotidiens pour mesurer
              </span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "num text-[18px] font-bold",
                    observedMonthly > 0
                      ? "text-lime-700"
                      : observedMonthly < 0
                        ? "text-strawberry-700"
                        : "text-blueberry-900",
                  )}
                >
                  {formatEuroDelta(observedMonthly)}
                </span>
                <span className="text-[10.5px] text-blueberry-900/60">/mois</span>
              </div>
            )}
          </Tile>

          {/* Tile: Top goal */}
          <Tile label="Objectif prioritaire">
            {priorityGoal && goalPlan ? (
              <Link href="/goals" className="block">
                <div className="text-[12px] font-semibold text-blueberry-900 truncate">
                  {priorityGoal.name}
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "inline-block px-2 py-[2px] rounded-[10px] text-[10px] font-extrabold uppercase tracking-wider border shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
                      STATUS_TILE_CLASS[goalPlan.status],
                    )}
                  >
                    {STATUS_LABEL[goalPlan.status]}
                  </span>
                  {goalPlan.daysAhead !== null &&
                    goalPlan.status !== "reached" &&
                    goalPlan.status !== "unknown" && (
                      <span className="num text-[10.5px] text-blueberry-900/65">
                        {goalPlan.daysAhead >= 0
                          ? `+${goalPlan.daysAhead}j`
                          : `${goalPlan.daysAhead}j`}
                      </span>
                    )}
                </div>
              </Link>
            ) : (
              <Link
                href="/goals"
                className="text-[12px] font-semibold text-blueberry-700 underline-offset-4 hover:underline"
              >
                + Ajouter un objectif
              </Link>
            )}
          </Tile>
        </div>
      </div>
    </div>
  );
}

function Tile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        relative px-3 py-2.5 rounded-[12px]
        bg-white/60 backdrop-blur-sm
        border border-blueberry-700/25
        shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
      "
    >
      <div className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/75 [text-shadow:0_1px_0_rgba(255,255,255,0.7)] mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}
