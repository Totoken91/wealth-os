"use client";

import { PositionsTable } from "@/components/positions/PositionsTable";
import { useHydrated } from "@/lib/use-hydrated";

export default function PositionsPage() {
  const hydrated = useHydrated();
  return (
    <div className="text-blueberry-900">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
        ◆ Wealth OS
      </div>
      <h1 className="mt-1 mb-6 font-sans text-3xl font-extralight tracking-tight">
        Positions
      </h1>
      {hydrated ? (
        <PositionsTable />
      ) : (
        <div className="text-blueberry-900/60 text-sm">Chargement…</div>
      )}
    </div>
  );
}
