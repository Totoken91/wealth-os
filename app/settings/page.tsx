"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Toggle } from "@/components/ui/Toggle";
import { parseAppStateJson } from "@/lib/schema";
import { useWealthStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";

export default function SettingsPage() {
  const hydrated = useHydrated();
  const settings = useWealthStore((s) => s.settings);
  const updateSettings = useWealthStore((s) => s.updateSettings);
  const exportState = useWealthStore((s) => s.exportState);
  const importState = useWealthStore((s) => s.importState);
  const resetState = useWealthStore((s) => s.resetState);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resetArmed, setResetArmed] = useState(false);

  if (!hydrated) {
    return (
      <div className="text-blueberry-800/60 text-sm">Chargement…</div>
    );
  }

  const handleExport = () => {
    const data = exportState();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `wealth-os-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Export téléchargé", {
      description: `wealth-os-backup-${stamp}.json`,
    });
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = parseAppStateJson(text);
      importState(data);
      toast.success("Import réussi", {
        description: `${data.holdings.length} holdings, ${data.transactions.length} transactions`,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Fichier JSON invalide";
      toast.error("Import échoué", { description: msg });
    }
  };

  const handleReset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      toast.warning("Confirmer l'effacement", {
        description: "Cliquez à nouveau pour effacer définitivement.",
        duration: 6000,
      });
      setTimeout(() => setResetArmed(false), 6000);
      return;
    }
    resetState();
    setResetArmed(false);
    toast.success("Données effacées");
  };

  return (
    <div className="text-blueberry-900">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
        ◆ Wealth OS
      </div>
      <h1 className="mt-1 mb-6 font-sans text-3xl font-extralight tracking-tight">
        Préférences
      </h1>

      <Card header="Paramètres globaux">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Rendement annuel par défaut"
            hint="Utilisé pour les projections (ex: 0.07 = 7%)"
          >
            <NumberInput
              value={settings.defaultAnnualReturn}
              onChange={(v) =>
                updateSettings({ defaultAnnualReturn: v ?? 0 })
              }
            />
          </Field>
          <Field
            label="Décote véhicule par défaut"
            hint="Taux annuel (ex: 0.15 = 15%)"
          >
            <NumberInput
              value={settings.defaultVehicleDepreciation}
              onChange={(v) =>
                updateSettings({ defaultVehicleDepreciation: v ?? 0 })
              }
            />
          </Field>
          <Field
            label="Taux EUR/USD actuel"
            hint="Utilisé pour valoriser les holdings USD"
          >
            <NumberInput
              placeholder="ex: 0.92"
              value={settings.currentEurUsdRate}
              onChange={(v) => updateSettings({ currentEurUsdRate: v })}
            />
          </Field>
        </div>
      </Card>

      <Card header="Targets DCA">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Objectif hebdomadaire (€)">
            <NumberInput
              placeholder="ex: 250"
              value={settings.weeklyDcaTarget}
              onChange={(v) => updateSettings({ weeklyDcaTarget: v })}
            />
          </Field>
          <Field label="Objectif mensuel (€)">
            <NumberInput
              placeholder="ex: 1000"
              value={settings.monthlyDcaTarget}
              onChange={(v) => updateSettings({ monthlyDcaTarget: v })}
            />
          </Field>
        </div>
      </Card>

      <Card header="Apparence">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-blueberry-900">
              Mode visuel
            </div>
            <div className="text-[12px] text-blueberry-900/65 mt-0.5">
              Sage = effets translucides réduits, hero monochrome
            </div>
          </div>
          <Toggle
            checked={settings.visualMode === "full"}
            onChange={(on) =>
              updateSettings({ visualMode: on ? "full" : "sage" })
            }
            labelOn="Full"
            labelOff="Sage"
          />
        </div>
      </Card>

      <Card id="backup" header="Données" className="scroll-mt-20">
        <p className="text-[12.5px] text-blueberry-900/70 mb-4">
          Tes données vivent uniquement dans le localStorage de ce navigateur.
          Exporte régulièrement un backup JSON — c&apos;est ta seule sécurité
          contre une perte.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="lime" onClick={handleExport}>
            Exporter (JSON)
          </Button>
          <Button
            variant="grape"
            onClick={() => fileInputRef.current?.click()}
          >
            Importer (JSON)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                void handleImportFile(f);
              }
              e.target.value = "";
            }}
          />
          <Button
            variant={resetArmed ? "tangerine" : "neutral"}
            onClick={handleReset}
          >
            {resetArmed ? "Confirmer l'effacement" : "Effacer toutes les données"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
