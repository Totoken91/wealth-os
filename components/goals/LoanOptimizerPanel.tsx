"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import {
  calculateBreakdown,
  calculateObservedMonthlySavings,
  monthlyAnnuity,
  optimizeFinancing,
  type FinancingProjection,
} from "@/lib/finance";
import { formatEuro } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";
import type { AppState, Goal } from "@/types";

interface Props {
  goal: Goal;
  onClose: () => void;
}

interface Inputs {
  downPayment: number;
  loanDurationMonths: number;
  creditRate: number;
  maxMonthlyPayment: number;
  reservedWealth: number;
  horizonYears: number;
  expectedReturn: number;
}

const DURATION_CHOICES = [12, 24, 36, 48, 60, 72, 84];

export function LoanOptimizerPanel({ goal, onClose }: Props) {
  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const vehicles = useWealthStore((s) => s.vehicles);
  const snapshots = useWealthStore((s) => s.snapshots);
  const goals = useWealthStore((s) => s.goals);
  const dcaRules = useWealthStore((s) => s.dcaRules);
  const settings = useWealthStore((s) => s.settings);

  const state: AppState = useMemo(
    () => ({
      holdings,
      transactions,
      vehicles,
      snapshots,
      goals,
      dcaRules,
      settings,
    }),
    [holdings, transactions, vehicles, snapshots, goals, dcaRules, settings],
  );

  const breakdown = useMemo(() => calculateBreakdown(state), [state]);
  // Liquid wealth = everything except vehicles
  const liquidWealth =
    breakdown.etf + breakdown.crypto + breakdown.stock + breakdown.cash;
  const observedMonthly = calculateObservedMonthlySavings(state) ?? 0;

  // Sensible defaults
  const initial = useMemo<Inputs>(
    () => ({
      downPayment: Math.min(goal.targetAmount, Math.max(0, liquidWealth * 0.5)),
      loanDurationMonths: 60,
      creditRate: 0.05,
      maxMonthlyPayment: Math.min(
        Math.max(observedMonthly * 0.5, 300),
        2000,
      ),
      reservedWealth: Math.max(observedMonthly * 3, 5000),
      horizonYears: 20,
      expectedReturn: settings.defaultAnnualReturn,
    }),
    [goal.targetAmount, liquidWealth, observedMonthly, settings.defaultAnnualReturn],
  );

  const [inputs, setInputs] = useState<Inputs>(initial);

  const set = <K extends keyof Inputs>(key: K, v: Inputs[K]) =>
    setInputs((s) => ({ ...s, [key]: v }));

  const reset = () => setInputs(initial);

  // Manual scenario from current inputs
  const manual = useMemo<FinancingProjection>(() => {
    const loanAmount = Math.max(0, goal.targetAmount - inputs.downPayment);
    const monthly = monthlyAnnuity(
      loanAmount,
      inputs.creditRate,
      inputs.loanDurationMonths,
    );
    const totalInterest = Math.max(
      0,
      monthly * inputs.loanDurationMonths - loanAmount,
    );
    const horizonMonths = Math.max(1, Math.round(inputs.horizonYears * 12));
    const r = inputs.expectedReturn / 12;
    let wealth = liquidWealth - inputs.downPayment;
    for (let m = 1; m <= horizonMonths; m += 1) {
      const contrib =
        m <= inputs.loanDurationMonths
          ? observedMonthly - monthly
          : observedMonthly;
      wealth = wealth * (1 + r) + contrib;
    }
    return {
      downPayment: inputs.downPayment,
      loanAmount,
      loanDurationMonths: inputs.loanDurationMonths,
      creditRate: inputs.creditRate,
      monthlyPayment: monthly,
      totalInterest,
      finalWealth: wealth,
    };
  }, [inputs, goal.targetAmount, liquidWealth, observedMonthly]);

  // Reference scenarios via the optimizer
  const opt = useMemo(
    () =>
      optimizeFinancing({
        targetAmount: goal.targetAmount,
        currentWealth: liquidWealth,
        reservedWealth: inputs.reservedWealth,
        monthlySavings: observedMonthly,
        maxMonthlyPayment: inputs.maxMonthlyPayment,
        maxLoanMonths: 84,
        creditRate: inputs.creditRate,
        expectedReturn: inputs.expectedReturn,
        horizonYears: inputs.horizonYears,
      }),
    [
      goal.targetAmount,
      liquidWealth,
      inputs.reservedWealth,
      observedMonthly,
      inputs.maxMonthlyPayment,
      inputs.creditRate,
      inputs.expectedReturn,
      inputs.horizonYears,
    ],
  );

  const applyOptimal = () => {
    const o = opt.scenarios.optimal;
    setInputs((s) => ({
      ...s,
      downPayment: o.downPayment,
      loanDurationMonths: o.loanDurationMonths || 60,
    }));
  };

  const overpayment = manual.monthlyPayment > inputs.maxMonthlyPayment;
  const underfunded =
    inputs.downPayment > liquidWealth - inputs.reservedWealth;

  return (
    <div className="mt-4 pt-4 border-t border-blueberry-700/15 space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
            ◆ Optimisation cash vs crédit
          </div>
          <div className="text-[11px] text-blueberry-900/65 mt-0.5">
            Liquidités dispo :{" "}
            <span className="num font-bold text-blueberry-900">
              {formatEuro(liquidWealth)}
            </span>
            {observedMonthly > 0 && (
              <>
                {" · épargne observée "}
                <span className="num font-bold text-blueberry-900">
                  {formatEuro(observedMonthly)}/mois
                </span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="text-[18px] font-bold text-blueberry-900/50 hover:text-blueberry-900 leading-none px-2"
        >
          ×
        </button>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <SliderField
          label="Apport cash (€)"
          value={inputs.downPayment}
          min={0}
          max={Math.min(goal.targetAmount, liquidWealth)}
          step={500}
          formatter={(v) => formatEuro(v)}
          onChange={(v) => set("downPayment", v)}
          warning={underfunded ? "Dépasse les liquidités après réserve" : undefined}
        />
        <Field label="Durée crédit">
          <select
            value={inputs.loanDurationMonths}
            onChange={(e) =>
              set("loanDurationMonths", Number(e.target.value))
            }
            className="
              w-full h-9 px-3 rounded-[8px] text-[13px] text-[#0a2855]
              bg-white/95 border border-blueberry-700/40
              shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),0_1px_0_rgba(255,255,255,0.7)]
            "
          >
            {DURATION_CHOICES.map((d) => (
              <option key={d} value={d}>
                {d} mois ({(d / 12).toFixed(0)} ans)
              </option>
            ))}
          </select>
        </Field>
        <SliderField
          label="Taux crédit"
          value={inputs.creditRate}
          min={0}
          max={0.15}
          step={0.0025}
          formatter={(v) => `${(v * 100).toFixed(2)}%`}
          onChange={(v) => set("creditRate", v)}
        />
        <SliderField
          label="Mensualité max supportable"
          value={inputs.maxMonthlyPayment}
          min={0}
          max={Math.max(3000, observedMonthly * 1.2)}
          step={50}
          formatter={(v) => `${formatEuro(v)}/mois`}
          onChange={(v) => set("maxMonthlyPayment", v)}
        />
        <SliderField
          label="Réserve d'urgence"
          value={inputs.reservedWealth}
          min={0}
          max={Math.max(20000, liquidWealth)}
          step={500}
          formatter={(v) => formatEuro(v)}
          onChange={(v) => set("reservedWealth", v)}
        />
        <SliderField
          label="Horizon comparaison"
          value={inputs.horizonYears}
          min={1}
          max={40}
          step={1}
          formatter={(v) => `${v} ans`}
          onChange={(v) => set("horizonYears", v)}
        />
        <SliderField
          label="Rendement attendu portefeuille"
          value={inputs.expectedReturn}
          min={0}
          max={0.15}
          step={0.0025}
          formatter={(v) => `${(v * 100).toFixed(2)}%`}
          onChange={(v) => set("expectedReturn", v)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="lime" onClick={applyOptimal} disabled={!opt.feasible}>
          Optimal selon mes contraintes
        </Button>
        <Button variant="neutral" onClick={reset}>
          Reset valeurs
        </Button>
      </div>

      {/* Manual scenario summary */}
      <div className="rounded-[12px] bg-white/60 border border-blueberry-700/25 px-4 py-3">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/75 mb-1">
          Ton scénario actuel
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
          <Stat
            label="Apport"
            value={formatEuro(manual.downPayment)}
          />
          <Stat
            label="Emprunt"
            value={formatEuro(manual.loanAmount)}
          />
          <Stat
            label="Mensualité"
            value={formatEuro(manual.monthlyPayment)}
            tone={overpayment ? "neg" : undefined}
          />
          <Stat
            label="Intérêts cumulés"
            value={formatEuro(manual.totalInterest)}
          />
          <Stat
            label={`Patrimoine à ${inputs.horizonYears} ans`}
            value={formatEuro(manual.finalWealth)}
            tone="strong"
          />
        </div>
        {overpayment && (
          <div className="mt-2 text-[11px] text-strawberry-700">
            ⚠ Mensualité au-dessus de ton plafond.
          </div>
        )}
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-blueberry-700/30">
              <Th>Stratégie</Th>
              <Th align="right">Apport</Th>
              <Th align="right">Emprunt</Th>
              <Th align="right">Mensualité</Th>
              <Th align="right">Intérêts</Th>
              <Th align="right">{`Patrimoine à ${inputs.horizonYears}a`}</Th>
            </tr>
          </thead>
          <tbody>
            <ScenarioRow
              label="Tout cash"
              p={opt.scenarios.cashOnly}
              best={opt.scenarios.optimal}
            />
            <ScenarioRow
              label="Crédit max"
              p={opt.scenarios.maxLoan}
              best={opt.scenarios.optimal}
            />
            <ScenarioRow
              label="Mix optimal"
              p={opt.scenarios.optimal}
              best={opt.scenarios.optimal}
              highlight
            />
          </tbody>
        </table>
      </div>

      <div className="text-[10.5px] text-blueberry-900/55 italic">
        Hypothèses : ton portefeuille rapporte {(inputs.expectedReturn * 100).toFixed(1)}%/an,
        le crédit te coûte {(inputs.creditRate * 100).toFixed(1)}%/an. Le risque
        de marché et la variance ne sont pas modélisés ici.
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  formatter,
  onChange,
  warning,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatter: (v: number) => string;
  onChange: (v: number) => void;
  warning?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/80">
          {label}
        </div>
        <div className="num text-[12px] font-bold text-blueberry-900">
          {formatter(value)}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1 accent-blueberry-600"
      />
      <div className="mt-1">
        <Input
          mono
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-7 text-[11px]"
        />
      </div>
      {warning && (
        <div className="mt-1 text-[10.5px] text-strawberry-700">{warning}</div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "strong" | "neg";
}) {
  return (
    <div>
      <div className="text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/65">
        {label}
      </div>
      <div
        className={cn(
          "num mt-0.5",
          tone === "strong"
            ? "text-[15px] font-bold text-blueberry-900"
            : tone === "neg"
              ? "text-[13px] font-bold text-strawberry-700"
              : "text-[13px] text-blueberry-900",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ScenarioRow({
  label,
  p,
  best,
  highlight,
}: {
  label: string;
  p: FinancingProjection;
  best: FinancingProjection;
  highlight?: boolean;
}) {
  const isBest = p.finalWealth === best.finalWealth;
  return (
    <tr
      className={cn(
        "border-b border-blueberry-700/10",
        highlight && "bg-lime-100/30",
      )}
    >
      <Td>
        <span className="font-bold text-blueberry-900">{label}</span>
        {isBest && !highlight && (
          <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-lime-700">
            ✓ Meilleur
          </span>
        )}
      </Td>
      <Td mono align="right">
        {formatEuro(p.downPayment)}
      </Td>
      <Td mono align="right">
        {formatEuro(p.loanAmount)}
      </Td>
      <Td mono align="right">
        {p.monthlyPayment > 0 ? formatEuro(p.monthlyPayment) : "—"}
      </Td>
      <Td mono align="right">
        {p.totalInterest > 0 ? formatEuro(p.totalInterest) : "—"}
      </Td>
      <Td mono align="right" className="font-bold text-blueberry-900">
        {formatEuro(p.finalWealth)}
      </Td>
    </tr>
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
      className="px-2.5 py-1.5 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.06em] text-blueberry-800/75 [text-shadow:0_1px_0_rgba(255,255,255,0.7)]"
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
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-2.5 py-2 text-[#1a1a1a]",
        mono && "font-mono tabular-nums text-[11px]",
        className,
      )}
      style={{ textAlign: align ?? "left" }}
    >
      {children}
    </td>
  );
}
