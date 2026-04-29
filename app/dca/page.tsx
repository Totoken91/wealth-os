"use client";

import { AddHoldingForm } from "@/components/forms/AddHoldingForm";
import { AddTransactionForm } from "@/components/forms/AddTransactionForm";
import { DcaStatsPanel } from "@/components/dca/DcaStatsPanel";
import { TransactionsTable } from "@/components/dca/TransactionsTable";
import { useHydrated } from "@/lib/use-hydrated";

export default function DcaPage() {
  const hydrated = useHydrated();
  return (
    <div className="text-blueberry-900">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
        ◆ Wealth OS
      </div>
      <h1 className="mt-1 mb-6 font-sans text-3xl font-extralight tracking-tight">
        Saisie DCA
      </h1>

      {!hydrated ? (
        <div className="text-blueberry-900/60 text-sm">Chargement…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-0">
            <AddHoldingForm />
            <AddTransactionForm />
            <TransactionsTable />
          </div>
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-4">
              <DcaStatsPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
