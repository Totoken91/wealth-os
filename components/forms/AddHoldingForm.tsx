"use client";

import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useWealthStore } from "@/lib/store";
import type { HoldingType } from "@/types";

const schema = z.object({
  type: z.enum(["etf", "crypto", "stock", "cash"]),
  ticker: z.string().min(1, "Ticker requis"),
  name: z.string().min(1, "Nom requis"),
  currency: z.enum(["EUR", "USD"]),
  currentPrice: z.coerce.number().positive("Prix > 0"),
  coingeckoId: z.string().optional(),
  yahooSymbol: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const INIT: FormValues = {
  type: "etf",
  ticker: "",
  name: "",
  currency: "EUR",
  currentPrice: 0,
  coingeckoId: "",
  yahooSymbol: "",
  notes: "",
};

interface AddHoldingFormProps {
  onCreated?: (id: string) => void;
}

export function AddHoldingForm({ onCreated }: AddHoldingFormProps) {
  const addHolding = useWealthStore((s) => s.addHolding);
  const [values, setValues] = useState<FormValues>(INIT);
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
    const id = addHolding({
      type: result.data.type as HoldingType,
      ticker: result.data.ticker.toUpperCase(),
      name: result.data.name,
      currency: result.data.currency,
      currentPrice: result.data.currentPrice,
      currentPriceUpdatedAt: new Date().toISOString(),
      coingeckoId: result.data.coingeckoId?.trim() || undefined,
      yahooSymbol: result.data.yahooSymbol?.trim() || undefined,
      notes: result.data.notes || undefined,
    });
    toast.success("Position créée", {
      description: `${result.data.ticker.toUpperCase()} — ${result.data.name}`,
    });
    setValues(INIT);
    onCreated?.(id);
  };

  return (
    <Card header="Nouvelle position">
      <form
        onSubmit={submit}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <Field label="Type">
          <Select
            value={values.type}
            onChange={(e) => update("type", e.target.value as HoldingType)}
          >
            <option value="etf">ETF</option>
            <option value="stock">Stock</option>
            <option value="crypto">Crypto</option>
            <option value="cash">Cash</option>
          </Select>
        </Field>
        <Field label="Ticker" hint={errors.ticker}>
          <Input
            mono
            placeholder="WPEA, BTC, AAPL…"
            value={values.ticker}
            onChange={(e) => update("ticker", e.target.value)}
            className={errors.ticker ? "border-strawberry-600" : undefined}
          />
        </Field>
        <Field label="Nom" hint={errors.name}>
          <Input
            placeholder="Amundi PEA Monde"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            className={errors.name ? "border-strawberry-600" : undefined}
          />
        </Field>
        <Field label="Devise">
          <Select
            value={values.currency}
            onChange={(e) =>
              update("currency", e.target.value as "EUR" | "USD")
            }
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
        <Field
          label="Prix actuel (par unité)"
          hint={errors.currentPrice ?? "Dans la devise du holding"}
        >
          <Input
            mono
            type="number"
            step="0.0001"
            value={values.currentPrice || ""}
            onChange={(e) =>
              update("currentPrice", Number(e.target.value) as never)
            }
            className={errors.currentPrice ? "border-strawberry-600" : undefined}
          />
        </Field>
        {values.type === "crypto" && (
          <Field
            label="CoinGecko ID (optionnel)"
            hint="Auto-détecté pour BTC, ETH, SOL, etc. — sinon copie l'ID depuis coingecko.com/coins/<…>"
            className="sm:col-span-3"
          >
            <Input
              mono
              placeholder="bitcoin, ethereum, dogwifcoin…"
              value={values.coingeckoId ?? ""}
              onChange={(e) => update("coingeckoId", e.target.value)}
            />
          </Field>
        )}
        {(values.type === "etf" || values.type === "stock") && (
          <Field
            label="Symbol Yahoo Finance (optionnel)"
            hint="Ex: WPEA.PA, EUNL.DE, AAPL. Vide = utilise le ticker tel quel pour USD."
            className="sm:col-span-3"
          >
            <Input
              mono
              placeholder="WPEA.PA, AAPL…"
              value={values.yahooSymbol ?? ""}
              onChange={(e) => update("yahooSymbol", e.target.value)}
            />
          </Field>
        )}
        <Field label="Notes (optionnel)" className="sm:col-span-3">
          <Input
            value={values.notes ?? ""}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>
        <div className="sm:col-span-3 flex justify-end">
          <Button type="submit" variant="lime">
            Créer la position
          </Button>
        </div>
      </form>
    </Card>
  );
}
