"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AddTransactionForm } from "@/components/forms/AddTransactionForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import {
  calculateAveragePurchasePrice,
  calculateCapitalInvestedEUR,
  calculateCurrentQuantity,
  calculateCurrentValueEUR,
  calculateRealizedPnL,
  calculateUnrealizedPnL,
} from "@/lib/finance";
import { formatEuro, formatPct, formatQuantity } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import type { Holding, Transaction } from "@/types";

interface Props {
  id: string;
}

export function PositionDetail({ id }: Props) {
  const router = useRouter();
  const hydrated = useHydrated();
  const holding = useWealthStore((s) => s.holdings.find((h) => h.id === id));
  const transactions = useWealthStore((s) => s.transactions);
  const rate = useWealthStore((s) => s.settings.currentEurUsdRate);
  const updateHolding = useWealthStore((s) => s.updateHolding);
  const deleteHolding = useWealthStore((s) => s.deleteHolding);
  const dcaRulesCount = useWealthStore(
    (s) => s.dcaRules.filter((r) => r.holdingId === id).length,
  );

  const txs = useMemo(
    () =>
      transactions
        .filter((t) => t.holdingId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, id],
  );

  const [showAddTx, setShowAddTx] = useState(false);
  const [showEditPosition, setShowEditPosition] = useState(false);

  if (!hydrated) {
    return <div className="text-blueberry-900/60 text-sm">Chargement…</div>;
  }

  if (!holding) {
    return (
      <Card header="Position introuvable">
        <p className="text-[13px] text-blueberry-900/70">
          Cette position n&apos;existe pas (ou plus).{" "}
          <Link
            href="/positions"
            className="font-semibold text-blueberry-700 underline-offset-4 hover:underline"
          >
            ← Retour à la liste
          </Link>
        </p>
      </Card>
    );
  }

  const qty = calculateCurrentQuantity(txs);
  const pru = calculateAveragePurchasePrice(txs);
  const capital = calculateCapitalInvestedEUR(txs);
  const value = calculateCurrentValueEUR(holding, txs, rate);
  const pnl = calculateUnrealizedPnL(holding, txs, rate);
  const realized = calculateRealizedPnL(txs);

  const handleDeletePosition = () => {
    const tail =
      txs.length > 0 || dcaRulesCount > 0
        ? ` (${txs.length} transaction${txs.length > 1 ? "s" : ""}${
            dcaRulesCount > 0
              ? ` + ${dcaRulesCount} règle${dcaRulesCount > 1 ? "s" : ""} DCA`
              : ""
          } seront aussi supprimé${
            txs.length + dcaRulesCount > 1 ? "s" : ""
          })`
        : "";
    if (
      !confirm(
        `Supprimer définitivement la position ${holding.ticker}${tail} ?`,
      )
    ) {
      return;
    }
    deleteHolding(holding.id);
    toast.success(`Position ${holding.ticker} supprimée`);
    router.push("/positions");
  };

  return (
    <div>
      <Link
        href="/positions"
        className="text-[12px] font-semibold text-blueberry-700 underline-offset-4 hover:underline"
      >
        ← Retour aux positions
      </Link>

      <div className="mt-3 mb-4 flex items-baseline gap-3">
        <h2 className="font-sans text-3xl font-extralight tracking-tight text-blueberry-900">
          {holding.ticker}
        </h2>
        <Pill flavor={holding.type}>{holding.type}</Pill>
        <span className="text-[12px] text-blueberry-900/60">
          {holding.currency}
        </span>
      </div>
      <div className="mb-5 text-[13px] text-blueberry-900/70">{holding.name}</div>

      <div className="mb-4 flex flex-wrap gap-3">
        {!showAddTx && (
          <Button variant="lime" onClick={() => setShowAddTx(true)}>
            + Saisir une transaction
          </Button>
        )}
        {!showEditPosition && (
          <Button
            variant="grape"
            onClick={() => setShowEditPosition(true)}
          >
            Modifier la position
          </Button>
        )}
        <Button variant="strawberry" onClick={handleDeletePosition}>
          Supprimer la position
        </Button>
      </div>

      {showAddTx && (
        <div className="relative">
          <AddTransactionForm
            holdingId={holding.id}
            onCreated={() => setShowAddTx(false)}
          />
          <div className="-mt-3 mb-4">
            <button
              type="button"
              onClick={() => setShowAddTx(false)}
              className="text-[11px] font-semibold text-blueberry-700/70 underline-offset-4 hover:underline"
            >
              Annuler la saisie
            </button>
          </div>
        </div>
      )}

      {showEditPosition && (
        <EditPositionPanel
          holding={holding}
          onClose={() => setShowEditPosition(false)}
          onSave={(patch) => {
            updateHolding(holding.id, patch);
            toast.success("Position mise à jour");
            setShowEditPosition(false);
          }}
        />
      )}

      <Card header="Synthèse">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          <Stat label="Quantité" value={formatQuantity(qty, holding.type === "crypto" ? 8 : 4)} />
          <Stat label="PRU (EUR)" value={formatEuro(pru, 4)} />
          <Stat
            label={`Prix actuel (${holding.currency})`}
            value={formatQuantity(holding.currentPrice, 4)}
          />
          <Stat label="Valeur (EUR)" value={formatEuro(value)} bold />
          <Stat
            label="P&L latent"
            value={`${pnl.eur >= 0 ? "+" : ""}${formatEuro(pnl.eur)} (${formatPct(pnl.pct)})`}
            tone={pnl.eur > 0 ? "pos" : pnl.eur < 0 ? "neg" : "neutral"}
          />
          <Stat
            label="P&L réalisé"
            value={`${realized >= 0 ? "+" : ""}${formatEuro(realized)}`}
            tone={realized > 0 ? "pos" : realized < 0 ? "neg" : "neutral"}
          />
          <Stat label="Capital investi" value={formatEuro(capital)} />
        </dl>
      </Card>

      <TransactionsCard holding={holding} txs={txs} />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Edit position                                                    */
/* ---------------------------------------------------------------- */

interface EditPatch {
  ticker: string;
  name: string;
  currentPrice: number;
  notes?: string;
}

function EditPositionPanel({
  holding,
  onClose,
  onSave,
}: {
  holding: Holding;
  onClose: () => void;
  onSave: (patch: Partial<Holding>) => void;
}) {
  const [v, setV] = useState<EditPatch>({
    ticker: holding.ticker,
    name: holding.name,
    currentPrice: holding.currentPrice,
    notes: holding.notes ?? "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.ticker.trim() || !v.name.trim() || v.currentPrice <= 0) {
      toast.error("Ticker, nom et prix > 0 requis");
      return;
    }
    const priceChanged = v.currentPrice !== holding.currentPrice;
    onSave({
      ticker: v.ticker.trim().toUpperCase(),
      name: v.name.trim(),
      currentPrice: v.currentPrice,
      notes: v.notes?.trim() ? v.notes.trim() : undefined,
      ...(priceChanged
        ? { currentPriceUpdatedAt: new Date().toISOString() }
        : {}),
    });
  };

  return (
    <Card header="Modifier la position">
      <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Ticker">
          <Input
            value={v.ticker}
            onChange={(e) =>
              setV((s) => ({ ...s, ticker: e.target.value }))
            }
          />
        </Field>
        <Field label="Nom" className="col-span-2 sm:col-span-2">
          <Input
            value={v.name}
            onChange={(e) => setV((s) => ({ ...s, name: e.target.value }))}
          />
        </Field>
        <Field label={`Prix actuel (${holding.currency})`}>
          <Input
            mono
            type="number"
            step="0.0001"
            value={v.currentPrice || ""}
            onChange={(e) =>
              setV((s) => ({ ...s, currentPrice: Number(e.target.value) }))
            }
          />
        </Field>
        <Field label="Notes (optionnel)" className="col-span-2 sm:col-span-4">
          <Input
            value={v.notes ?? ""}
            onChange={(e) => setV((s) => ({ ...s, notes: e.target.value }))}
          />
        </Field>
        <div className="col-span-2 sm:col-span-4 flex justify-end gap-2">
          <Button type="button" variant="neutral" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="tangerine">
            Enregistrer
          </Button>
        </div>
        <p className="col-span-2 sm:col-span-4 text-[10.5px] text-blueberry-900/55">
          Type ({holding.type}) et devise ({holding.currency}) ne sont pas
          modifiables ici — supprime et recrée si besoin.
        </p>
      </form>
    </Card>
  );
}

/* ---------------------------------------------------------------- */
/* Transactions card with edit/delete                               */
/* ---------------------------------------------------------------- */

function TransactionsCard({
  holding,
  txs,
}: {
  holding: Holding;
  txs: Transaction[];
}) {
  const updateTransaction = useWealthStore((s) => s.updateTransaction);
  const deleteTransaction = useWealthStore((s) => s.deleteTransaction);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (txs.length === 0) {
    return (
      <Card header={`Transactions (0)`}>
        <p className="text-[13px] text-blueberry-900/70">
          Aucune transaction sur cette position. Clique sur{" "}
          <span className="font-semibold">+ Saisir une transaction</span>{" "}
          ci-dessus pour enregistrer ton premier achat.
        </p>
      </Card>
    );
  }

  const requireRate = holding.currency === "USD";

  const onSaveEdit = (id: string, patch: Partial<Transaction>) => {
    if (
      patch.quantity !== undefined && patch.quantity <= 0 ||
      patch.pricePerUnit !== undefined && patch.pricePerUnit <= 0
    ) {
      toast.error("Quantité et prix doivent être > 0");
      return;
    }
    if (
      requireRate &&
      patch.exchangeRate !== undefined &&
      patch.exchangeRate <= 0
    ) {
      toast.error("Taux EUR/USD requis (> 0)");
      return;
    }
    updateTransaction(id, patch);
    toast.success("Transaction mise à jour");
    setEditingId(null);
  };

  const onDelete = (tx: Transaction) => {
    if (!confirm(`Supprimer cette transaction du ${tx.date} ?`)) return;
    deleteTransaction(tx.id);
    toast.success("Transaction supprimée");
  };

  return (
    <Card header={`Transactions (${txs.length})`}>
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-blueberry-700/30">
              <Th>Date</Th>
              <Th>Type</Th>
              <Th align="right">Qté</Th>
              <Th align="right">Prix</Th>
              {requireRate && <Th align="right">Taux EUR/USD</Th>}
              <Th align="right">Frais</Th>
              <Th align="right">&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx, i) =>
              editingId === tx.id ? (
                <EditTxRow
                  key={tx.id}
                  tx={tx}
                  requireRate={requireRate}
                  onCancel={() => setEditingId(null)}
                  onSave={(patch) => onSaveEdit(tx.id, patch)}
                />
              ) : (
                <tr
                  key={tx.id}
                  className={
                    i % 2 === 0
                      ? "bg-blueberry-100/15"
                      : "hover:bg-blueberry-200/15"
                  }
                >
                  <Td mono>{tx.date}</Td>
                  <Td>
                    <span
                      className={
                        tx.type === "buy"
                          ? "font-bold text-lime-700"
                          : "font-bold text-strawberry-700"
                      }
                    >
                      {tx.type === "buy" ? "Achat" : "Vente"}
                    </span>
                  </Td>
                  <Td mono align="right">
                    {formatQuantity(tx.quantity, holding.type === "crypto" ? 8 : 4)}
                  </Td>
                  <Td mono align="right">
                    {formatQuantity(tx.pricePerUnit, 4)}
                    {holding.currency === "USD" ? " $" : " €"}
                  </Td>
                  {requireRate && (
                    <Td mono align="right">
                      {tx.exchangeRate ? formatQuantity(tx.exchangeRate, 4) : "—"}
                    </Td>
                  )}
                  <Td mono align="right">
                    {tx.fees ? formatEuro(tx.fees) : "—"}
                  </Td>
                  <Td align="right">
                    <div className="inline-flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingId(tx.id)}
                        className="text-[10.5px] font-bold uppercase tracking-wider text-blueberry-700 hover:underline"
                      >
                        Modif
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(tx)}
                        className="text-[10.5px] font-bold uppercase tracking-wider text-strawberry-700 hover:underline"
                      >
                        Suppr
                      </button>
                    </div>
                  </Td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function EditTxRow({
  tx,
  requireRate,
  onCancel,
  onSave,
}: {
  tx: Transaction;
  requireRate: boolean;
  onCancel: () => void;
  onSave: (patch: Partial<Transaction>) => void;
}) {
  const [v, setV] = useState({
    date: tx.date,
    type: tx.type,
    quantity: tx.quantity,
    pricePerUnit: tx.pricePerUnit,
    fees: tx.fees,
    exchangeRate: tx.exchangeRate ?? 0,
  });

  const save = () => {
    onSave({
      date: v.date,
      type: v.type,
      quantity: v.quantity,
      pricePerUnit: v.pricePerUnit,
      fees: v.fees,
      exchangeRate: requireRate ? v.exchangeRate : undefined,
    });
  };

  return (
    <tr className="bg-lime-100/30">
      <Td>
        <input
          type="date"
          value={v.date}
          onChange={(e) => setV((s) => ({ ...s, date: e.target.value }))}
          className="w-full h-7 px-2 rounded-[6px] text-[11px] font-mono bg-white/95 border border-blueberry-700/40"
        />
      </Td>
      <Td>
        <select
          value={v.type}
          onChange={(e) =>
            setV((s) => ({ ...s, type: e.target.value as "buy" | "sell" }))
          }
          className="w-full h-7 px-2 rounded-[6px] text-[11px] bg-white/95 border border-blueberry-700/40"
        >
          <option value="buy">Achat</option>
          <option value="sell">Vente</option>
        </select>
      </Td>
      <Td align="right">
        <input
          type="number"
          step="0.00000001"
          value={v.quantity || ""}
          onChange={(e) =>
            setV((s) => ({ ...s, quantity: Number(e.target.value) }))
          }
          className="w-full h-7 px-2 rounded-[6px] text-[11px] font-mono text-right bg-white/95 border border-blueberry-700/40"
        />
      </Td>
      <Td align="right">
        <input
          type="number"
          step="0.0001"
          value={v.pricePerUnit || ""}
          onChange={(e) =>
            setV((s) => ({ ...s, pricePerUnit: Number(e.target.value) }))
          }
          className="w-full h-7 px-2 rounded-[6px] text-[11px] font-mono text-right bg-white/95 border border-blueberry-700/40"
        />
      </Td>
      {requireRate && (
        <Td align="right">
          <input
            type="number"
            step="0.0001"
            value={v.exchangeRate || ""}
            onChange={(e) =>
              setV((s) => ({ ...s, exchangeRate: Number(e.target.value) }))
            }
            className="w-full h-7 px-2 rounded-[6px] text-[11px] font-mono text-right bg-white/95 border border-blueberry-700/40"
          />
        </Td>
      )}
      <Td align="right">
        <input
          type="number"
          step="0.01"
          value={v.fees || ""}
          onChange={(e) =>
            setV((s) => ({ ...s, fees: Number(e.target.value) }))
          }
          className="w-full h-7 px-2 rounded-[6px] text-[11px] font-mono text-right bg-white/95 border border-blueberry-700/40"
        />
      </Td>
      <Td align="right">
        <div className="inline-flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            className="text-[10.5px] font-bold uppercase tracking-wider text-lime-700 hover:underline"
          >
            ✓ OK
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-[10.5px] font-bold uppercase tracking-wider text-blueberry-700/70 hover:underline"
          >
            Annuler
          </button>
        </div>
      </Td>
    </tr>
  );
}

function Stat({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: "pos" | "neg" | "neutral";
}) {
  const toneClass =
    tone === "pos"
      ? "text-lime-700"
      : tone === "neg"
        ? "text-strawberry-700"
        : "text-blueberry-900";
  return (
    <div>
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/70">
        {label}
      </dt>
      <dd
        className={cn(
          "num mt-0.5",
          bold ? "text-[18px] font-bold" : "text-[14px]",
          toneClass,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className="
        px-2.5 py-2
        text-[10px] font-extrabold uppercase tracking-[0.06em]
        text-blueberry-800/75 [text-shadow:0_1px_0_rgba(255,255,255,0.7)]
        bg-gradient-to-b from-[rgba(220,235,250,0.6)] to-[rgba(195,215,235,0.6)]
      "
      style={{ textAlign: align ?? "left" }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  mono,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      className={[
        "px-2.5 py-2 border-b border-blueberry-700/10 text-[#1a1a1a]",
        mono ? "font-mono tabular-nums text-[11px]" : "",
      ].join(" ")}
      style={{ textAlign: align ?? "left" }}
    >
      {children}
    </td>
  );
}
