"use client";

import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Toggle } from "@/components/ui/Toggle";
import { formatEuro } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import type { DcaCadence } from "@/types";

const CADENCE_LABEL: Record<DcaCadence, string> = {
  weekly: "Hebdo",
  biweekly: "Bimensuel",
  monthly: "Mensuel",
};

const DOW_LABEL = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function describeSchedule(
  cadence: DcaCadence,
  day: number,
): string {
  if (cadence === "weekly") return `tous les ${DOW_LABEL[day] ?? "?"}`;
  if (cadence === "biweekly") return `un ${DOW_LABEL[day] ?? "?"} sur deux`;
  return `le ${day} de chaque mois`;
}

export function DcaRulesList() {
  const rules = useWealthStore((s) => s.dcaRules);
  const holdings = useWealthStore((s) => s.holdings);
  const updateDcaRule = useWealthStore((s) => s.updateDcaRule);
  const deleteDcaRule = useWealthStore((s) => s.deleteDcaRule);

  if (rules.length === 0) {
    return null;
  }

  const totalWeekly = rules
    .filter((r) => r.enabled)
    .reduce((sum, r) => {
      const factor =
        r.cadence === "weekly" ? 1 : r.cadence === "biweekly" ? 0.5 : 12 / 52;
      return sum + r.amount * factor;
    }, 0);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Supprimer la règle DCA pour ${name} ?`)) {
      deleteDcaRule(id);
      toast.success("Règle supprimée");
    }
  };

  return (
    <Card
      header={`Règles DCA (${rules.length}) — ${formatEuro(totalWeekly)}/sem équivalent`}
    >
      <ul className="space-y-2">
        {rules.map((r) => {
          const holding = holdings.find((h) => h.id === r.holdingId);
          return (
            <li
              key={r.id}
              className={cn(
                "flex flex-wrap items-center gap-3 py-2 px-3 rounded-[10px] border",
                r.enabled
                  ? "bg-blueberry-100/25 border-blueberry-700/20"
                  : "bg-white/40 border-blueberry-700/10 opacity-60",
              )}
            >
              <Toggle
                checked={r.enabled}
                onChange={(v) => updateDcaRule(r.id, { enabled: v })}
                labelOn="ON"
                labelOff="OFF"
              />
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-bold text-blueberry-900">
                  {holding?.ticker ?? "?"}
                </span>
                {holding && <Pill flavor={holding.type}>{holding.type}</Pill>}
                <span className="num text-[12px] font-bold text-blueberry-900">
                  {formatEuro(r.amount)}
                </span>
                <span className="text-[11px] text-blueberry-900/65">
                  {CADENCE_LABEL[r.cadence]} · {describeSchedule(r.cadence, r.dayOfPeriod)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(r.id, holding?.ticker ?? r.id)}
                className="text-[10.5px] font-bold uppercase tracking-wider text-strawberry-700 hover:underline"
              >
                Suppr
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
