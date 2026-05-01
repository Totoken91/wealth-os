"use client";

import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";
import {
  VehicleCatalogPicker,
  type PickerSelection,
} from "@/components/forms/VehicleCatalogPicker";
import { useWealthStore } from "@/lib/store";
import type { VehicleType } from "@/types";

const schema = z.object({
  type: z.enum(["car", "motorcycle", "other"]),
  name: z.string().min(1, "Nom requis"),
  purchaseDate: z.string().min(1, "Date requise"),
  purchasePrice: z.coerce.number().positive("Prix > 0"),
  currentValue: z.coerce.number().positive("Valeur > 0"),
  annualDepreciation: z.coerce.number().min(0).max(1),
});

type FormValues = z.infer<typeof schema>;

const todayIso = () => new Date().toISOString().slice(0, 10);

const initial = (defaultDepreciation: number): FormValues => ({
  type: "car",
  name: "",
  purchaseDate: todayIso(),
  purchasePrice: 0,
  currentValue: 0,
  annualDepreciation: defaultDepreciation,
});

interface Props {
  onCreated?: () => void;
}

export function AddVehicleForm({ onCreated }: Props) {
  const addVehicle = useWealthStore((s) => s.addVehicle);
  const defaultDep = useWealthStore(
    (s) => s.settings.defaultVehicleDepreciation,
  );
  const [values, setValues] = useState<FormValues>(() => initial(defaultDep));
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormValues, string>>
  >({});

  const update = <K extends keyof FormValues>(key: K, v: FormValues[K]) =>
    setValues((s) => ({ ...s, [key]: v }));

  const applyCatalogPick = (pick: PickerSelection) => {
    setValues((s) => ({
      ...s,
      type: pick.type,
      name: pick.name,
      // Default purchaseDate to mid-year of model year (best guess for used)
      purchaseDate: `${pick.modelYear}-07-01`,
      purchasePrice: pick.msrpEur,
      currentValue: pick.estimatedValue,
      annualDepreciation: pick.annualDepreciation,
    }));
    setErrors({});
    toast.info("Valeurs pré-remplies depuis le catalogue", {
      description: "Ajuste si besoin avant d'enregistrer",
    });
  };

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
    addVehicle({
      type: result.data.type as VehicleType,
      name: result.data.name,
      purchaseDate: result.data.purchaseDate,
      purchasePrice: result.data.purchasePrice,
      currentValue: result.data.currentValue,
      currentValueUpdatedAt: new Date().toISOString(),
      annualDepreciation: result.data.annualDepreciation,
    });
    toast.success("Véhicule ajouté", { description: result.data.name });
    setValues(initial(defaultDep));
    onCreated?.();
  };

  return (
    <Card header="Nouveau véhicule">
      <div className="mb-3">
        <VehicleCatalogPicker onPick={applyCatalogPick} />
      </div>
      <form
        onSubmit={submit}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <Field label="Type">
          <Select
            value={values.type}
            onChange={(e) => update("type", e.target.value as VehicleType)}
          >
            <option value="car">Voiture</option>
            <option value="motorcycle">Moto</option>
            <option value="other">Autre</option>
          </Select>
        </Field>
        <Field label="Nom" hint={errors.name} className="sm:col-span-2">
          <Input
            placeholder="Toyota Supra MK4"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            className={errors.name ? "border-strawberry-600" : undefined}
          />
        </Field>
        <Field label="Date d'achat" hint={errors.purchaseDate}>
          <Input
            mono
            type="date"
            value={values.purchaseDate}
            onChange={(e) => update("purchaseDate", e.target.value)}
          />
        </Field>
        <Field label="Prix d'achat (€)" hint={errors.purchasePrice}>
          <NumberInput
            value={values.purchasePrice || undefined}
            onChange={(v) => update("purchasePrice", (v ?? 0) as never)}
            className={
              errors.purchasePrice ? "border-strawberry-600" : undefined
            }
          />
        </Field>
        <Field label="Valeur actuelle (€)" hint={errors.currentValue}>
          <NumberInput
            value={values.currentValue || undefined}
            onChange={(v) => update("currentValue", (v ?? 0) as never)}
            className={
              errors.currentValue ? "border-strawberry-600" : undefined
            }
          />
        </Field>
        <Field
          label="Décote annuelle"
          hint={
            errors.annualDepreciation ??
            `Valeur entre 0 et 1 (ex: ${defaultDep} = ${(defaultDep * 100).toFixed(0)}%)`
          }
          className="sm:col-span-2"
        >
          <NumberInput
            value={values.annualDepreciation}
            onChange={(v) =>
              update("annualDepreciation", (v ?? 0) as never)
            }
            className={
              errors.annualDepreciation ? "border-strawberry-600" : undefined
            }
          />
        </Field>
        <div className="sm:col-span-3 flex justify-end">
          <Button type="submit" variant="tangerine">
            Ajouter le véhicule
          </Button>
        </div>
      </form>
    </Card>
  );
}
