"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NumberInput } from "@/components/ui/NumberInput";
import { Pill } from "@/components/ui/Pill";
import { generatePendingDrafts } from "@/lib/finance";
import { formatEuro } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import type { DcaDraft } from "@/lib/finance";

interface DraftEdit {
  pricePerUnit: number;
  quantity: number;
  exchangeRate?: number;
}

export function DcaDraftsPanel() {
  const rules = useWealthStore((s) => s.dcaRules);
  const holdings = useWealthStore((s) => s.holdings);
  const settingsRate = useWealthStore((s) => s.settings.currentEurUsdRate);
  const addTransaction = useWealthStore((s) => s.addTransaction);
  const updateDcaRule = useWealthStore((s) => s.updateDcaRule);

  const drafts = useMemo(() => generatePendingDrafts(rules), [rules]);
  const holdingsById = useMemo(() => {
    const m = new Map(holdings.map((h) => [h.id, h]));
    return m;
  }, [holdings]);

  const draftKey = (d: DcaDraft) => `${d.ruleId}:${d.occurrenceDate}`;

  const [edits, setEdits] = useState<Record<string, DraftEdit>>({});

  // Initialize/refresh edits when drafts change
  useEffect(() => {
    setEdits((prev) => {
      const next: Record<string, DraftEdit> = {};
      for (const d of drafts) {
        const key = draftKey(d);
        if (prev[key]) {
          next[key] = prev[key];
          continue;
        }
        const holding = holdingsById.get(d.holdingId);
        const currentPrice = holding?.currentPrice ?? 0;
        // Compute default qty so total EUR ≈ amount
        const eurPrice =
          holding?.currency === "USD"
            ? currentPrice * (settingsRate ?? 1)
            : currentPrice;
        const qty = eurPrice > 0 ? d.amount / eurPrice : 0;
        next[key] = {
          pricePerUnit: currentPrice,
          quantity: Number(qty.toFixed(8)),
          exchangeRate: holding?.currency === "USD" ? settingsRate : undefined,
        };
      }
      return next;
    });
  }, [drafts, holdingsById, settingsRate]);

  const updateEdit = (key: string, patch: Partial<DraftEdit>) =>
    setEdits((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const validateOne = (d: DcaDraft) => {
    const key = draftKey(d);
    const edit = edits[key];
    const holding = holdingsById.get(d.holdingId);
    if (!edit || !holding) return;
    if (edit.pricePerUnit <= 0 || edit.quantity <= 0) {
      toast.error("Renseigne prix et quantité");
      return;
    }
    if (holding.currency === "USD" && (!edit.exchangeRate || edit.exchangeRate <= 0)) {
      toast.error("Taux EUR/USD requis pour cette position USD");
      return;
    }
    addTransaction({
      holdingId: d.holdingId,
      type: "buy",
      date: d.occurrenceDate,
      quantity: edit.quantity,
      pricePerUnit: edit.pricePerUnit,
      fees: 0,
      exchangeRate: holding.currency === "USD" ? edit.exchangeRate : undefined,
    });
    updateDcaRule(d.ruleId, { lastSettledDate: d.occurrenceDate });
    toast.success(`${holding.ticker} validé pour le ${d.occurrenceDate}`);
  };

  const skipOne = (d: DcaDraft) => {
    updateDcaRule(d.ruleId, { lastSettledDate: d.occurrenceDate });
    toast.success(`Brouillon du ${d.occurrenceDate} ignoré`);
  };

  const validateAll = () => {
    let count = 0;
    for (const d of drafts) {
      const key = draftKey(d);
      const edit = edits[key];
      const holding = holdingsById.get(d.holdingId);
      if (!edit || !holding) continue;
      if (edit.pricePerUnit <= 0 || edit.quantity <= 0) continue;
      if (holding.currency === "USD" && (!edit.exchangeRate || edit.exchangeRate <= 0))
        continue;
      addTransaction({
        holdingId: d.holdingId,
        type: "buy",
        date: d.occurrenceDate,
        quantity: edit.quantity,
        pricePerUnit: edit.pricePerUnit,
        fees: 0,
        exchangeRate:
          holding.currency === "USD" ? edit.exchangeRate : undefined,
      });
      updateDcaRule(d.ruleId, { lastSettledDate: d.occurrenceDate });
      count += 1;
    }
    if (count > 0) {
      toast.success(`${count} transaction${count > 1 ? "s" : ""} validée${count > 1 ? "s" : ""}`);
    } else {
      toast.error("Rien à valider — vérifie les prix/quantités");
    }
  };

  if (rules.length === 0) {
    return (
      <Card header="Brouillons DCA">
        <p className="text-[13px] text-blueberry-900/70">
          Crée d&apos;abord une règle DCA ci-dessous (ex: 50 €/sem en BTC le
          lundi). Wealth OS te préparera ensuite un brouillon à valider en 1
          clic à chaque occurrence.
        </p>
      </Card>
    );
  }

  if (drafts.length === 0) {
    return (
      <Card header="Brouillons DCA">
        <p className="text-[13px] text-blueberry-900/70">
          Aucun brouillon en attente — toutes tes règles DCA sont à jour. ✓
        </p>
      </Card>
    );
  }

  return (
    <Card
      header={`Brouillons DCA (${drafts.length}) — ${drafts.reduce((s, d) => s + d.amount, 0).toLocaleString("fr-FR")} € à confirmer`}
    >
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11.5px] text-blueberry-900/65">
          Vérifie le prix/quantité pour chaque occurrence puis valide. Prix
          pré-rempli depuis le current price de la position.
        </p>
        <Button variant="lime" onClick={validateAll}>
          Tout valider
        </Button>
      </div>

      <ul className="space-y-2">
        {drafts.map((d) => {
          const key = draftKey(d);
          const edit = edits[key];
          const holding = holdingsById.get(d.holdingId);
          if (!holding || !edit) return null;
          const totalEur =
            edit.quantity *
            edit.pricePerUnit *
            (holding.currency === "USD" ? edit.exchangeRate ?? 1 : 1);
          const targetDelta = totalEur - d.amount;
          const deltaPct = d.amount > 0 ? (targetDelta / d.amount) * 100 : 0;
          return (
            <li
              key={key}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end py-2 px-3 rounded-[10px] bg-blueberry-100/20 border border-blueberry-700/15"
            >
              <div className="sm:col-span-3 flex flex-col">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/70">
                  {d.occurrenceDate}
                </span>
                <span className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-blueberry-900">
                    {holding.ticker}
                  </span>
                  <Pill flavor={holding.type}>{holding.type}</Pill>
                </span>
                <span className="num text-[11.5px] text-blueberry-900/70 mt-1">
                  Cible : {formatEuro(d.amount)}
                </span>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-blueberry-800/65 block mb-0.5">
                  Prix ({holding.currency})
                </label>
                <NumberInput
                  value={edit.pricePerUnit || undefined}
                  onChange={(v) =>
                    updateEdit(key, { pricePerUnit: v ?? 0 })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-blueberry-800/65 block mb-0.5">
                  Quantité
                </label>
                <NumberInput
                  value={edit.quantity || undefined}
                  onChange={(v) => updateEdit(key, { quantity: v ?? 0 })}
                />
              </div>
              {holding.currency === "USD" && (
                <div className="sm:col-span-2">
                  <label className="text-[9.5px] font-extrabold uppercase tracking-wider text-blueberry-800/65 block mb-0.5">
                    Taux EUR/USD
                  </label>
                  <NumberInput
                    value={edit.exchangeRate}
                    onChange={(v) => updateEdit(key, { exchangeRate: v })}
                  />
                </div>
              )}
              <div
                className={cn(
                  "sm:col-span-2 num text-[11.5px]",
                  Math.abs(deltaPct) < 1
                    ? "text-blueberry-900/65"
                    : "text-tangerine-700",
                )}
              >
                Total :{" "}
                <span className="font-bold text-blueberry-900">
                  {formatEuro(totalEur)}
                </span>
                {Math.abs(deltaPct) >= 1 && (
                  <span className="block text-[10px]">
                    Δ {deltaPct > 0 ? "+" : ""}
                    {deltaPct.toFixed(1)}% vs cible
                  </span>
                )}
              </div>
              <div className="sm:col-span-1 flex flex-col gap-1">
                <Button variant="lime" onClick={() => validateOne(d)}>
                  ✓
                </Button>
                <Button variant="neutral" onClick={() => skipOne(d)}>
                  Skip
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
