"use client";

import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useWealthStore } from "@/lib/store";
import type { DcaCadence } from "@/types";

const schema = z.object({
  holdingId: z.string().min(1, "Position requise"),
  amount: z.coerce.number().positive("Montant > 0"),
  cadence: z.enum(["weekly", "biweekly", "monthly"]),
  dayOfPeriod: z.coerce.number().min(1).max(31),
  startDate: z.string().min(1, "Date requise"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const todayIso = () => new Date().toISOString().slice(0, 10);

const initial = (firstHoldingId: string): FormValues => ({
  holdingId: firstHoldingId,
  amount: 0,
  cadence: "weekly",
  dayOfPeriod: 1,
  startDate: todayIso(),
  notes: "",
});

interface Props {
  onCreated?: () => void;
}

export function AddDcaRuleForm({ onCreated }: Props) {
  const holdings = useWealthStore((s) => s.holdings);
  const addDcaRule = useWealthStore((s) => s.addDcaRule);

  const firstId = holdings[0]?.id ?? "";
  const [values, setValues] = useState<FormValues>(() => initial(firstId));
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormValues, string>>
  >({});

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
    addDcaRule({
      enabled: true,
      holdingId: result.data.holdingId,
      amount: result.data.amount,
      cadence: result.data.cadence as DcaCadence,
      dayOfPeriod: result.data.dayOfPeriod,
      startDate: result.data.startDate,
      notes: result.data.notes || undefined,
    });
    toast.success("Règle DCA ajoutée");
    setValues(initial(values.holdingId));
    onCreated?.();
  };

  if (holdings.length === 0) {
    return null;
  }

  const isWeekly =
    values.cadence === "weekly" || values.cadence === "biweekly";
  const dayMax = isWeekly ? 7 : 28;
  const dayLabel = isWeekly ? "Jour de la semaine (1=lun … 7=dim)" : "Jour du mois (1-28)";

  return (
    <Card header="Nouvelle règle DCA">
      <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Position" hint={errors.holdingId} className="col-span-2">
          <Select
            value={values.holdingId}
            onChange={(e) => update("holdingId", e.target.value)}
          >
            {holdings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.ticker} — {h.name} ({h.currency})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Montant (€)" hint={errors.amount}>
          <Input
            mono
            type="number"
            step="10"
            value={values.amount || ""}
            onChange={(e) =>
              update("amount", Number(e.target.value) as never)
            }
            className={errors.amount ? "border-strawberry-600" : undefined}
          />
        </Field>
        <Field label="Cadence">
          <Select
            value={values.cadence}
            onChange={(e) => {
              const c = e.target.value as DcaCadence;
              update("cadence", c);
              if (
                (c === "weekly" || c === "biweekly") &&
                values.dayOfPeriod > 7
              ) {
                update("dayOfPeriod", 1);
              }
            }}
          >
            <option value="weekly">Hebdomadaire</option>
            <option value="biweekly">Bimensuelle (15j)</option>
            <option value="monthly">Mensuelle</option>
          </Select>
        </Field>
        <Field label={dayLabel} hint={errors.dayOfPeriod}>
          <Input
            mono
            type="number"
            min="1"
            max={dayMax}
            value={values.dayOfPeriod}
            onChange={(e) =>
              update("dayOfPeriod", Number(e.target.value) as never)
            }
          />
        </Field>
        <Field label="Démarre le" hint={errors.startDate}>
          <Input
            mono
            type="date"
            value={values.startDate}
            onChange={(e) => update("startDate", e.target.value)}
          />
        </Field>
        <Field label="Notes (optionnel)" className="col-span-2">
          <Input
            value={values.notes ?? ""}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>
        <div className="col-span-2 sm:col-span-4 flex justify-end">
          <Button type="submit" variant="lime">
            Créer la règle
          </Button>
        </div>
      </form>
    </Card>
  );
}
