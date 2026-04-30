"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";
import { formatEuro } from "@/lib/formatters";
import { useWealthStore } from "@/lib/store";

interface Props {
  /** Pre-select and lock the holding (used from a position detail page). */
  holdingId?: string;
  onCreated?: () => void;
  onCancel?: () => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export function OpeningBalanceForm({ holdingId, onCreated, onCancel }: Props) {
  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const addTransaction = useWealthStore((s) => s.addTransaction);

  const initialId = holdingId ?? holdings[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(initialId);
  const [date, setDate] = useState(todayIso());
  const [qty, setQty] = useState<number | undefined>(undefined);
  const [capitalEur, setCapitalEur] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (holdingId) setSelectedId(holdingId);
  }, [holdingId]);

  const holding = useMemo(
    () => holdings.find((h) => h.id === selectedId),
    [holdings, selectedId],
  );

  const existingForHolding = useMemo(
    () =>
      transactions.filter((t) => t.holdingId === selectedId).length,
    [transactions, selectedId],
  );

  const pruEur =
    qty && capitalEur && qty > 0 ? capitalEur / qty : 0;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!holding) {
      toast.error("Choisis une position");
      return;
    }
    if (!qty || qty <= 0) {
      toast.error("Quantité > 0 requise");
      return;
    }
    if (!capitalEur || capitalEur <= 0) {
      toast.error("Capital investi > 0 requis");
      return;
    }
    const pricePerUnitEur = capitalEur / qty;
    addTransaction({
      holdingId: holding.id,
      type: "buy",
      date,
      quantity: qty,
      // Stored as the EUR-equivalent unit price; exchangeRate=1 keeps the
      // capital-invested math identical for EUR and USD holdings.
      pricePerUnit: pricePerUnitEur,
      fees: 0,
      exchangeRate: holding.currency === "USD" ? 1 : undefined,
      notes:
        notes.trim() ||
        `Solde d'ouverture (migration) — ${qty} unités pour ${formatEuro(capitalEur)}`,
    });
    toast.success(`Solde d'ouverture enregistré`, {
      description: `${holding.ticker} : ${qty} unités, capital ${formatEuro(capitalEur)}`,
    });
    setQty(undefined);
    setCapitalEur(undefined);
    setNotes("");
    onCreated?.();
  };

  if (holdings.length === 0) {
    return (
      <Card header="Solde d'ouverture">
        <p className="text-[13px] text-blueberry-900/70">
          Crée d&apos;abord une position pour pouvoir y déclarer un solde
          d&apos;ouverture.
        </p>
      </Card>
    );
  }

  return (
    <Card header="Solde d'ouverture (migration)">
      <p className="text-[12px] text-blueberry-900/70 mb-3">
        Tu as déjà des positions ailleurs ? Déclare directement ta{" "}
        <span className="font-semibold">quantité actuelle</span> et le{" "}
        <span className="font-semibold">capital total investi en €</span>.
        Wealth&nbsp;OS crée une transaction de synthèse pour matérialiser
        ton point de départ — pas besoin de ressaisir des centaines
        d&apos;achats.
      </p>

      <form
        onSubmit={submit}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <Field label="Date d'ouverture" className="col-span-2 sm:col-span-1">
          <Input
            mono
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Position" className="col-span-2">
          <Select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={!!holdingId}
          >
            {holdings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.ticker} — {h.name} ({h.currency})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantité actuelle" className="col-span-1">
          <NumberInput
            value={qty}
            onChange={(v) => setQty(v)}
            placeholder="ex: 0,027"
          />
        </Field>
        <Field label="Capital total investi (€)" className="col-span-2">
          <NumberInput
            value={capitalEur}
            onChange={(v) => setCapitalEur(v)}
            placeholder="ex: 1500"
          />
        </Field>
        <div className="col-span-2 sm:col-span-2 flex flex-col justify-end">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/65">
            PRU déduit (€)
          </div>
          <div className="num text-[14px] font-bold text-blueberry-900 mt-0.5">
            {pruEur > 0 ? formatEuro(pruEur, 4) : "—"}
          </div>
        </div>
        <Field label="Notes (optionnel)" className="col-span-2 sm:col-span-4">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex: Import Trade Republic — 152 achats DCA 2023-2026"
          />
        </Field>

        {existingForHolding > 0 && (
          <div className="col-span-2 sm:col-span-4 text-[11px] text-tangerine-700">
            ⚠ Cette position contient déjà {existingForHolding} transaction
            {existingForHolding > 1 ? "s" : ""}. Le solde d&apos;ouverture
            s&apos;ajoutera par-dessus, ce qui peut doubler la quantité et
            fausser le PRU. Utilise plutôt « Saisir une transaction » pour
            les achats ponctuels.
          </div>
        )}

        <div className="col-span-2 sm:col-span-4 flex items-center justify-between">
          <span className="text-[11px] text-blueberry-900/55">
            Astuce :{" "}
            <kbd className="px-1.5 py-0.5 rounded border border-blueberry-700/30 bg-white/70 font-mono text-[10px]">
              Ctrl
            </kbd>{" "}
            +{" "}
            <kbd className="px-1.5 py-0.5 rounded border border-blueberry-700/30 bg-white/70 font-mono text-[10px]">
              Entrée
            </kbd>{" "}
            pour enregistrer
          </span>
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="neutral" onClick={onCancel}>
                Annuler
              </Button>
            )}
            <Button type="submit" variant="grape">
              Enregistrer le solde
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
