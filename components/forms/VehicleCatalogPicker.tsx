"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";
import {
  availableYears,
  estimateCurrentValue,
  searchCatalog,
  type CatalogEntry,
} from "@/lib/vehicle-catalog";
import { formatEuro } from "@/lib/formatters";

export interface PickerSelection {
  /** Stable catalog id, e.g. "toyota-gr-supra-3.0" */
  catalogId: string;
  /** Maps to Vehicle.type */
  type: "car" | "motorcycle";
  /** Suggested name "Brand Model Trim (Year)" */
  name: string;
  msrpEur: number;
  estimatedValue: number;
  annualDepreciation: number;
  modelYear: number;
  /** Kilometres entered (undefined = "I don't know"). */
  mileageKm?: number;
}

interface Props {
  onPick: (selection: PickerSelection) => void;
}

export function VehicleCatalogPicker({ onPick }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<CatalogEntry | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [mileageKm, setMileageKm] = useState<number | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchCatalog(query, { limit: 12 });
  }, [query]);

  const years = useMemo(
    () => (picked ? availableYears(picked) : []),
    [picked],
  );

  const estimate = useMemo(() => {
    if (!picked || !year) return null;
    return estimateCurrentValue(picked, year, new Date(), mileageKm);
  }, [picked, year, mileageKm]);

  // Reference mileage for the chosen year (helps the user know "is my car
  // above or below average use").
  const expectedKm = useMemo(() => {
    if (!picked || !year) return null;
    const annual = picked.category === "motorcycle" ? 5_000 : 15_000;
    const ageYears = Math.max(
      0,
      (Date.now() - new Date(year, 6, 1).getTime()) / (365.25 * 86400_000),
    );
    return Math.round(annual * ageYears);
  }, [picked, year]);

  // Click outside to close suggestions
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handlePick = (entry: CatalogEntry) => {
    setPicked(entry);
    setQuery(formatLabel(entry));
    setOpen(false);
    const lastYear = entry.yearEnd ?? new Date().getFullYear();
    setYear(lastYear);
    setMileageKm(undefined);
  };

  const reset = () => {
    setPicked(null);
    setQuery("");
    setYear(null);
    setMileageKm(undefined);
    setOpen(false);
  };

  const apply = () => {
    if (!picked || !year || !estimate) return;
    onPick({
      catalogId: picked.id,
      type: picked.category,
      name: `${picked.brand} ${picked.model}${picked.trim ? ` ${picked.trim}` : ""} (${year})`,
      msrpEur: picked.msrpEur,
      estimatedValue: estimate.estimatedValue,
      annualDepreciation: estimate.annualDepreciationRate,
      modelYear: year,
      mileageKm,
    });
  };

  return (
    <div
      ref={wrapRef}
      className="rounded-[10px] border border-blueberry-700/20 bg-blueberry-100/20 p-3 space-y-3"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/80">
          ◆ Recherche catalogue
        </span>
        {picked && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto text-[10.5px] font-bold uppercase tracking-wider text-blueberry-700/70 hover:text-strawberry-700 hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <Field
        label="Marque, modèle ou finition"
        hint="Ex : « supra », « yamaha mt-07 », « cx-5 takumi »"
      >
        <div className="relative">
          <Input
            value={query}
            placeholder="Tape un modèle..."
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (picked) setPicked(null);
            }}
            onFocus={() => setOpen(true)}
          />
          {open && results.length > 0 && (
            <ul
              className="
                absolute z-10 left-0 right-0 top-full mt-1
                max-h-[280px] overflow-y-auto
                rounded-[8px] border border-blueberry-700/30
                bg-white shadow-[0_8px_24px_rgba(0,30,80,0.18)]
              "
            >
              {results.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(entry)}
                    className="w-full text-left px-3 py-2 hover:bg-blueberry-100/40 active:bg-blueberry-100/60 border-b border-blueberry-700/10 last:border-b-0"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12.5px] font-semibold text-blueberry-900 truncate">
                        {entry.brand} {entry.model}
                        {entry.trim && (
                          <span className="text-blueberry-900/60 font-normal">
                            {" "}
                            · {entry.trim}
                          </span>
                        )}
                      </span>
                      <span className="num font-mono tabular-nums text-[11px] text-blueberry-900/55 shrink-0">
                        {formatEuro(entry.msrpEur)}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-blueberry-900/55 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{formatYearRange(entry)}</span>
                      <span>·</span>
                      <span>{formatSegment(entry.segment)}</span>
                      {entry.power && (
                        <>
                          <span>·</span>
                          <span>{entry.power} ch</span>
                        </>
                      )}
                      {entry.iconic && (
                        <>
                          <span>·</span>
                          <span className="font-bold text-tangerine-700">
                            iconique
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {open && query.trim() && results.length === 0 && (
            <div className="absolute z-10 left-0 right-0 top-full mt-1 rounded-[8px] border border-blueberry-700/30 bg-white shadow-md px-3 py-3 text-[12px] text-blueberry-900/65">
              Aucun résultat. Tu peux saisir le véhicule manuellement
              ci-dessous.
            </div>
          )}
        </div>
      </Field>

      {picked && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
          <Field label="Année de mise en circulation">
            <Select
              value={year ?? ""}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Kilométrage actuel"
            hint={
              expectedKm !== null
                ? `Moyenne attendue à cet âge : ${expectedKm.toLocaleString("fr-FR")} km`
                : undefined
            }
          >
            <NumberInput
              value={mileageKm}
              placeholder="ex : 120000"
              onChange={(v) => setMileageKm(v ?? undefined)}
            />
          </Field>

          {estimate && (
            <div className="sm:col-span-1 rounded-[8px] bg-white/70 border border-blueberry-700/15 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-blueberry-800/65">
                  Valeur estimée
                </span>
                <span className="num font-mono tabular-nums text-[16px] font-bold text-blueberry-900">
                  {formatEuro(estimate.estimatedValue)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1.5 text-[10.5px]">
                <Stat
                  label="Neuf"
                  value={formatEuro(picked.msrpEur)}
                />
                <Stat
                  label="Résiduel"
                  value={`${(estimate.residualPct * 100).toFixed(0)}%`}
                />
                <Stat
                  label="Décote/an"
                  value={`${(estimate.annualDepreciationRate * 100).toFixed(1)}%`}
                />
              </div>
              {mileageKm !== undefined && expectedKm !== null && (
                <div className="mt-1.5 text-[10.5px] text-blueberry-900/65 italic">
                  {(() => {
                    const delta = mileageKm - expectedKm;
                    if (Math.abs(delta) < 5_000) return "Kilométrage dans la moyenne — pas d'ajustement.";
                    if (delta > 0) {
                      const ratio = mileageKm / Math.max(1, expectedKm);
                      const collectorOut = picked.iconic && ratio > 1.5;
                      return collectorOut
                        ? `+${delta.toLocaleString("fr-FR")} km vs moyenne — kilométrage trop élevé pour rester sur le marché collector, décote standard appliquée.`
                        : `+${delta.toLocaleString("fr-FR")} km vs moyenne — décote km appliquée.`;
                    }
                    return `${delta.toLocaleString("fr-FR")} km vs moyenne — bonus appliqué.`;
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {picked && estimate && (
        <div className="flex justify-end">
          <Button type="button" variant="lime" onClick={apply}>
            Utiliser ces valeurs
          </Button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-blueberry-800/55 truncate">
        {label}
      </span>
      <span className="num font-mono tabular-nums text-blueberry-900 truncate">
        {value}
      </span>
    </div>
  );
}

function formatLabel(entry: CatalogEntry): string {
  return `${entry.brand} ${entry.model}${entry.trim ? ` ${entry.trim}` : ""}`;
}

function formatYearRange(entry: CatalogEntry): string {
  if (!entry.yearEnd) return `${entry.yearStart}→`;
  if (entry.yearEnd === entry.yearStart) return `${entry.yearStart}`;
  return `${entry.yearStart}-${entry.yearEnd}`;
}

const SEGMENT_LABELS: Record<string, string> = {
  citadine: "Citadine",
  compacte: "Compacte",
  berline: "Berline",
  break: "Break",
  "suv-compact": "SUV compact",
  "suv-large": "SUV familial",
  premium: "Premium",
  sportive: "Sportive",
  supercar: "Supercar",
  ludospace: "Ludospace",
  utilitaire: "Pick-up",
  "moto-roadster": "Roadster",
  "moto-sportive": "Sportive",
  "moto-trail": "Trail",
  "moto-gt": "GT",
  "moto-scooter": "Scooter",
  "moto-cruiser": "Cruiser",
};

function formatSegment(segment: string): string {
  return SEGMENT_LABELS[segment] ?? segment;
}
