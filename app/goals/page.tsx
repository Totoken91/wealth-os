"use client";

import { useMemo, useState } from "react";
import { AddGoalForm } from "@/components/forms/AddGoalForm";
import { GoalCard } from "@/components/goals/GoalCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { calculateBreakdown } from "@/lib/finance";
import { useWealthStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import type { Goal } from "@/types";

export default function GoalsPage() {
  const hydrated = useHydrated();
  const goals = useWealthStore((s) => s.goals);
  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const vehicles = useWealthStore((s) => s.vehicles);
  const snapshots = useWealthStore((s) => s.snapshots);
  const settings = useWealthStore((s) => s.settings);

  const [showForm, setShowForm] = useState(false);

  const breakdown = useMemo(
    () =>
      calculateBreakdown({
        holdings,
        transactions,
        vehicles,
        snapshots,
        goals,
        settings,
      }),
    [holdings, transactions, vehicles, snapshots, goals, settings],
  );

  const currentFor = (g: Goal): number => {
    if (g.source === "cash") return breakdown.cash;
    if (g.source === "investment")
      return breakdown.etf + breakdown.crypto + breakdown.stock;
    return (
      breakdown.etf +
      breakdown.crypto +
      breakdown.stock +
      breakdown.cash +
      breakdown.vehicles
    );
  };

  const sorted = useMemo(
    () =>
      [...goals].sort((a, b) => a.targetDate.localeCompare(b.targetDate)),
    [goals],
  );

  return (
    <div className="text-blueberry-900">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
        ◆ Wealth OS
      </div>
      <div className="mt-1 mb-6 flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="font-sans text-3xl font-extralight tracking-tight">
          Objectifs
        </h1>
      </div>

      {!hydrated ? (
        <div className="text-blueberry-900/60 text-sm">Chargement…</div>
      ) : (
        <>
          {!showForm && (
            <div className="mb-4 flex justify-end">
              <Button variant="tangerine" onClick={() => setShowForm(true)}>
                + Nouvel objectif
              </Button>
            </div>
          )}

          {showForm && (
            <AddGoalForm onCreated={() => setShowForm(false)} />
          )}

          {sorted.length === 0 && !showForm ? (
            <Card header="Aucun objectif">
              <p className="text-[13px] text-blueberry-900/70">
                Définis un objectif (apport immo, voyage, retraite anticipée…) :
                Wealth OS calcule la cadence mensuelle nécessaire pour
                l&apos;atteindre.
              </p>
            </Card>
          ) : (
            sorted.map((g) => (
              <GoalCard key={g.id} goal={g} currentAmount={currentFor(g)} />
            ))
          )}
        </>
      )}
    </div>
  );
}
