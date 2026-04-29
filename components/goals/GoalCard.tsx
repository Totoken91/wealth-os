"use client";

import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatEuro } from "@/lib/formatters";
import { useWealthStore } from "@/lib/store";
import type { Goal } from "@/types";

interface Props {
  goal: Goal;
  currentAmount: number;
}

const SOURCE_LABEL: Record<Goal["source"], string> = {
  cash: "Cash uniquement",
  investment: "Investissements",
  mixed: "Patrimoine total",
};

export function GoalCard({ goal, currentAmount }: Props) {
  const deleteGoal = useWealthStore((s) => s.deleteGoal);

  const targetMs = new Date(goal.targetDate).getTime();
  const nowMs = Date.now();
  const monthsLeft = Math.max(
    0,
    (targetMs - nowMs) / (1000 * 60 * 60 * 24 * 30.44),
  );
  const remaining = Math.max(0, goal.targetAmount - currentAmount);
  const monthlyNeeded = monthsLeft > 0 ? remaining / monthsLeft : remaining;
  const pct = Math.min(
    100,
    goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0,
  );
  const reached = currentAmount >= goal.targetAmount;
  const overdue = monthsLeft === 0 && !reached;

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
            {reached && (
              <span className="ml-2 font-bold text-lime-700">✓ Atteint</span>
            )}
            {overdue && (
              <span className="ml-2 font-bold text-strawberry-700">
                Échéance dépassée
              </span>
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

      <div className="mt-4 flex items-baseline justify-between">
        <div>
          <span className="num font-sans text-[28px] font-extralight text-blueberry-900 leading-none">
            {formatEuro(currentAmount)}
          </span>
          <span className="num text-[13px] text-blueberry-900/55 ml-2">
            / {formatEuro(goal.targetAmount)}
          </span>
        </div>
        <span className="num text-[12px] font-bold text-blueberry-800">
          {pct.toFixed(1)}%
        </span>
      </div>

      <div className="mt-2">
        <ProgressBar value={pct} flavor="tangerine" animated={!reached} />
      </div>

      {!reached && (
        <div className="mt-3 text-[11.5px] text-blueberry-900/70">
          Manque{" "}
          <span className="num font-bold text-blueberry-900">
            {formatEuro(remaining)}
          </span>{" "}
          {monthsLeft > 0 ? (
            <>
              sur {Math.round(monthsLeft)} mois →{" "}
              <span className="num font-bold text-blueberry-900">
                {formatEuro(monthlyNeeded)}
              </span>
              /mois
            </>
          ) : (
            <span className="text-strawberry-700 font-semibold">
              dès maintenant pour rattraper le retard
            </span>
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
