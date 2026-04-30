"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Select } from "@/components/ui/Select";
import { formatEuro } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import type { Account, AccountType } from "@/types";

const TYPE_HINT: Record<AccountType, string> = {
  checking: "Compte courant chèque, néobanque, espèces",
  savings: "Livret A, LDDS, livret bancaire, épargne",
  debt: "Crédit conso, prêt familial à rembourser, découvert",
  receivable: "Argent qu'on te doit (avance, prêt familial à toucher)",
};

const TYPE_COLOR: Record<AccountType, string> = {
  checking: "bg-blueberry-100/30 border-blueberry-700/25",
  savings: "bg-lime-100/30 border-lime-700/25",
  debt: "bg-strawberry-100/30 border-strawberry-700/25",
  receivable: "bg-grape-100/30 border-grape-700/25",
};

export default function AccountsPage() {
  const hydrated = useHydrated();
  const accounts = useWealthStore((s) => s.accounts);
  const addAccount = useWealthStore((s) => s.addAccount);
  const updateAccount = useWealthStore((s) => s.updateAccount);
  const deleteAccount = useWealthStore((s) => s.deleteAccount);

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<{
    type: AccountType;
    name: string;
    balance: number | undefined;
    notes: string;
  }>({ type: "checking", name: "", balance: undefined, notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const sections = useMemo(() => {
    const groups: Record<AccountType, Account[]> = {
      checking: [],
      savings: [],
      debt: [],
      receivable: [],
    };
    for (const a of accounts ?? []) {
      groups[a.type].push(a);
    }
    return groups;
  }, [accounts]);

  const totals = useMemo(() => {
    const checking = sections.checking.reduce((s, a) => s + a.balance, 0);
    const savings = sections.savings.reduce((s, a) => s + a.balance, 0);
    const debt = sections.debt.reduce((s, a) => s + a.balance, 0);
    const receivable = sections.receivable.reduce((s, a) => s + a.balance, 0);
    const liquid = checking + savings;
    const net = liquid + receivable - debt;
    return { checking, savings, debt, receivable, liquid, net };
  }, [sections]);

  const resetDraft = () =>
    setDraft({ type: "checking", name: "", balance: undefined, notes: "" });

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.name.trim()) {
      toast.error("Nom requis");
      return;
    }
    if (!draft.balance || draft.balance < 0) {
      toast.error("Solde >= 0 requis");
      return;
    }
    if (editingId) {
      updateAccount(editingId, {
        type: draft.type,
        name: draft.name.trim(),
        balance: draft.balance,
        notes: draft.notes.trim() || undefined,
      });
      toast.success("Compte mis à jour");
    } else {
      addAccount({
        type: draft.type,
        name: draft.name.trim(),
        balance: draft.balance,
        notes: draft.notes.trim() || undefined,
      });
      toast.success("Compte ajouté");
    }
    setEditingId(null);
    resetDraft();
    setShowForm(false);
  };

  const startEdit = (a: Account) => {
    setEditingId(a.id);
    setDraft({
      type: a.type,
      name: a.name,
      balance: a.balance,
      notes: a.notes ?? "",
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetDraft();
    setShowForm(false);
  };

  const handleDelete = (a: Account) => {
    if (!confirm(`Supprimer le compte "${a.name}" ?`)) return;
    deleteAccount(a.id);
    toast.success("Compte supprimé");
  };

  return (
    <div className="text-blueberry-900">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
        ◆ Wealth OS
      </div>
      <div className="mt-1 mb-6 flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="font-sans text-3xl font-extralight tracking-tight">
          Comptes &amp; dettes
        </h1>
        {hydrated && !showForm && (
          <Button variant="lime" onClick={() => setShowForm(true)}>
            + Nouveau compte
          </Button>
        )}
      </div>

      {!hydrated ? (
        <div className="text-blueberry-900/60 text-sm">Chargement…</div>
      ) : (
        <>
          {/* Synthèse */}
          <Card header="Synthèse trésorerie">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <Stat label="Comptes courants" value={formatEuro(totals.checking)} />
              <Stat label="Livrets / Épargne" value={formatEuro(totals.savings)} />
              <Stat
                label="Dettes"
                value={formatEuro(totals.debt)}
                tone={totals.debt > 0 ? "neg" : "neutral"}
              />
              <Stat
                label="Créances"
                value={formatEuro(totals.receivable)}
                tone={totals.receivable > 0 ? "pos" : "neutral"}
              />
              <Stat
                label="Solde net"
                value={formatEuro(totals.net)}
                bold
                tone={totals.net >= 0 ? "pos" : "neg"}
              />
            </div>
          </Card>

          {/* Form */}
          {showForm && (
            <Card header={editingId ? "Modifier le compte" : "Nouveau compte"}>
              <form
                onSubmit={submit}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <Field label="Type">
                  <Select
                    value={draft.type}
                    onChange={(e) =>
                      setDraft((s) => ({
                        ...s,
                        type: e.target.value as AccountType,
                      }))
                    }
                  >
                    <option value="checking">Compte courant</option>
                    <option value="savings">Livret / Épargne</option>
                    <option value="debt">Dette (j&apos;en dois)</option>
                    <option value="receivable">Créance (on me doit)</option>
                  </Select>
                </Field>
                <Field label="Nom" className="sm:col-span-1">
                  <Input
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((s) => ({ ...s, name: e.target.value }))
                    }
                    placeholder={
                      draft.type === "checking"
                        ? "ex: Compte BNP"
                        : draft.type === "savings"
                          ? "ex: Livret A"
                          : draft.type === "debt"
                            ? "ex: Crédit voiture"
                            : "ex: Avance Marc"
                    }
                  />
                </Field>
                <Field label="Solde (€)" hint={`Sera compté ${draft.type === "debt" ? "en NÉGATIF" : "en POSITIF"} dans le patrimoine net`}>
                  <NumberInput
                    value={draft.balance}
                    onChange={(v) => setDraft((s) => ({ ...s, balance: v }))}
                    placeholder="ex: 2500"
                  />
                </Field>
                <Field label="Notes (optionnel)" className="sm:col-span-3">
                  <Input
                    value={draft.notes}
                    onChange={(e) =>
                      setDraft((s) => ({ ...s, notes: e.target.value }))
                    }
                    placeholder={TYPE_HINT[draft.type]}
                  />
                </Field>
                <div className="sm:col-span-3 flex justify-end gap-2">
                  <Button type="button" variant="neutral" onClick={cancelEdit}>
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant={draft.type === "debt" ? "strawberry" : "lime"}
                  >
                    {editingId ? "Enregistrer" : "Ajouter"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Sections */}
          <Section
            title="Comptes courants"
            list={sections.checking}
            emptyHint="Ajoute ton compte chèque pour suivre ta vraie trésorerie."
            onEdit={startEdit}
            onDelete={handleDelete}
            type="checking"
          />
          <Section
            title="Livrets &amp; épargne"
            list={sections.savings}
            emptyHint="Livret A, LDDS, épargne courte — tout ce qui est liquide hors compte courant."
            onEdit={startEdit}
            onDelete={handleDelete}
            type="savings"
          />
          <Section
            title="Dettes"
            list={sections.debt}
            emptyHint="Aucune dette enregistrée. Ajoute crédits conso, découverts, prêts familiaux à rembourser."
            onEdit={startEdit}
            onDelete={handleDelete}
            type="debt"
          />
          <Section
            title="Créances"
            list={sections.receivable}
            emptyHint="Aucune créance. Ajoute l'argent qu'on te doit (note de frais, prêt familial, etc)."
            onEdit={startEdit}
            onDelete={handleDelete}
            type="receivable"
          />

          {accounts.length === 0 && (
            <Card>
              <p className="text-[13px] text-blueberry-900/70">
                Aucun compte enregistré. Clique <span className="font-semibold">+ Nouveau compte</span> ci-dessus pour commencer à suivre ta trésorerie, tes dettes et tes créances.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  list,
  emptyHint,
  onEdit,
  onDelete,
  type,
}: {
  title: string;
  list: Account[];
  emptyHint: string;
  onEdit: (a: Account) => void;
  onDelete: (a: Account) => void;
  type: AccountType;
}) {
  const sum = list.reduce((s, a) => s + a.balance, 0);
  return (
    <Card
      header={
        list.length > 0
          ? `${title} (${list.length}) — ${formatEuro(sum)}`
          : title
      }
    >
      {list.length === 0 ? (
        <p className="text-[12px] text-blueberry-900/55 italic">{emptyHint}</p>
      ) : (
        <ul className="space-y-2">
          {list.map((a) => (
            <li
              key={a.id}
              className={cn(
                "flex flex-wrap items-center gap-3 py-2 px-3 rounded-[10px] border",
                TYPE_COLOR[type],
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-blueberry-900">{a.name}</div>
                {a.notes && (
                  <div className="text-[11px] text-blueberry-900/65 mt-0.5">
                    {a.notes}
                  </div>
                )}
                <div className="text-[10.5px] text-blueberry-900/50 mt-0.5">
                  Maj {a.updatedAt.slice(0, 10)}
                </div>
              </div>
              <div
                className={cn(
                  "num font-mono tabular-nums text-[15px] font-bold",
                  type === "debt"
                    ? "text-strawberry-700"
                    : "text-blueberry-900",
                )}
              >
                {type === "debt" ? "−" : ""}
                {formatEuro(a.balance)}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => onEdit(a)}
                  className="text-[10.5px] font-bold uppercase tracking-wider text-blueberry-700 hover:underline"
                >
                  Modif
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(a)}
                  className="text-[10.5px] font-bold uppercase tracking-wider text-strawberry-700 hover:underline"
                >
                  Suppr
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
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
      <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/70">
        {label}
      </div>
      <div
        className={cn(
          "num mt-0.5",
          bold ? "text-[18px] font-bold" : "text-[14px]",
          toneClass,
        )}
      >
        {value}
      </div>
    </div>
  );
}
