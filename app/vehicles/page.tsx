"use client";

import { useState } from "react";
import { AddVehicleForm } from "@/components/forms/AddVehicleForm";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { calculateVehicleCurrentValue } from "@/lib/finance";
import { formatEuro } from "@/lib/formatters";
import { useWealthStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";

export default function VehiclesPage() {
  const hydrated = useHydrated();
  const vehicles = useWealthStore((s) => s.vehicles);
  const [showForm, setShowForm] = useState(false);

  const totalEstimated = vehicles.reduce(
    (s, v) => s + calculateVehicleCurrentValue(v),
    0,
  );
  const totalPurchase = vehicles.reduce((s, v) => s + v.purchasePrice, 0);

  return (
    <div className="text-blueberry-900">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
        ◆ Wealth OS
      </div>
      <div className="mt-1 mb-6 flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="font-sans text-3xl font-extralight tracking-tight">
          Véhicules
        </h1>
        {hydrated && vehicles.length > 0 && (
          <div className="text-[12px] text-blueberry-900/65">
            {vehicles.length} véhicule{vehicles.length > 1 ? "s" : ""} ·{" "}
            <span className="num font-bold text-blueberry-900">
              {formatEuro(totalEstimated)}
            </span>{" "}
            estimés (acheté {formatEuro(totalPurchase)})
          </div>
        )}
      </div>

      {!hydrated ? (
        <div className="text-blueberry-900/60 text-sm">Chargement…</div>
      ) : (
        <>
          {!showForm && (
            <div className="mb-4 flex justify-end">
              <Button variant="tangerine" onClick={() => setShowForm(true)}>
                + Ajouter un véhicule
              </Button>
            </div>
          )}

          {showForm && (
            <AddVehicleForm onCreated={() => setShowForm(false)} />
          )}

          {vehicles.length === 0 && !showForm ? (
            <Card header="Aucun véhicule">
              <p className="text-[13px] text-blueberry-900/70">
                Voitures, motos ou autres biens dépréciables — leur valeur est
                automatiquement décotée entre tes saisies. Ajoute-en un pour
                qu&apos;il compte dans ton patrimoine net.
              </p>
            </Card>
          ) : (
            vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)
          )}
        </>
      )}
    </div>
  );
}
