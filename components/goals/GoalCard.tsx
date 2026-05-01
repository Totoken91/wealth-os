"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LoanOptimizerPanel } from "@/components/goals/LoanOptimizerPanel";
import { VehiclePurchaseTimelineCard } from "@/components/goals/VehiclePurchaseTimelineCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NumberInput } from "@/components/ui/NumberInput";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { GoalAssessment, GoalSmartStatus } from "@/lib/finance";
import { formatEuro } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import type { AppState, Goal } from "@/types";

interface Props {
  goal: Goal;
  assessment: GoalAssessment;
}

const SOURCE_LABEL: Record<Goal["source"], string> = {
  cash: "Cash uniquement",
  investment: "Investissements",
  mixed: "Patrimoine total",
};

const STATUS_LABEL: Record<GoalSmartStatus, string> = {
  "optimal-now": "✓ Faisable maintenant",
  "feasible-tight": "⚠ Faisable mais coûteux",
  "loan-strategic": "💡 Stratégie : emprunte",
  wait: "⏳ Patiente / accélère",
  "out-of-reach": "✗ Hors portée",
};

const STATUS_TONE: Record<GoalSmartStatus, string> = {
  "optimal-now":
    "bg-gradient-to-b from-[#c8f0a0] via-[#7ac848] to-[#5aa830] text-[#1a4a08]",
  "loan-strategic":
    "bg-gradient-to-b from-[#b8e0f8] via-[#6ab4e0] to-[#3a8acc] text-[#0a3a6a]",
  "feasible-tight":
    "bg-gradient-to-b from-[#ffd0a8] via-[#f08838] to-[#c05818] text-[#6a2a08]",
  wait:
    "bg-gradient-to-b from-[#fafafa] via-[#d8d8d8] to-[#c0c0c0] text-[#1a1a1a]",
  "out-of-reach":
    "bg-gradient-to-b from-[#ffb4be] via-[#e84858] to-[#a02030] text-[#5a0a18]",
};

export function GoalCard({ goal, assessment }: Props) {
  const updateGoal = useWealthStore((s) => s.updateGoal);
  const deleteGoal = useWealthStore((s) => s.deleteGoal);

  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const vehicles = useWealthStore((s) => s.vehicles);
  const accounts = useWealthStore((s) => s.accounts);
  const snapshots = useWealthStore((s) => s.snapshots);
  const goals = useWealthStore((s) => s.goals);
  const dcaRules = useWealthStore((s) => s.dcaRules);
  const settings = useWealthStore((s) => s.settings);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal.monthlyOverride ?? 0);
  const [optimizerOpen, setOptimizerOpen] = useState(false);

  const state: AppState = useMemo(
    () => ({
      holdings,
      transactions,
      vehicles,
      accounts: accounts ?? [],
      snapshots,
      goals,
      dcaRules,
      settings,
    }),
    [
      holdings,
      transactions,
      vehicles,
      accounts,
      snapshots,
      goals,
      dcaRules,
      settings,
    ],
  );

  // Smart vehicle goal — render the dedicated timeline card.
  if (goal.vehicleCatalogId) {
    return <VehiclePurchaseTimelineCard goal={goal} state={state} />;
  }

  const { plan, isPurchase } = assessment;

  const pct =
    plan.effectiveTarget > 0
      ? Math.min(
          100,
          ((plan.currentAmount /
            (isPurchase ? assessment.investableWealth : 1)) *
            100) /
            (isPurchase
              ? Math.max(0.0001, goal.targetAmount / assessment.investableWealth)
              : 1),
        )
      : 0;

  // For purchase goals, use a different progress signal: "available cash vs
  // down-payment required by the optimal scenario"
  const purchaseProgressPct = (() => {
    if (!isPurchase || !assessment.optimization) return 0;
    const target = Math.max(
      1,
      assessment.optimization.scenarios.optimal.downPayment,
    );
    return Math.min(100, (assessment.availableForDownPayment / target) * 100);
  })();

  const displayPct = isPurchase ? purchaseProgressPct : pct;

  const saveOverride = () => {
    if (draft <= 0) {
      toast.error("Montant invalide");
      return;
    }
    updateGoal(goal.id, { monthlyOverride: draft });
    setEditing(false);
    toast.success("Override appliqué");
  };

  const clearOverride = () => {
    updateGoal(goal.id, { monthlyOverride: undefined });
    setEditing(false);
    setDraft(0);
    toast.success("Repassé sur l'épargne observée");
  };

  const handleDelete = () => {
    if (confirm(`Supprimer l'objectif « ${goal.name} » ?`)) {
      deleteGoal(goal.id);
      toast.success("Objectif supprimé");
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-sans text-xl font-light tracking-tight text-blueberry-900">
            {goal.name}
          </h3>
          <div className="text-[11px] text-blueberry-900/60 mt-0.5">
            {SOURCE_LABEL[goal.source]} · échéance {goal.targetDate}
            {goal.borrowAmount ? (
              <>
                {" · emprunt déclaré "}
                <span className="num">{formatEuro(goal.borrowAmount)}</span>
              </>
            ) : null}
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

      {/* Status pill + headline */}
      <div className="mt-4 flex flex-wrap items-baseline gap-3">
        <span
          className={cn(
            "inline-block px-3 py-[5px] rounded-[14px] text-[11px] font-bold border border-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.1)] [text-shadow:0_1px_0_rgba(255,255,255,0.4)]",
            STATUS_TONE[assessment.smartStatus],
          )}
        >
          {STATUS_LABEL[assessment.smartStatus]}
        </span>
        <span className="text-[12.5px] font-bold text-blueberry-900">
          {assessment.smartHeadline}
        </span>
      </div>

      {/* Detail explanation */}
      <div className="mt-2 text-[12px] text-blueberry-900/75 leading-snug">
        {assessment.smartDetail}
      </div>

      {/* Money snapshot */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
        <Stat
          label={isPurchase ? "Coût total" : "Cible"}
          value={formatEuro(goal.targetAmount)}
          bold
        />
        {isPurchase ? (
          <>
            <Stat
              label="Patrimoine investissable"
              value={formatEuro(assessment.investableWealth)}
            />
            <Stat
              label="Réserve d'urgence"
              value={formatEuro(assessment.reservedFloor)}
            />
            <Stat
              label="Disponible pour apport"
              value={formatEuro(assessment.availableForDownPayment)}
              tone={
                assessment.availableForDownPayment >= goal.targetAmount
                  ? "pos"
                  : "neutral"
              }
            />
          </>
        ) : (
          <>
            <Stat
              label="Patrimoine actuel (source)"
              value={formatEuro(plan.currentAmount)}
            />
            <Stat label="Manque" value={formatEuro(plan.remaining)} />
            <Stat
              label="Effort requis"
              value={`${formatEuro(plan.requiredMonthly)}/mois`}
            />
          </>
        )}
      </div>

      {/* Progress bar — for purchase: progress towards "you have the cash needed for the optimal mix" */}
      {isPurchase && assessment.optimization?.feasible && (
        <>
          <div className="mt-3 flex items-baseline justify-between text-[11px]">
            <span className="text-blueberry-900/65">
              Apport mix optimal
            </span>
            <span className="num font-bold text-blueberry-900">
              {formatEuro(assessment.availableForDownPayment)} /{" "}
              {formatEuro(assessment.optimization.scenarios.optimal.downPayment)}
            </span>
          </div>
          <div className="mt-1">
            <ProgressBar
              value={displayPct}
              flavor={
                assessment.smartStatus === "out-of-reach"
                  ? "strawberry"
                  : assessment.smartStatus === "feasible-tight"
                    ? "tangerine"
                    : "lime"
              }
              animated={assessment.smartStatus !== "optimal-now"}
            />
          </div>
        </>
      )}

      {/* Recommendation block */}
      {isPurchase && assessment.optimization?.feasible && (
        <RecommendationBlock assessment={assessment} />
      )}

      {/* Trajectory comparison */}
      {isPurchase && (
        <TrajectoryBlock assessment={assessment} />
      )}

      {/* Savings goal: requirement details */}
      {!isPurchase && plan.status !== "reached" && (
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[12px] pt-3 border-t border-blueberry-700/15">
          <Stat
            label="Date projetée au rythme actuel"
            value={
              plan.projectedReachDate
                ? plan.projectedReachDate.toISOString().slice(0, 10)
                : "—"
            }
          />
          <Stat
            label="Effort effectif"
            value={
              plan.declaredMonthly !== null
                ? `${formatEuro(plan.declaredMonthly)}/mois (déclaré)`
                : plan.observedMonthly !== null
                  ? `${formatEuro(plan.observedMonthly)}/mois (observé 90j)`
                  : "—"
            }
          />
        </dl>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-blueberry-700/15">
        {editing ? (
          <>
            <span className="text-[11px] text-blueberry-900/70">
              Si je mets
            </span>
            <div className="w-32">
              <NumberInput
                value={draft || undefined}
                onChange={(v) => setDraft(v ?? 0)}
                autoFocus
              />
            </div>
            <span className="text-[11px] text-blueberry-900/70">€/mois</span>
            <Button variant="lime" onClick={saveOverride}>
              Appliquer
            </Button>
            <Button
              variant="neutral"
              onClick={() => {
                setEditing(false);
                setDraft(goal.monthlyOverride ?? 0);
              }}
            >
              Annuler
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="grape"
              onClick={() => {
                setDraft(goal.monthlyOverride ?? plan.observedMonthly ?? 0);
                setEditing(true);
              }}
            >
              Simuler un effort différent
            </Button>
            {goal.monthlyOverride !== undefined && (
              <Button variant="neutral" onClick={clearOverride}>
                Reset (utiliser l&apos;observation)
              </Button>
            )}
            {isPurchase && (
              <Button
                variant="blueberry"
                onClick={() => setOptimizerOpen((v) => !v)}
              >
                {optimizerOpen
                  ? "Fermer l'optimiseur"
                  : "Ajuster les paramètres"}
              </Button>
            )}
          </>
        )}
      </div>

      {optimizerOpen && (
        <LoanOptimizerPanel
          goal={goal}
          onClose={() => setOptimizerOpen(false)}
        />
      )}

      {goal.notes && (
        <div className="mt-3 text-[11.5px] text-blueberry-900/55 italic">
          {goal.notes}
        </div>
      )}
    </Card>
  );
}

function RecommendationBlock({
  assessment,
}: {
  assessment: GoalAssessment;
}) {
  if (!assessment.optimization?.feasible) return null;
  const opt = assessment.optimization.scenarios.optimal;
  const cash = assessment.optimization.scenarios.cashOnly;
  const isLeverage = opt.loanAmount > 0;

  return (
    <div className="mt-4 pt-3 border-t border-blueberry-700/15">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/80 mb-2">
        ◆ Recommandation
      </div>
      <div className="rounded-[12px] bg-blueberry-100/40 border border-blueberry-700/25 px-4 py-3">
        <div className="text-[12.5px] font-bold text-blueberry-900 mb-2">
          {isLeverage ? (
            <>
              💡 Apport <span className="num">{formatEuro(opt.downPayment)}</span>{" "}
              + emprunte <span className="num">{formatEuro(opt.loanAmount)}</span>{" "}
              sur {opt.loanDurationMonths} mois à{" "}
              {(opt.creditRate * 100).toFixed(2)}%
            </>
          ) : (
            <>
              💰 Paie cash <span className="num">{formatEuro(opt.downPayment)}</span>{" "}
              (le crédit ne rapporte pas vs ton rendement attendu)
            </>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11.5px]">
          <Stat label="Apport" value={formatEuro(opt.downPayment)} />
          <Stat label="Emprunt" value={formatEuro(opt.loanAmount)} />
          <Stat
            label="Mensualité"
            value={
              opt.monthlyPayment > 0
                ? `${formatEuro(opt.monthlyPayment)}/mois`
                : "—"
            }
          />
          <Stat
            label="Intérêts cumulés"
            value={
              opt.totalInterest > 0 ? formatEuro(opt.totalInterest) : "—"
            }
          />
        </div>
        {isLeverage && assessment.loanAdvantageVsCash > 100 && (
          <div className="mt-2.5 text-[11px] text-blueberry-900/75">
            Vs payer cash : <span className="font-bold text-lime-700">+{formatEuro(assessment.loanAdvantageVsCash)}</span>{" "}
            de patrimoine projeté à {assessment.horizonYears} ans (
            {formatEuro(opt.finalWealth)} vs {formatEuro(cash.finalWealth)}).
          </div>
        )}
      </div>
    </div>
  );
}

function TrajectoryBlock({
  assessment,
}: {
  assessment: GoalAssessment;
}) {
  const cost = assessment.opportunityCostOptimal;
  const skip = assessment.wealthIfSkip;
  const buy = assessment.wealthIfBuyOptimal;
  const pctLost = skip > 0 ? (cost / skip) * 100 : 0;

  let tone: "pos" | "neg" | "neutral" = "neutral";
  if (cost > skip * 0.1) tone = "neg";
  else if (cost < skip * 0.02) tone = "pos";

  return (
    <div className="mt-4 pt-3 border-t border-blueberry-700/15">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/80 mb-2">
        ◆ Coût trajectoire ({assessment.horizonYears} ans, rendement{" "}
        {(0.07 * 100).toFixed(0)}%/an attendu)
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/65">
            Si tu n&apos;achètes pas
          </div>
          <div className="num text-[14px] font-bold text-blueberry-900 mt-0.5">
            {formatEuro(skip)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/65">
            Si tu achètes (mix optimal)
          </div>
          <div className="num text-[14px] font-bold text-blueberry-900 mt-0.5">
            {formatEuro(buy)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/65">
            Coût trajectoire
          </div>
          <div
            className={cn(
              "num text-[14px] font-bold mt-0.5",
              tone === "neg"
                ? "text-strawberry-700"
                : tone === "pos"
                  ? "text-lime-700"
                  : "text-blueberry-900",
            )}
          >
            {cost >= 0 ? "−" : "+"}
            {formatEuro(Math.abs(cost))}
            {Number.isFinite(pctLost) && (
              <span className="text-[11px] font-bold ml-1">
                ({cost >= 0 ? "−" : "+"}
                {Math.abs(pctLost).toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
      </div>
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
  return (
    <div>
      <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/70">
        {label}
      </div>
      <div
        className={cn(
          "num mt-0.5",
          bold ? "text-[14px] font-bold" : "text-[12.5px]",
          tone === "pos"
            ? "text-lime-700"
            : tone === "neg"
              ? "text-strawberry-700"
              : "text-blueberry-900",
        )}
      >
        {value}
      </div>
    </div>
  );
}
