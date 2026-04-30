"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";
import { useWealthStore } from "@/lib/store";
import type { TransactionType } from "@/types";

const schema = z
  .object({
    holdingId: z.string().min(1, "Position requise"),
    type: z.enum(["buy", "sell"]),
    date: z.string().min(1, "Date requise"),
    quantity: z.coerce.number().positive("Quantité > 0"),
    pricePerUnit: z.coerce.number().positive("Prix > 0"),
    fees: z.coerce.number().min(0, "Frais ≥ 0"),
    exchangeRate: z.coerce.number().positive().optional(),
    notes: z.string().optional(),
  });

type FormValues = z.infer<typeof schema>;

const todayIso = () => new Date().toISOString().slice(0, 10);

const initial = (firstHoldingId: string): FormValues => ({
  holdingId: firstHoldingId,
  type: "buy",
  date: todayIso(),
  quantity: 0,
  pricePerUnit: 0,
  fees: 0,
  exchangeRate: undefined,
  notes: "",
});

interface Props {
  /** Pre-select and lock the position (used from a position detail page). */
  holdingId?: string;
  onCreated?: () => void;
}

export function AddTransactionForm({ holdingId, onCreated }: Props = {}) {
  const holdings = useWealthStore((s) => s.holdings);
  const settingsRate = useWealthStore((s) => s.settings.currentEurUsdRate);
  const addTransaction = useWealthStore((s) => s.addTransaction);

  const firstId = holdingId ?? holdings[0]?.id ?? "";
  const [values, setValues] = useState<FormValues>(() => initial(firstId));
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormValues, string>>
  >({});

  useEffect(() => {
    if (!values.holdingId && firstId) {
      setValues((s) => ({ ...s, holdingId: firstId }));
    }
  }, [firstId, values.holdingId]);

  const selectedHolding = useMemo(
    () => holdings.find((h) => h.id === values.holdingId),
    [holdings, values.holdingId],
  );
  const requireRate = selectedHolding?.currency === "USD";

  // Auto-fill exchange rate from settings when switching to a USD holding
  useEffect(() => {
    if (requireRate && values.exchangeRate === undefined && settingsRate) {
      setValues((s) => ({ ...s, exchangeRate: settingsRate }));
    }
  }, [requireRate, settingsRate, values.exchangeRate]);

  const update = <K extends keyof FormValues>(key: K, v: FormValues[K]) =>
    setValues((s) => ({ ...s, [key]: v }));

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const candidate = { ...values };
    if (!requireRate) candidate.exchangeRate = undefined;

    const result = schema.safeParse(candidate);
    if (!result.success) {
      const flat: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as keyof FormValues;
        if (path) flat[path] = issue.message;
      }
      setErrors(flat);
      return;
    }
    if (requireRate && !result.data.exchangeRate) {
      setErrors({ exchangeRate: "Taux requis pour les positions USD" });
      return;
    }
    setErrors({});
    addTransaction({
      holdingId: result.data.holdingId,
      type: result.data.type as TransactionType,
      date: result.data.date,
      quantity: result.data.quantity,
      pricePerUnit: result.data.pricePerUnit,
      fees: result.data.fees,
      exchangeRate: result.data.exchangeRate,
      notes: result.data.notes || undefined,
    });
    toast.success("Transaction enregistrée", {
      description: `${result.data.type === "buy" ? "Achat" : "Vente"} ${result.data.quantity} × ${selectedHolding?.ticker ?? "?"}`,
    });
    setValues(initial(holdingId ?? values.holdingId));
    onCreated?.();
  };

  if (holdings.length === 0) {
    return (
      <Card header="Saisir une transaction">
        <p className="text-[13px] text-blueberry-900/70">
          Crée d&apos;abord une position ci-dessus.
        </p>
      </Card>
    );
  }

  return (
    <Card header="Saisir une transaction">
      <form
        onSubmit={submit}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <Field label="Date" hint={errors.date} className="col-span-2 sm:col-span-1">
          <Input
            mono
            type="date"
            value={values.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </Field>
        <Field label="Position" hint={errors.holdingId} className="col-span-2">
          <Select
            value={values.holdingId}
            onChange={(e) => update("holdingId", e.target.value)}
            disabled={!!holdingId}
          >
            {holdings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.ticker} — {h.name} ({h.currency})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type" className="col-span-1">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={values.type === "buy" ? "lime" : "neutral"}
              onClick={() => update("type", "buy")}
              className="flex-1"
            >
              Achat
            </Button>
            <Button
              type="button"
              variant={values.type === "sell" ? "tangerine" : "neutral"}
              onClick={() => update("type", "sell")}
              className="flex-1"
            >
              Vente
            </Button>
          </div>
        </Field>
        <Field label="Quantité" hint={errors.quantity}>
          <NumberInput
            value={values.quantity || undefined}
            onChange={(v) => update("quantity", (v ?? 0) as never)}
            className={errors.quantity ? "border-strawberry-600" : undefined}
          />
        </Field>
        <Field
          label={`Prix unitaire (${selectedHolding?.currency ?? "EUR"})`}
          hint={errors.pricePerUnit}
        >
          <NumberInput
            value={values.pricePerUnit || undefined}
            onChange={(v) => update("pricePerUnit", (v ?? 0) as never)}
            className={errors.pricePerUnit ? "border-strawberry-600" : undefined}
          />
        </Field>
        <Field label="Frais (€)" hint={errors.fees}>
          <NumberInput
            value={values.fees || undefined}
            onChange={(v) => update("fees", (v ?? 0) as never)}
            className={errors.fees ? "border-strawberry-600" : undefined}
          />
        </Field>
        {requireRate && (
          <Field
            label="Taux EUR/USD"
            hint={
              errors.exchangeRate ??
              (settingsRate
                ? "Pré-rempli depuis les Préférences — ajuste pour la date d'achat"
                : "EUR par 1 USD à la date d'achat (requis)")
            }
          >
            <NumberInput
              value={values.exchangeRate}
              onChange={(v) => update("exchangeRate", v as never)}
              className={
                errors.exchangeRate ? "border-strawberry-600" : undefined
              }
            />
          </Field>
        )}
        <Field label="Notes (optionnel)" className="col-span-2 sm:col-span-4">
          <Input
            value={values.notes ?? ""}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>
        <div className="col-span-2 sm:col-span-4 flex items-center justify-between">
          <span className="text-[11px] text-blueberry-900/55">
            Astuce : <kbd className="px-1.5 py-0.5 rounded border border-blueberry-700/30 bg-white/70 font-mono text-[10px]">Ctrl</kbd>
            {" + "}
            <kbd className="px-1.5 py-0.5 rounded border border-blueberry-700/30 bg-white/70 font-mono text-[10px]">Entrée</kbd>
            {" "}pour enregistrer
          </span>
          <Button type="submit" variant="tangerine">
            Enregistrer
          </Button>
        </div>
      </form>
    </Card>
  );
}
