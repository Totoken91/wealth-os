"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import {
  simulatePurchaseTimeline,
  type PurchaseTimelineSummary,
} from "@/lib/finance";
import { formatEuro } from "@/lib/formatters";
import { useWealthStore } from "@/lib/store";
import { getCatalogEntry } from "@/lib/vehicle-catalog";
import type { AppState, Goal } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  goal: Goal;
  state: AppState;
}

export function VehiclePurchaseTimelineCard({ goal, state }: Props) {
  const deleteGoal = useWealthStore((s) => s.deleteGoal);
  const entry = goal.vehicleCatalogId
    ? getCatalogEntry(goal.vehicleCatalogId)
    : undefined;

  const summary: PurchaseTimelineSummary | null = useMemo(() => {
    if (!entry) return null;
    const monthsUntilDeadline = (() => {
      if (!goal.targetDate) return undefined;
      const target = new Date(goal.targetDate);
      const now = new Date();
      const m =
        (target.getFullYear() - now.getFullYear()) * 12 +
        (target.getMonth() - now.getMonth());
      return Math.max(0, m);
    })();
    return simulatePurchaseTimeline(state, {
      vehiclePrice: goal.targetAmount,
      monthsUntilDeadline,
      tolerancePct: goal.tolerancePct ?? 0.10,
    });
  }, [entry, goal, state]);

  const handleDelete = () => {
    if (confirm(`Supprimer l'objectif « ${goal.name} » ?`)) {
      deleteGoal(goal.id);
      toast.success("Objectif supprimé");
    }
  };

  if (!entry || !summary) {
    return (
      <Card>
        <div className="text-[12px] text-blueberry-900/65">
          Modèle introuvable dans le catalogue ({goal.vehicleCatalogId}).
          Supprime cet objectif et recrée-le.
        </div>
      </Card>
    );
  }

  const recM = summary.recommendedMonth;
  const recPoint = recM !== null ? summary.points[recM] : null;
  const isNow = recM === 0;
  const reachable = recM !== null;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-sans text-xl font-light tracking-tight text-blueberry-900">
            {goal.name}
          </h3>
          <div className="text-[11px] text-blueberry-900/60 mt-0.5">
            {entry.brand} {entry.model}
            {entry.trim ? ` · ${entry.trim}` : ""}
            {" · prix neuf "}
            <span className="num">{formatEuro(entry.msrpEur)}</span>
            {goal.targetDate && (
              <>
                {" · deadline "}
                {goal.targetDate}
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="text-[11px] font-bold uppercase tracking-wider text-strawberry-700 hover:underline shrink-0"
        >
          Suppr
        </button>
      </div>

      {/* Headline recommendation */}
      <div className="mt-4 flex flex-wrap items-baseline gap-3">
        <span
          className={cn(
            "inline-block px-3 py-[5px] rounded-[14px] text-[11px] font-bold border border-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.1)] [text-shadow:0_1px_0_rgba(255,255,255,0.4)]",
            !reachable
              ? "bg-gradient-to-b from-[#ffb4be] via-[#e84858] to-[#a02030] text-[#5a0a18]"
              : isNow
                ? "bg-gradient-to-b from-[#c8f0a0] via-[#7ac848] to-[#5aa830] text-[#1a4a08]"
                : "bg-gradient-to-b from-[#b8e0f8] via-[#6ab4e0] to-[#3a8acc] text-[#0a3a6a]",
          )}
        >
          {!reachable
            ? "✗ Hors portée"
            : isNow
              ? "✓ Achète maintenant"
              : `⏳ Attends ${recM} mois`}
        </span>
        {reachable && (
          <span className="text-[12.5px] font-bold text-blueberry-900">
            {isNow
              ? "Le coût trajectoire reste sous ton seuil"
              : `Date optimale : ${addMonthsLabel(recM!)}`}
          </span>
        )}
      </div>

      <div className="mt-2 text-[12px] text-blueberry-900/75 leading-snug">
        {summary.recommendationReason}
      </div>

      {/* Timeline visual */}
      <Timeline summary={summary} />

      {/* Recommended scenario block */}
      {recPoint?.scenario && (
        <div className="mt-4 rounded-[10px] border border-blueberry-700/15 bg-blueberry-100/15 px-4 py-3">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/80 mb-2">
            ◆ Mix optimal recommandé
            {!isNow && ` (à T+${recM} mois)`}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
            <Stat
              label="Apport conseillé"
              value={formatEuro(recPoint.scenario.downPayment)}
            />
            <Stat
              label="Crédit"
              value={
                recPoint.scenario.loanAmount > 0
                  ? `${formatEuro(recPoint.scenario.loanAmount)} sur ${recPoint.scenario.loanDurationMonths} mois`
                  : "—"
              }
            />
            <Stat
              label="Mensualité"
              value={
                recPoint.scenario.monthlyPayment > 0
                  ? `${formatEuro(recPoint.scenario.monthlyPayment)} / mois`
                  : "—"
              }
            />
            <Stat
              label="Intérêts cumulés"
              value={
                recPoint.scenario.totalInterest > 0
                  ? formatEuro(recPoint.scenario.totalInterest)
                  : "—"
              }
            />
          </div>
        </div>
      )}

      {/* Trajectory comparison */}
      <div className="mt-4 pt-3 border-t border-blueberry-700/15">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/80 mb-2">
          ◆ Coût trajectoire ({summary.horizonYears} ans, rendement{" "}
          {(state.settings.defaultAnnualReturn * 100).toFixed(1)}%/an)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12px]">
          <Stat
            label="Si tu n'achètes pas"
            value={formatEuro(summary.finalWealthIfSkip)}
          />
          {recPoint && (
            <>
              <Stat
                label="Si tu achètes (recommandé)"
                value={formatEuro(recPoint.finalWealthIfBuy)}
              />
              <Stat
                label="Coût"
                value={`${formatEuro(recPoint.trajectoryCost)} (${(recPoint.trajectoryCostPct * 100).toFixed(1)}%)`}
                tone={
                  recPoint.trajectoryCostPct <= summary.tolerancePct
                    ? "neutral"
                    : "neg"
                }
              />
            </>
          )}
        </div>
      </div>

      {/* Alternative scenarios table */}
      <details className="mt-3 group">
        <summary className="text-[10.5px] font-bold uppercase tracking-wider text-blueberry-700 cursor-pointer select-none list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">
            ▶
          </span>
          Voir d&apos;autres dates d&apos;achat
        </summary>
        <div className="mt-2 overflow-x-auto -mx-2">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-blueberry-700/30 text-blueberry-800/70 uppercase tracking-[0.04em] text-[9.5px]">
                <th className="px-2 py-1 text-left">Dans</th>
                <th className="px-2 py-1 text-right">Patrimoine projeté</th>
                <th className="px-2 py-1 text-right">Apport</th>
                <th className="px-2 py-1 text-right">Crédit / durée</th>
                <th className="px-2 py-1 text-right">Mensualité</th>
                <th className="px-2 py-1 text-right">Coût 10y</th>
              </tr>
            </thead>
            <tbody>
              {[0, 6, 12, 24, 36, 48, 60, 84]
                .filter((m) => m < summary.points.length)
                .map((m) => {
                  const p = summary.points[m];
                  return (
                    <tr
                      key={m}
                      className={cn(
                        m === recM && "bg-lime-100/30",
                        m % 2 === 0 && m !== recM && "bg-blueberry-100/10",
                      )}
                    >
                      <td className="px-2 py-1.5 num font-mono">
                        {m === 0 ? "Maintenant" : `T+${m} mois`}
                      </td>
                      <td className="px-2 py-1.5 num font-mono text-right">
                        {formatEuro(p.projectedWealth)}
                      </td>
                      <td className="px-2 py-1.5 num font-mono text-right">
                        {p.feasible
                          ? formatEuro(p.scenario!.downPayment)
                          : "—"}
                      </td>
                      <td className="px-2 py-1.5 num font-mono text-right">
                        {p.feasible && p.scenario!.loanAmount > 0
                          ? `${formatEuro(p.scenario!.loanAmount)} / ${p.scenario!.loanDurationMonths}m`
                          : p.feasible
                            ? "0 €"
                            : "—"}
                      </td>
                      <td className="px-2 py-1.5 num font-mono text-right">
                        {p.feasible && p.scenario!.monthlyPayment > 0
                          ? formatEuro(p.scenario!.monthlyPayment)
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-1.5 num font-mono text-right font-bold",
                          p.feasible
                            ? p.trajectoryCostPct <= summary.tolerancePct
                              ? "text-lime-700"
                              : "text-strawberry-700"
                            : "text-blueberry-900/40",
                        )}
                      >
                        {p.feasible
                          ? `${(p.trajectoryCostPct * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}

function Timeline({ summary }: { summary: PurchaseTimelineSummary }) {
  const totalMonths = summary.points.length - 1;
  const markers: { month: number; label: string; tone: "now" | "min" | "rec" | "cash" }[] = [
    { month: 0, label: "Maintenant", tone: "now" },
  ];
  if (
    summary.minFeasibleMonth !== null &&
    summary.minFeasibleMonth > 0 &&
    summary.minFeasibleMonth !== summary.recommendedMonth
  ) {
    markers.push({
      month: summary.minFeasibleMonth,
      label: `Min faisable T+${summary.minFeasibleMonth}`,
      tone: "min",
    });
  }
  if (summary.recommendedMonth !== null && summary.recommendedMonth > 0) {
    markers.push({
      month: summary.recommendedMonth,
      label: `Recommandé T+${summary.recommendedMonth}`,
      tone: "rec",
    });
  }
  if (
    summary.cashFullMonth !== null &&
    summary.cashFullMonth !== summary.recommendedMonth
  ) {
    markers.push({
      month: summary.cashFullMonth,
      label: `Cash full T+${summary.cashFullMonth}`,
      tone: "cash",
    });
  }

  return (
    <div className="mt-4">
      <div className="relative h-10">
        {/* Track */}
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-blueberry-700/15" />
        {/* Filled portion up to recommended */}
        {summary.recommendedMonth !== null && (
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-blueberry-400 to-lime-500"
            style={{
              left: 0,
              width: `${(summary.recommendedMonth / totalMonths) * 100}%`,
            }}
          />
        )}
        {/* Markers */}
        {markers.map((m) => {
          const left = `${(m.month / totalMonths) * 100}%`;
          const dotColor =
            m.tone === "now"
              ? "bg-blueberry-400"
              : m.tone === "rec"
                ? "bg-lime-600"
                : m.tone === "min"
                  ? "bg-tangerine-500"
                  : "bg-grape-500";
          return (
            <div
              key={`${m.tone}-${m.month}`}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
              style={{ left }}
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full border border-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
                  dotColor,
                )}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-blueberry-900/65">
        {markers.map((m) => (
          <span
            key={`label-${m.tone}-${m.month}`}
            className="inline-flex items-center gap-1"
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                m.tone === "now"
                  ? "bg-blueberry-400"
                  : m.tone === "rec"
                    ? "bg-lime-600"
                    : m.tone === "min"
                      ? "bg-tangerine-500"
                      : "bg-grape-500",
              )}
            />
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({
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
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-blueberry-800/65 truncate">
        {label}
      </span>
      <span className={cn("num font-mono tabular-nums truncate", toneClass)}>
        {value}
      </span>
    </div>
  );
}

function addMonthsLabel(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleString("fr-FR", { month: "long", year: "numeric" });
}
