"use client";

import { useState } from "react";
import { AddDcaRuleForm } from "@/components/forms/AddDcaRuleForm";
import { AddHoldingForm } from "@/components/forms/AddHoldingForm";
import { AddTransactionForm } from "@/components/forms/AddTransactionForm";
import { OpeningBalanceForm } from "@/components/forms/OpeningBalanceForm";
import { BadUsdRatesPanel } from "@/components/dca/BadUsdRatesPanel";
import { DcaDraftsPanel } from "@/components/dca/DcaDraftsPanel";
import { DcaRulesList } from "@/components/dca/DcaRulesList";
import { DcaStatsPanel } from "@/components/dca/DcaStatsPanel";
import { TransactionsTable } from "@/components/dca/TransactionsTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useWealthStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";

export default function DcaPage() {
  const hydrated = useHydrated();
  const holdings = useWealthStore((s) => s.holdings);

  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showHoldingForm, setShowHoldingForm] = useState(false);
  const [showManualTx, setShowManualTx] = useState(false);
  const [showOpening, setShowOpening] = useState(false);

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
            {holdings.length === 0 && (
              <Card header="Premiers pas">
                <p className="text-[13px] text-blueberry-900/70">
                  Crée d&apos;abord une position dans la section ci-dessous,
                  puis configure une règle DCA pour automatiser le rituel
                  hebdomadaire.
                </p>
              </Card>
            )}

            <BadUsdRatesPanel />

            <DcaDraftsPanel />

            <DcaRulesList />

            {holdings.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-3">
                {!showRuleForm && (
                  <Button
                    variant="tangerine"
                    onClick={() => setShowRuleForm(true)}
                  >
                    + Nouvelle règle DCA
                  </Button>
                )}
                {!showHoldingForm && (
                  <Button
                    variant="lime"
                    onClick={() => setShowHoldingForm(true)}
                  >
                    + Nouvelle position
                  </Button>
                )}
                {!showManualTx && (
                  <Button
                    variant="grape"
                    onClick={() => setShowManualTx(true)}
                  >
                    + Saisie ponctuelle (hors règle)
                  </Button>
                )}
                {!showOpening && (
                  <Button
                    variant="blueberry"
                    onClick={() => setShowOpening(true)}
                  >
                    ⚡ Solde d&apos;ouverture (migration)
                  </Button>
                )}
              </div>
            )}

            {showRuleForm && (
              <AddDcaRuleForm onCreated={() => setShowRuleForm(false)} />
            )}
            {showHoldingForm && (
              <AddHoldingForm onCreated={() => setShowHoldingForm(false)} />
            )}
            {showOpening && holdings.length > 0 && (
              <OpeningBalanceForm
                onCreated={() => setShowOpening(false)}
                onCancel={() => setShowOpening(false)}
              />
            )}
            {(showManualTx || holdings.length === 0) && (
              <>
                {holdings.length === 0 && <AddHoldingForm />}
                {holdings.length > 0 && showManualTx && (
                  <AddTransactionForm
                    onCreated={() => setShowManualTx(false)}
                  />
                )}
              </>
            )}

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
