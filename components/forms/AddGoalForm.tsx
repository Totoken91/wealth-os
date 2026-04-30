"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";
import { planForGoal, type GoalPlan } from "@/lib/finance";
import { formatEuro } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import type { AppState, Goal } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Nom requis"),
  targetAmount: z.coerce.number().positive("Montant > 0"),
  targetDate: z.string().min(1, "Date requise"),
  source: z.enum(["cash", "investment", "mixed"]),
  borrowAmount: z.coerce.number().min(0).optional(),
  monthlyOverride: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const initial: FormValues = {
  name: "",
  targetAmount: 0,
  targetDate: "",
  source: "mixed",
  borrowAmount: undefined,
  monthlyOverride: undefined,
  notes: "",
};

interface Props {
  onCreated?: () => void;
}

const SOURCE_LABEL: Record<FormValues["source"], string> = {
  cash: "cash uniquement",
  investment: "investissements (ETF + actions + crypto)",
  mixed: "tout le patrimoine",
};

export function AddGoalForm({ onCreated }: Props) {
  const addGoal = useWealthStore((s) => s.addGoal);

  // Read full state slice for plan computation
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

  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>(
    {},
  );

  const update = <K extends keyof FormValues>(key: K, v: FormValues[K]) =>
    setValues((s) => ({ ...s, [key]: v }));

  // Live plan: build a draft Goal from current form values
  const draftPlan = useMemo<GoalPlan | null>(() => {
    if (
      !values.targetDate ||
      !values.targetAmount ||
      values.targetAmount <= 0
    ) {
      return null;
    }
    const draftGoal: Goal = {
      id: "__draft__",
      name: values.name || "Brouillon",
      targetAmount: values.targetAmount,
      targetDate: values.targetDate,
      source: values.source,
      borrowAmount: values.borrowAmount,
      monthlyOverride: values.monthlyOverride,
      createdAt: new Date().toISOString(),
    };
    try {
      return planForGoal(draftGoal, state);
    } catch {
      return null;
    }
  }, [values, state]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(values);
    if (!result.success) {
      const flat: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as keyof FormValues;
        if (path) flat[path] = issue.message;
      }
      setErrors(flat);
      return;
    }
    setErrors({});
    addGoal({
      name: result.data.name,
      targetAmount: result.data.targetAmount,
      targetDate: result.data.targetDate,
      source: result.data.source,
      borrowAmount:
        result.data.borrowAmount && result.data.borrowAmount > 0
          ? result.data.borrowAmount
          : undefined,
      monthlyOverride:
        result.data.monthlyOverride && result.data.monthlyOverride > 0
          ? result.data.monthlyOverride
          : undefined,
      notes: result.data.notes || undefined,
    });
    toast.success("Objectif ajouté", { description: result.data.name });
    setValues(initial);
    onCreated?.();
  };

  return (
    <Card header="Nouvel objectif">
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Nom" hint={errors.name} className="sm:col-span-2">
          <Input
            placeholder="Acompte appartement"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            className={errors.name ? "border-strawberry-600" : undefined}
          />
        </Field>
        <Field label="Source">
          <Select
            value={values.source}
            onChange={(e) =>
              update("source", e.target.value as FormValues["source"])
            }
          >
            <option value="mixed">Tout le patrimoine</option>
            <option value="investment">Investissements (ETF + actions + crypto)</option>
            <option value="cash">Cash uniquement</option>
          </Select>
        </Field>
        <Field label="Montant cible (€)" hint={errors.targetAmount}>
          <NumberInput
            value={values.targetAmount || undefined}
            onChange={(v) => update("targetAmount", (v ?? 0) as never)}
            className={errors.targetAmount ? "border-strawberry-600" : undefined}
          />
        </Field>
        <Field label="Date cible" hint={errors.targetDate}>
          <Input
            mono
            type="date"
            value={values.targetDate}
            onChange={(e) => update("targetDate", e.target.value)}
            className={errors.targetDate ? "border-strawberry-600" : undefined}
          />
        </Field>
        <Field
          label="Apport emprunté (€)"
          hint="Montant non épargné, ex: 15000 pour un crédit voiture"
        >
          <NumberInput
            value={values.borrowAmount}
            onChange={(v) => update("borrowAmount", v as never)}
            placeholder="0"
          />
        </Field>
        <Field
          label="Override épargne mensuelle (€)"
          hint="Vide = utilise ton épargne observée des 90 derniers jours"
        >
          <NumberInput
            value={values.monthlyOverride}
            onChange={(v) => update("monthlyOverride", v as never)}
            placeholder="auto"
          />
        </Field>
        <Field label="Notes (optionnel)">
          <Input
            value={values.notes ?? ""}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>

        {/* Live feasibility panel */}
        <div className="sm:col-span-3">
          <FeasibilityPanel
            plan={draftPlan}
            sourceLabel={SOURCE_LABEL[values.source]}
            annualReturn={settings.defaultAnnualReturn}
            borrowAmount={values.borrowAmount}
            onApplySuggestion={(patch) =>
              setValues((s) => ({ ...s, ...patch }))
            }
          />
        </div>

        <div className="sm:col-span-3 flex justify-end">
          <Button type="submit" variant="tangerine">
            Ajouter l&apos;objectif
          </Button>
        </div>
      </form>
    </Card>
  );
}

function FeasibilityPanel({
  plan,
  sourceLabel,
  annualReturn,
  borrowAmount,
  onApplySuggestion,
}: {
  plan: GoalPlan | null;
  sourceLabel: string;
  annualReturn: number;
  borrowAmount?: number;
  onApplySuggestion: (
    patch: Partial<{ targetDate: string; monthlyOverride: number }>,
  ) => void;
}) {
  if (!plan) {
    return (
      <div className="rounded-[12px] bg-white/55 border border-blueberry-700/20 px-4 py-3 text-[12px] text-blueberry-900/65">
        ◆ Renseigne montant cible + date pour voir la faisabilité en temps
        réel (effort mensuel requis, écart vs ton épargne observée, scénarios
        alternatifs).
      </div>
    );
  }

  const months = Math.max(0, Math.round(plan.monthsToTarget));
  const observed = plan.observedMonthly ?? 0;
  const declared = plan.declaredMonthly;
  const effective = plan.effectiveMonthly;
  const required = plan.requiredMonthly;
  const gap = required - effective;
  const onTrack = gap <= 0 || plan.status === "reached";

  // Suggestion 1: bump the date to make the plan feasible at observed rate
  const monthsAtObserved =
    observed > 0
      ? plan.remaining > 0
        ? Math.ceil(plan.remaining / observed)
        : 0
      : null;
  const suggestedDate =
    monthsAtObserved !== null && monthsAtObserved > months
      ? new Date(Date.now() + monthsAtObserved * 30.4375 * 86_400_000)
          .toISOString()
          .slice(0, 10)
      : null;

  // Suggestion 2: bump monthly to the required level
  const suggestedMonthly =
    required > effective ? Math.ceil(required) : null;

  return (
    <div
      className={cn(
        "rounded-[12px] px-4 py-3 border text-[12px]",
        plan.status === "reached"
          ? "bg-lime-100/40 border-lime-700/30 text-lime-900"
          : onTrack
            ? "bg-lime-100/30 border-lime-700/25 text-lime-900"
            : "bg-tangerine-100/40 border-tangerine-700/30 text-tangerine-900",
      )}
    >
      <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] mb-2">
        ◆ Faisabilité en direct ({sourceLabel}, rendement {(annualReturn * 100).toFixed(1)}%/an)
      </div>

      {plan.status === "reached" ? (
        <div className="text-[12.5px] font-bold">
          ✓ Cible déjà atteinte avec ton patrimoine actuel ({formatEuro(plan.currentAmount)} ≥ {formatEuro(plan.effectiveTarget)})
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
            <Stat label="Patrimoine actuel" value={formatEuro(plan.currentAmount)} />
            <Stat
              label={`Cible ${borrowAmount && borrowAmount > 0 ? "à épargner" : ""}`}
              value={formatEuro(plan.effectiveTarget)}
            />
            <Stat label="Manque" value={formatEuro(plan.remaining)} />
            <Stat label="Mois restants" value={`${months} mois`} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
            <Stat
              label="Effort requis"
              value={`${formatEuro(required)}/mois`}
              tone="strong"
            />
            <Stat
              label={
                declared
                  ? "Override (déclaré)"
                  : "Épargne observée 90j"
              }
              value={`${formatEuro(effective)}/mois`}
            />
            <Stat
              label={onTrack ? "Marge" : "Manque"}
              value={`${gap >= 0 ? "+" : ""}${formatEuro(Math.abs(gap))}/mois`}
              tone={onTrack ? "pos" : "neg"}
            />
          </div>

          {plan.projectedReachDate && (
            <div className="text-[11.5px] mt-1.5">
              Au rythme actuel ({formatEuro(effective)}/mois), tu atteins
              la cible le{" "}
              <span className="font-mono font-bold">
                {plan.projectedReachDate.toISOString().slice(0, 10)}
              </span>
              {plan.daysAhead !== null && (
                <span>
                  {" "}
                  ({plan.daysAhead >= 0
                    ? `${plan.daysAhead}j d'avance`
                    : `${-plan.daysAhead}j de retard`})
                </span>
              )}
              .
            </div>
          )}

          {!onTrack && (
            <div className="mt-3 pt-3 border-t border-tangerine-700/20">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] mb-2">
                Suggestions
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedDate && (
                  <Button
                    type="button"
                    variant="neutral"
                    onClick={() =>
                      onApplySuggestion({ targetDate: suggestedDate })
                    }
                  >
                    Repousser la date à {suggestedDate}
                  </Button>
                )}
                {suggestedMonthly && (
                  <Button
                    type="button"
                    variant="neutral"
                    onClick={() =>
                      onApplySuggestion({ monthlyOverride: suggestedMonthly })
                    }
                  >
                    Forcer l&apos;épargne à {formatEuro(suggestedMonthly)}/mois
                  </Button>
                )}
              </div>
              <div className="text-[10.5px] mt-2 text-tangerine-900/75 italic">
                💡 Une fois créé, l&apos;objectif aura un bouton « Optimiser
                le financement » pour comparer cash vs crédit avec un grid
                search complet.
              </div>
            </div>
          )}
        </>
      )}
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
  tone?: "pos" | "neg" | "strong";
}) {
  return (
    <div>
      <div className="text-[9.5px] font-extrabold uppercase tracking-[0.08em] opacity-75">
        {label}
      </div>
      <div
        className={cn(
          "num font-mono tabular-nums mt-0.5",
          tone === "strong"
            ? "text-[14px] font-bold"
            : tone === "pos"
              ? "text-[12.5px] font-bold text-lime-700"
              : tone === "neg"
                ? "text-[12.5px] font-bold text-strawberry-700"
                : "text-[12.5px]",
        )}
      >
        {value}
      </div>
    </div>
  );
}
