"use client";

import { useEffect, useState } from "react";
import { BadUsdRatesPanel } from "@/components/dca/BadUsdRatesPanel";
import { PositionsTable } from "@/components/positions/PositionsTable";
import { UpdatePricesDialog } from "@/components/positions/UpdatePricesDialog";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/lib/use-hydrated";

export default function PositionsPage() {
  const hydrated = useHydrated();
  const [updateOpen, setUpdateOpen] = useState(false);

  // Auto-open dialog when arriving via `?update=1` (Quick Actions).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("update") === "1") {
      setUpdateOpen(true);
      params.delete("update");
      const qs = params.toString();
      const url = window.location.pathname + (qs ? `?${qs}` : "");
      window.history.replaceState({}, "", url);
    }
  }, []);

  return (
    <div className="text-blueberry-900">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
        ◆ Wealth OS
      </div>
      <div className="mt-1 mb-6 flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="font-sans text-3xl font-extralight tracking-tight">
          Positions
        </h1>
        {hydrated && !updateOpen && (
          <Button variant="grape" onClick={() => setUpdateOpen(true)}>
            Mettre à jour les prix
          </Button>
        )}
      </div>
      {hydrated ? (
        <>
          {updateOpen && (
            <UpdatePricesDialog onClose={() => setUpdateOpen(false)} />
          )}
          <BadUsdRatesPanel />
          <PositionsTable />
        </>
      ) : (
        <div className="text-blueberry-900/60 text-sm">Chargement…</div>
      )}
    </div>
  );
}
