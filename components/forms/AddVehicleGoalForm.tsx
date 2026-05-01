"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import {
  VehicleCatalogPicker,
  type PickerSelection,
} from "@/components/forms/VehicleCatalogPicker";
import { simulatePurchaseTimeline } from "@/lib/finance";
import { formatEuro } from "@/lib/formatters";
import { useWealthStore } from "@/lib/store";
import type { AppState } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  onCreated?: () => void;
}

export function AddVehicleGoalForm({ onCreated }: Props) {
  const addGoal = useWealthStore((s) => s.addGoal);

  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const vehicles = useWealthStore((s) => s.vehicles);
  const accounts = useWealthStore((s) => s.accounts);
  const snapshots = useWealthStore((s) => s.snapshots);
  const goals = useWealthStore((s) => s.goals);
  const dcaRules = useWealthStore((s) => s.dcaRules);
  const settings = useWealthStore((s) => s.settings);

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

  const [pick, setPick] = useState<PickerSelection | null>(null);
  const [deadline, setDeadline] = useState<string>("");
  const [tolerancePct, setTolerancePct] = useState<number>(10);

  // Live preview computation
  const preview = useMemo(() => {
    if (!pick) return null;
    const monthsUntilDeadline = (() => {
      if (!deadline) return undefined;
      const target = new Date(deadline);
      const now = new Date();
      const months =
        (target.getFullYear() - now.getFullYear()) * 12 +
        (target.getMonth() - now.getMonth());
      return Math.max(0, months);
    })();
    return simulatePurchaseTimeline(state, {
      vehiclePrice: pick.msrpEur,
      tolerancePct: tolerancePct / 100,
      monthsUntilDeadline,
    });
  }, [pick, deadline, tolerancePct, state]);

  const submit = () => {
    if (!pick) {
      toast.error("Choisis un modèle dans le catalogue d'abord");
      return;
    }
    // Default deadline = recommended date + 6 months margin, or 5 years if none
    let resolvedDeadline = deadline;
    if (!resolvedDeadline) {
      const recM = preview?.recommendedMonth ?? 36;
      const d = new Date();
      d.setMonth(d.getMonth() + recM + 12);
      resolvedDeadline = d.toISOString().slice(0, 10);
    }
    addGoal({
      name: pick.name,
      targetAmount: pick.msrpEur,
      targetDate: resolvedDeadline,
      source: "mixed",
      vehicleCatalogId: pick.catalogId,
      vehicleModelYear: pick.modelYear,
      tolerancePct: tolerancePct / 100,
    });
    toast.success("Objectif véhicule créé", {
      description: `${pick.name} — l'app calcule le moment optimal d'achat`,
    });
    setPick(null);
    setDeadline("");
    onCreated?.();
  };

  return (
    <Card header="Nouvel achat véhicule (calcul auto)">
      <div className="space-y-3">
        <p className="text-[12px] text-blueberry-900/70 leading-snug">
          Choisis le modèle. L&apos;app calcule automatiquement le moment optimal
          d&apos;achat selon ton patrimoine, tes DCA, ton rendement attendu et
          ton seuil de tolérance — sans que tu aies à entrer de montant ou
          d&apos;apport.
        </p>

        <VehicleCatalogPicker onPick={setPick} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Deadline (optionnelle)"
            hint="Si tu veux l'avoir avant une date précise. Vide = l'app décide librement."
          >
            <Input
              mono
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </Field>
          <Field
            label={`Seuil de tolérance : ${tolerancePct}% de richesse projetée`}
            hint="Combien tu acceptes de perdre en richesse à 10 ans pour avoir la voiture maintenant. 10% = équilibré, 5% = strict, 20% = je veux vite."
          >
            <NumberInput
              value={tolerancePct}
              onChange={(v) => setTolerancePct(Math.max(0, Math.min(50, v ?? 10)))}
            />
          </Field>
        </div>

        {pick && preview && (
          <div
            className={cn(
              "rounded-[10px] border px-3 py-3 text-[12.5px]",
              preview.recommendedMonth === 0
                ? "bg-lime-100/40 border-lime-700/30 text-lime-900"
                : preview.recommendedMonth !== null
                  ? "bg-blueberry-100/30 border-blueberry-700/25 text-blueberry-900"
                  : "bg-strawberry-100/35 border-strawberry-700/30 text-strawberry-900",
            )}
          >
            <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] mb-1.5">
              ◆ Préviz du timing optimal
            </div>
            {preview.recommendedMonth === 0 ? (
              <div>
                ✓ Tu peux acheter <strong>maintenant</strong> sans dégrader
                significativement tes finances futures.
              </div>
            ) : preview.recommendedMonth !== null ? (
              <div>
                Date optimale recommandée :{" "}
                <strong>
                  dans {preview.recommendedMonth} mois ({addMonthsLabel(preview.recommendedMonth)})
                </strong>
                . À cette date, l&apos;app projette une dégradation de richesse
                à 10 ans de{" "}
                <strong>
                  {(preview.points[preview.recommendedMonth].trajectoryCostPct * 100).toFixed(1)}%
                </strong>
                {" "}vs ne jamais acheter (sous ton seuil de {tolerancePct}%).
              </div>
            ) : (
              <div>
                ⚠ Aucune date faisable dans les {preview.points.length - 1} prochains
                mois — augmente ton épargne, baisse la cible, ou agrandis le seuil.
              </div>
            )}
            {preview.minFeasibleMonth !== null &&
              preview.minFeasibleMonth !== preview.recommendedMonth && (
                <div className="mt-1 text-[11.5px] opacity-80">
                  ↪ Minimum faisable (sans tolérance) : dans{" "}
                  {preview.minFeasibleMonth} mois.
                </div>
              )}
            {preview.cashFullMonth !== null && (
              <div className="mt-1 text-[11.5px] opacity-80">
                ↪ Tu peux payer cash sans crédit dans : {preview.cashFullMonth} mois.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button
            variant="tangerine"
            onClick={submit}
            disabled={!pick}
          >
            Créer l&apos;objectif
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** Approximate label for a date offset by N months. */
function addMonthsLabel(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleString("fr-FR", { month: "long", year: "numeric" });
}

void formatEuro;
