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
      monthlySavingsOverride: goal.monthlyOverride,
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
  const verdict = summary.verdict;
  const isNow = recM === 0 && verdict === "buy-now";
  const outOfReach = verdict === "out-of-reach";
  const isCompromise = verdict === "compromise";
  const reachable = recM !== null && !outOfReach;

  // === Mode 1 : Achète maintenant ===
  // === Mode 2 : Attends N mois ===
  // === Mode 3 : Hors portée ===

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-sans text-xl font-light tracking-tight text-blueberry-900">
            {goal.name}
          </h3>
          <div className="text-[11px] text-blueberry-900/60 mt-0.5">
            Prix neuf <span className="num font-bold">{formatEuro(entry.msrpEur)}</span>
            {" · épargne mensuelle "}
            <span className="num font-bold">{formatEuro(summary.monthlySavings)}</span>
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

      {/* Verdict — gros, clair, une seule phrase */}
      <div
        className={cn(
          "mt-5 rounded-[14px] px-5 py-4 border-2",
          outOfReach
            ? "bg-strawberry-100/40 border-strawberry-700/40"
            : isCompromise
              ? "bg-tangerine-100/40 border-tangerine-700/40"
              : isNow
                ? "bg-lime-100/40 border-lime-700/40"
                : "bg-blueberry-100/30 border-blueberry-700/35",
        )}
      >
        <div
          className={cn(
            "text-[10.5px] font-extrabold uppercase tracking-[0.1em]",
            outOfReach
              ? "text-strawberry-800"
              : isCompromise
                ? "text-tangerine-800"
                : isNow
                  ? "text-lime-800"
                  : "text-blueberry-800",
          )}
        >
          {outOfReach
            ? "✗ Pas réaliste pour l'instant"
            : isCompromise
              ? `⚠ Aucune date idéale — compromis ${recM === 0 ? "maintenant" : `dans ${recM} mois`}`
              : isNow
                ? "✓ Tu peux te l'offrir maintenant"
                : `⏳ Mieux d'attendre ${recM} mois`}
        </div>
        <div className="mt-1 text-[14px] text-blueberry-900 leading-snug">
          {renderHeadline(summary)}
        </div>
      </div>

      {/* Stats principales selon le mode */}
      {reachable && recPoint && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat
            label={isNow ? "Tu sors de ta poche" : "Apport au moment d'acheter"}
            value={formatEuro(recPoint.scenario!.downPayment)}
          />
          <Stat
            label="Crédit"
            value={
              recPoint.scenario!.loanAmount > 0
                ? formatEuro(recPoint.scenario!.loanAmount)
                : "Aucun"
            }
            sub={
              recPoint.scenario!.loanAmount > 0
                ? `sur ${recPoint.scenario!.loanDurationMonths} mois`
                : "(cash full)"
            }
          />
          <Stat
            label="Mensualité"
            value={
              recPoint.scenario!.monthlyPayment > 0
                ? `${formatEuro(recPoint.scenario!.monthlyPayment)}/mois`
                : "—"
            }
            sub={
              recPoint.scenario!.totalInterest > 0
                ? `intérêts ${formatEuro(recPoint.scenario!.totalInterest)}`
                : undefined
            }
          />
          <Stat
            label={`Coût sur ${summary.horizonYears} ans`}
            value={`${formatEuro(recPoint.trajectoryCost)}`}
            sub={`-${(recPoint.trajectoryCostPct * 100).toFixed(1)}% de patrimoine futur`}
            tone={
              recPoint.trajectoryCostPct <= summary.tolerancePct
                ? "neutral"
                : "neg"
            }
          />
        </div>
      )}

      {outOfReach && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-[10px] border border-strawberry-700/15 bg-strawberry-100/20 px-3 py-3">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-strawberry-800/80 mb-1">
              Ce qu&apos;il manque
            </div>
            <div className="text-[12.5px] text-blueberry-900/85 leading-snug">
              {summary.recommendationReason}
            </div>
          </div>
          {summary.cashFullMonth !== null ? (
            <div className="rounded-[10px] border border-blueberry-700/15 bg-blueberry-100/15 px-3 py-3">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-blueberry-800/80 mb-1">
                Au rythme actuel
              </div>
              <div className="text-[12.5px] text-blueberry-900/85 leading-snug">
                Tu pourras te l&apos;offrir <strong>cash sans crédit dans{" "}
                {monthsToLabel(summary.cashFullMonth)}</strong> ({addMonthsLabel(summary.cashFullMonth)}).
              </div>
            </div>
          ) : (
            <div className="rounded-[10px] border border-blueberry-700/15 bg-blueberry-100/15 px-3 py-3">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-blueberry-800/80 mb-1">
                Au rythme actuel
              </div>
              <div className="text-[12.5px] text-blueberry-900/85 leading-snug">
                Tu n&apos;auras pas le prix cash dans les 7 prochaines années
                — augmente ton épargne, ou vise une voiture moins chère.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Détails dépliables */}
      {reachable && (
        <div className="mt-4 pt-3 border-t border-blueberry-700/15 space-y-3">
          <details className="group">
            <summary className="text-[11px] font-bold uppercase tracking-wider text-blueberry-700 cursor-pointer select-none list-none flex items-center gap-1.5 hover:text-blueberry-900">
              <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
              Pourquoi cette date ?
            </summary>
            <div className="mt-2 text-[12.5px] text-blueberry-900/85 leading-snug pl-4">
              {summary.recommendationReason}
              {!isNow && (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-blueberry-800/65 mb-0.5">
                      Si tu n&apos;achètes jamais
                    </div>
                    <div className="num font-mono tabular-nums text-blueberry-900">
                      {formatEuro(summary.finalWealthIfSkip)} dans {summary.horizonYears} ans
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-blueberry-800/65 mb-0.5">
                      Si tu suis la reco
                    </div>
                    <div className="num font-mono tabular-nums text-blueberry-900">
                      {formatEuro(recPoint!.finalWealthIfBuy)} dans {summary.horizonYears} ans
                    </div>
                  </div>
                </div>
              )}
            </div>
          </details>

          {!isNow && summary.points[0] && summary.points[0].feasible && (
            <details className="group">
              <summary className="text-[11px] font-bold uppercase tracking-wider text-blueberry-700 cursor-pointer select-none list-none flex items-center gap-1.5 hover:text-blueberry-900">
                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                Et si j&apos;achète maintenant à la place ?
              </summary>
              <div className="mt-2 pl-4 text-[12.5px] text-blueberry-900/85 leading-snug">
                {(() => {
                  const p0 = summary.points[0];
                  const extraCost = p0.trajectoryCost - recPoint!.trajectoryCost;
                  return (
                    <>
                      Acheter aujourd&apos;hui te coûterait{" "}
                      <strong>
                        {formatEuro(p0.trajectoryCost)} (
                        {(p0.trajectoryCostPct * 100).toFixed(1)}%)
                      </strong>
                      {" "}au lieu de{" "}
                      <strong>
                        {formatEuro(recPoint!.trajectoryCost)} (
                        {(recPoint!.trajectoryCostPct * 100).toFixed(1)}%)
                      </strong>
                      {" "}— soit{" "}
                      <strong className="text-strawberry-700">
                        {formatEuro(extraCost)} de richesse en plus perdue
                      </strong>
                      {" "}sur {summary.horizonYears} ans à cause de l&apos;impatience.
                    </>
                  );
                })()}
              </div>
            </details>
          )}

          {summary.cashFullMonth !== null &&
            summary.cashFullMonth !== recM && (
              <details className="group">
                <summary className="text-[11px] font-bold uppercase tracking-wider text-blueberry-700 cursor-pointer select-none list-none flex items-center gap-1.5 hover:text-blueberry-900">
                  <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                  Et si j&apos;attends d&apos;avoir tout cash ?
                </summary>
                <div className="mt-2 pl-4 text-[12.5px] text-blueberry-900/85 leading-snug">
                  {(() => {
                    const cashPoint = summary.points[summary.cashFullMonth!];
                    return (
                      <>
                        Sans crédit du tout, il te faudra attendre{" "}
                        <strong>{monthsToLabel(summary.cashFullMonth!)}</strong> (
                        {addMonthsLabel(summary.cashFullMonth!)}). À cette date :
                        coût {formatEuro(cashPoint.trajectoryCost)} (
                        {(cashPoint.trajectoryCostPct * 100).toFixed(1)}%).
                      </>
                    );
                  })()}
                </div>
              </details>
            )}

          <details className="group">
            <summary className="text-[11px] font-bold uppercase tracking-wider text-blueberry-700 cursor-pointer select-none list-none flex items-center gap-1.5 hover:text-blueberry-900">
              <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
              Voir d&apos;autres dates
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-blueberry-700/30 text-blueberry-800/70 uppercase tracking-[0.04em] text-[9.5px]">
                    <th className="px-2 py-1 text-left">Achat dans</th>
                    <th className="px-2 py-1 text-right">Apport</th>
                    <th className="px-2 py-1 text-right">Crédit</th>
                    <th className="px-2 py-1 text-right">Mensualité</th>
                    <th className="px-2 py-1 text-right">Coût {summary.horizonYears} ans</th>
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
                            m === recM && "bg-lime-100/40 font-bold",
                            m % 2 === 0 && m !== recM && "bg-blueberry-100/10",
                          )}
                        >
                          <td className="px-2 py-1.5 num font-mono">
                            {m === 0 ? "Maintenant" : monthsToLabel(m)}
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
                                ? "—"
                                : "✗"}
                          </td>
                          <td className="px-2 py-1.5 num font-mono text-right">
                            {p.feasible && p.scenario!.monthlyPayment > 0
                              ? formatEuro(p.scenario!.monthlyPayment)
                              : "—"}
                          </td>
                          <td
                            className={cn(
                              "px-2 py-1.5 num font-mono text-right",
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
        </div>
      )}

      <div className="mt-3 text-[10px] text-blueberry-900/55">
        Hypothèses : rendement{" "}
        {(state.settings.defaultAnnualReturn * 100).toFixed(0)}%/an · taux
        crédit 5%/an · horizon {summary.horizonYears} ans · seuil de tolérance{" "}
        {(summary.tolerancePct * 100).toFixed(0)}%
      </div>
    </Card>
  );
}

function renderHeadline(
  summary: PurchaseTimelineSummary,
): React.ReactNode {
  if (summary.outOfReach) {
    return (
      <>
        Avec une épargne de{" "}
        <strong>{formatEuro(summary.monthlySavings)}/mois</strong> et tes
        finances actuelles, l&apos;app n&apos;a pas trouvé de scénario
        soutenable pour cette voiture dans les 7 prochaines années.
        {summary.cashFullMonth !== null && (
          <>
            {" "}Au rythme actuel tu pourrais te l&apos;offrir cash dans{" "}
            <strong>{monthsToLabel(summary.cashFullMonth)}</strong>.
          </>
        )}
      </>
    );
  }
  const recM = summary.recommendedMonth!;
  const recPoint = summary.points[recM];
  if (summary.verdict === "compromise") {
    return (
      <>
        Aucune date ne respecte ton seuil de tolérance de{" "}
        <strong>{(summary.tolerancePct * 100).toFixed(0)}%</strong>. Le
        meilleur compromis te coûterait{" "}
        <strong>{formatEuro(recPoint.trajectoryCost)}</strong> de patrimoine
        futur sur {summary.horizonYears} ans —{" "}
        <strong className="text-tangerine-800">
          {(recPoint.trajectoryCostPct * 100).toFixed(1)}%
        </strong>
        . Acheter reste possible mais coûte cher.
      </>
    );
  }
  if (recM === 0) {
    return (
      <>
        Acheter aujourd&apos;hui te coûte{" "}
        <strong>{formatEuro(recPoint.trajectoryCost)}</strong> de patrimoine
        futur sur {summary.horizonYears} ans —{" "}
        <strong>{(recPoint.trajectoryCostPct * 100).toFixed(1)}%</strong> de
        ce que tu aurais sans achat. C&apos;est sous ton seuil de tolérance.
      </>
    );
  }
  return (
    <>
      Date conseillée :{" "}
      <strong>{addMonthsLabel(recM)}</strong>. À cette date, le coût sur{" "}
      {summary.horizonYears} ans tombera à{" "}
      <strong>
        {formatEuro(recPoint.trajectoryCost)} (
        {(recPoint.trajectoryCostPct * 100).toFixed(1)}%)
      </strong>{" "}
      — sous ton seuil. Acheter avant te coûterait plus cher.
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
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
      <span
        className={cn(
          "num font-mono tabular-nums font-bold text-[14px]",
          toneClass,
        )}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[10px] text-blueberry-900/60 leading-tight">
          {sub}
        </span>
      )}
    </div>
  );
}

function monthsToLabel(months: number): string {
  if (months === 0) return "0 mois";
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (m === 0) return `${y} an${y > 1 ? "s" : ""}`;
  return `${y} an${y > 1 ? "s" : ""} ${m} mois`;
}

function addMonthsLabel(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleString("fr-FR", { month: "long", year: "numeric" });
}
