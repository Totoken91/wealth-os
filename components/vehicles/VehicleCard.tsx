"use client";

import { Bike, Box, Car, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NumberInput } from "@/components/ui/NumberInput";
import { Pill } from "@/components/ui/Pill";
import { calculateVehicleCurrentValue } from "@/lib/finance";
import { formatEuro, formatPct } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import type { Vehicle, VehicleType } from "@/types";

const ICONS: Record<VehicleType, LucideIcon> = {
  car: Car,
  motorcycle: Bike,
  other: Box,
};

const TYPE_LABEL: Record<VehicleType, string> = {
  car: "Voiture",
  motorcycle: "Moto",
  other: "Autre",
};

interface Props {
  vehicle: Vehicle;
}

export function VehicleCard({ vehicle }: Props) {
  const updateVehicle = useWealthStore((s) => s.updateVehicle);
  const deleteVehicle = useWealthStore((s) => s.deleteVehicle);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(vehicle.currentValue);

  const Icon = ICONS[vehicle.type];

  const estimated = calculateVehicleCurrentValue(vehicle);
  const totalLossEur = vehicle.purchasePrice - estimated;
  const totalLossPct =
    vehicle.purchasePrice === 0
      ? 0
      : (totalLossEur / vehicle.purchasePrice) * 100;

  const lastUpdated = new Date(vehicle.currentValueUpdatedAt);
  const daysSince = Math.floor(
    (Date.now() - lastUpdated.getTime()) / (24 * 60 * 60 * 1000),
  );

  const saveValue = () => {
    if (draft <= 0) {
      toast.error("Valeur invalide");
      return;
    }
    updateVehicle(vehicle.id, {
      currentValue: draft,
      currentValueUpdatedAt: new Date().toISOString(),
    });
    setEditing(false);
    toast.success("Valeur mise à jour", {
      description: vehicle.name,
    });
  };

  const handleDelete = () => {
    if (confirm(`Supprimer définitivement « ${vehicle.name} » ?`)) {
      deleteVehicle(vehicle.id);
      toast.success("Véhicule supprimé");
    }
  };

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div
          className="
            shrink-0 w-12 h-12 rounded-[12px] flex items-center justify-center
            bg-gradient-to-b from-tangerine-100 via-tangerine-400 to-tangerine-600
            border border-tangerine-800/50
            shadow-[inset_0_1.5px_0_rgba(255,255,255,0.7),inset_0_-2px_3px_rgba(120,40,0,0.4),0_2px_4px_rgba(180,70,20,0.3)]
            text-white
          "
        >
          <Icon size={24} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-sans text-xl font-light tracking-tight text-blueberry-900">
              {vehicle.name}
            </h3>
            <Pill flavor="vehicle">{TYPE_LABEL[vehicle.type]}</Pill>
          </div>
          <div className="text-[12px] text-blueberry-900/65 mt-0.5">
            Acheté{" "}
            <span className="num">
              {formatEuro(vehicle.purchasePrice)}
            </span>{" "}
            le {vehicle.purchaseDate}
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/70">
              Valeur estimée aujourd&apos;hui
            </div>
            {editing ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <div className="w-44">
                  <NumberInput
                    value={draft || undefined}
                    onChange={(v) => setDraft(v ?? 0)}
                    autoFocus
                  />
                </div>
                <Button variant="lime" onClick={saveValue}>
                  Enregistrer
                </Button>
                <Button
                  variant="neutral"
                  onClick={() => {
                    setEditing(false);
                    setDraft(vehicle.currentValue);
                  }}
                >
                  Annuler
                </Button>
              </div>
            ) : (
              <div className="mt-0.5 flex items-baseline gap-3">
                <div className="num font-sans text-[34px] font-extralight tracking-tight text-blueberry-900 leading-none">
                  {formatEuro(estimated)}
                </div>
                <span
                  className={cn(
                    "text-[12px] font-bold",
                    totalLossEur > 0 ? "text-strawberry-700" : "text-lime-700",
                  )}
                >
                  {totalLossEur >= 0 ? "−" : "+"}
                  {formatEuro(Math.abs(totalLossEur))} (
                  {totalLossEur >= 0 ? "−" : "+"}
                  {formatPct(Math.abs(totalLossPct)).replace(/^\+/, "")})
                </span>
              </div>
            )}
            <div className="text-[11px] text-blueberry-900/55 mt-1">
              Dernière saisie il y a {daysSince} j —{" "}
              <span className="num">
                {formatEuro(vehicle.currentValue)}
              </span>{" "}
              · décote auto {(vehicle.annualDepreciation * 100).toFixed(0)}%/an
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-col gap-2">
          {!editing && (
            <Button variant="tangerine" onClick={() => setEditing(true)}>
              Mettre à jour
            </Button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="text-[11px] font-bold uppercase tracking-wider text-strawberry-700 hover:underline self-end"
          >
            Suppr
          </button>
        </div>
      </div>
    </Card>
  );
}
