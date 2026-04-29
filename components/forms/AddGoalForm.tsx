"use client";

import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useWealthStore } from "@/lib/store";

const schema = z.object({
  name: z.string().min(1, "Nom requis"),
  targetAmount: z.coerce.number().positive("Montant > 0"),
  targetDate: z.string().min(1, "Date requise"),
  source: z.enum(["cash", "investment", "mixed"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const initial: FormValues = {
  name: "",
  targetAmount: 0,
  targetDate: "",
  source: "mixed",
  notes: "",
};

interface Props {
  onCreated?: () => void;
}

export function AddGoalForm({ onCreated }: Props) {
  const addGoal = useWealthStore((s) => s.addGoal);
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>(
    {},
  );

  const update = <K extends keyof FormValues>(key: K, v: FormValues[K]) =>
    setValues((s) => ({ ...s, [key]: v }));

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
          <Input
            mono
            type="number"
            step="100"
            value={values.targetAmount || ""}
            onChange={(e) =>
              update("targetAmount", Number(e.target.value) as never)
            }
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
        <Field label="Notes (optionnel)">
          <Input
            value={values.notes ?? ""}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>
        <div className="sm:col-span-3 flex justify-end">
          <Button type="submit" variant="tangerine">
            Ajouter l&apos;objectif
          </Button>
        </div>
      </form>
    </Card>
  );
}
