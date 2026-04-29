"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { GoalPlan } from "@/lib/finance";
import { formatEuro } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import type { Goal } from "@/types";

interface Props {
  goal: Goal;
  plan: GoalPlan;
}

const SOURCE_LABEL: Record<Goal["source"], string> = {
  cash: "Cash uniquement",
  investment: "Investissements",
  mixed: "Patrimoine total",
};

const STATUS_LABEL: Record<GoalPlan["status"], string> = {
  reached: "✓ Atteint",
  ahead: "En avance",
  "on-track": "Sur la trajectoire",
  behind: "En retard",
  unreachable: "Non atteignable au rythme actuel",
  unknown: "Pas assez de données",
};

const STATUS_TONE: Record<GoalPlan["status"], string> = {
  reached:
    "bg-gradient-to-b from-[#c8f0a0] via-[#7ac848] to-[#5aa830] text-[#1a4a08]",
  ahead:
    "bg-gradient-to-b from-[#c8f0a0] via-[#7ac848] to-[#5aa830] text-[#1a4a08]",
  "on-track":
    "bg-gradient-to-b from-[#b8e0f8] via-[#6ab4e0] to-[#3a8acc] text-[#0a3a6a]",
  behind:
    "bg-gradient-to-b from-[#ffb4be] via-[#e84858] to-[#a02030] text-[#5a0a18]",
  unreachable:
    "bg-gradient-to-b from-[#ffb4be] via-[#e84858] to-[#a02030] text-[#5a0a18]",
  unknown:
    "bg-gradient-to-b from-[#fafafa] via-[#d8d8d8] to-[#c0c0c0] text-[#1a1a1a]",
};

function formatProjectedDate(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

function formatDaysAhead(daysAhead: number | null): string {
  if (daysAhead === null) return "—";
  if (daysAhead === 0) return "pile à l'heure";
  return daysAhead > 0
    ? `+${daysAhead} j d'avance`
    : `${daysAhead} j de retard`;
}

export function GoalCard({ goal, plan }: Props) {
  const updateGoal = useWealthStore((s) => s.updateGoal);
  const deleteGoal = useWealthStore((s) => s.deleteGoal);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal.monthlyOverride ?? 0);

  const pct =
    plan.effectiveTarget > 0
      ? Math.min(100, (plan.currentAmount / plan.effectiveTarget) * 100)
      : 0;

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

  const effectiveLabel =
    plan.declaredMonthly !== null
      ? `${formatEuro(plan.declaredMonthly)}/mois (déclaré)`
      : plan.observedMonthly !== null
        ? `${formatEuro(plan.observedMonthly)}/mois (observé 90j)`
        : "—";

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
                {" · emprunt prévu "}
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

      <div className="mt-4 flex items-baseline justify-between">
        <div>
          <span className="num font-sans text-[28px] font-extralight text-blueberry-900 leading-none">
            {formatEuro(plan.currentAmount)}
          </span>
          <span className="num text-[13px] text-blueberry-900/55 ml-2">
            / {formatEuro(plan.effectiveTarget)}
          </span>
        </div>
        <span className="num text-[12px] font-bold text-blueberry-800">
          {pct.toFixed(1)}%
        </span>
      </div>

      <div className="mt-2">
        <ProgressBar
          value={pct}
          flavor="tangerine"
          animated={plan.status !== "reached"}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-block px-3 py-[5px] rounded-[14px] text-[11px] font-bold border border-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.1)] [text-shadow:0_1px_0_rgba(255,255,255,0.4)]",
            STATUS_TONE[plan.status],
          )}
        >
          {STATUS_LABEL[plan.status]}
        </span>
        {plan.status !== "reached" &&
          plan.status !== "unknown" &&
          plan.daysAhead !== null && (
            <span className="text-[11.5px] text-blueberry-900/65">
              {formatDaysAhead(plan.daysAhead)} sur la cible
            </span>
          )}
      </div>

      {plan.status !== "reached" && (
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
          <Stat
            label="Requis pour tenir la date"
            value={`${formatEuro(plan.requiredMonthly)}/mois`}
            tone="strong"
          />
          <Stat label="Effort effectif" value={effectiveLabel} />
          <Stat
            label="Date projetée"
            value={formatProjectedDate(plan.projectedReachDate)}
          />
          <Stat label="Reste à épargner" value={formatEuro(plan.remaining)} />
        </dl>
      )}

      {plan.status !== "reached" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-blueberry-700/15">
          {editing ? (
            <>
              <span className="text-[11px] text-blueberry-900/70">
                Si je mets
              </span>
              <div className="w-32">
                <Input
                  mono
                  type="number"
                  step="50"
                  value={draft || ""}
                  onChange={(e) => setDraft(Number(e.target.value))}
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
            </>
          )}
        </div>
      )}

      {goal.notes && (
        <div className="mt-3 text-[11.5px] text-blueberry-900/55 italic">
          {goal.notes}
        </div>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "strong";
}) {
  return (
    <div>
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/70">
        {label}
      </dt>
      <dd
        className={cn(
          "num mt-0.5 text-blueberry-900",
          tone === "strong" ? "text-[15px] font-bold" : "text-[13px]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
