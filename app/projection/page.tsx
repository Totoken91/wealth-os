"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import {
  projectFutureValue,
  type ProjectionEvent,
} from "@/lib/finance";
import { calculateTotalNet } from "@/lib/finance";
import { formatEuro, formatEuroDelta } from "@/lib/formatters";
import { useWealthStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";

interface FormState {
  initialCapital: number;
  monthlyContribution: number;
  annualReturn: number;
  years: number;
  inflation: number;
  constantEur: boolean;
}

export default function ProjectionPage() {
  const hydrated = useHydrated();
  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const vehicles = useWealthStore((s) => s.vehicles);
  const snapshots = useWealthStore((s) => s.snapshots);
  const goals = useWealthStore((s) => s.goals);
  const dcaRules = useWealthStore((s) => s.dcaRules);
  const settings = useWealthStore((s) => s.settings);

  const liveNet = useMemo(
    () =>
      calculateTotalNet({
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

  const [form, setForm] = useState<FormState>({
    initialCapital: liveNet || 10000,
    monthlyContribution: 500,
    annualReturn: settings.defaultAnnualReturn,
    years: 25,
    inflation: 0.02,
    constantEur: false,
  });
  const [events, setEvents] = useState<ProjectionEvent[]>([]);
  const [draftEvent, setDraftEvent] = useState({
    year: 5,
    amount: 10000,
    type: "withdrawal" as ProjectionEvent["type"],
  });

  const set = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: v }));

  const projections = useMemo(() => {
    const make = (rate: number) =>
      projectFutureValue({
        initialCapital: form.initialCapital,
        monthlyContribution: form.monthlyContribution,
        annualReturn: rate,
        years: form.years,
        events,
      });
    return {
      pessimistic: make(Math.max(0, form.annualReturn - 0.02)),
      median: make(form.annualReturn),
      optimistic: make(form.annualReturn + 0.02),
    };
  }, [form, events]);

  const adjust = (value: number, year: number): number =>
    form.constantEur ? value / Math.pow(1 + form.inflation, year) : value;

  const chartData = useMemo(() => {
    return projections.median.map((p, i) => ({
      year: p.year,
      pessimistic: adjust(projections.pessimistic[i].value, p.year),
      median: adjust(p.value, p.year),
      optimistic: adjust(projections.optimistic[i].value, p.year),
    }));
  }, [projections, form.constantEur, form.inflation]);

  const final = projections.median[projections.median.length - 1];
  const finalPessimistic = projections.pessimistic[projections.pessimistic.length - 1];
  const finalOptimistic = projections.optimistic[projections.optimistic.length - 1];
  const finalReal = final ? adjust(final.value, final.year) : 0;

  const addEvent = () => {
    if (draftEvent.amount <= 0 || draftEvent.year < 1 || draftEvent.year > form.years) return;
    setEvents((prev) =>
      [...prev, draftEvent].sort((a, b) => a.year - b.year),
    );
  };
  const removeEvent = (idx: number) =>
    setEvents((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="text-blueberry-900">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
        ◆ Wealth OS
      </div>
      <h1 className="mt-1 mb-6 font-sans text-3xl font-extralight tracking-tight">
        Projection
      </h1>

      {!hydrated ? (
        <div className="text-blueberry-900/60 text-sm">Chargement…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: Inputs */}
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-4 space-y-0">
              <Card header="Hypothèses">
                <div className="space-y-3">
                  <Field
                    label="Capital initial (€)"
                    hint={`Patrimoine actuel : ${formatEuro(liveNet)}`}
                  >
                    <Input
                      mono
                      type="number"
                      step="100"
                      value={form.initialCapital}
                      onChange={(e) =>
                        set("initialCapital", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="DCA mensuel (€)">
                    <Input
                      mono
                      type="number"
                      step="50"
                      value={form.monthlyContribution}
                      onChange={(e) =>
                        set("monthlyContribution", Number(e.target.value))
                      }
                    />
                  </Field>
                  <SliderField
                    label="Rendement annuel"
                    value={form.annualReturn}
                    min={0}
                    max={0.15}
                    step={0.005}
                    formatter={(v) => `${(v * 100).toFixed(1)}%`}
                    onChange={(v) => set("annualReturn", v)}
                  />
                  <SliderField
                    label="Horizon (années)"
                    value={form.years}
                    min={1}
                    max={40}
                    step={1}
                    formatter={(v) => `${v} ans`}
                    onChange={(v) => set("years", v)}
                  />
                  <SliderField
                    label="Inflation"
                    value={form.inflation}
                    min={0}
                    max={0.05}
                    step={0.001}
                    formatter={(v) => `${(v * 100).toFixed(1)}%`}
                    onChange={(v) => set("inflation", v)}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/80">
                        Affichage
                      </div>
                      <div className="text-[11px] text-blueberry-900/60">
                        € constants = corrigé inflation
                      </div>
                    </div>
                    <Toggle
                      checked={form.constantEur}
                      onChange={(v) => set("constantEur", v)}
                      labelOn="€ constants"
                      labelOff="€ courants"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* CENTER: Chart */}
          <div className="lg:col-span-6">
            <Card header={`Patrimoine projeté sur ${form.years} ans`}>
              <div className="h-[360px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="2 4"
                      stroke="rgba(60,100,150,0.15)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 10, fill: "rgba(20,60,110,0.7)" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(60,100,150,0.25)" }}
                      tickFormatter={(v: number) => `+${v}a`}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "rgba(20,60,110,0.7)" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(60,100,150,0.25)" }}
                      width={70}
                      tickFormatter={(v: number) =>
                        v >= 1_000_000
                          ? `${(v / 1_000_000).toFixed(1)}M €`
                          : v >= 1000
                            ? `${(v / 1000).toFixed(0)}k €`
                            : `${v} €`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(255,255,255,0.95)",
                        border: "1px solid rgba(60,100,150,0.4)",
                        borderRadius: 10,
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                      }}
                      formatter={(value, name) => [
                        typeof value === "number" ? formatEuro(value) : String(value),
                        name === "median"
                          ? "Médian"
                          : name === "pessimistic"
                            ? "Pessimiste (−2pts)"
                            : "Optimiste (+2pts)",
                      ]}
                      labelFormatter={(year) => `Année +${year}`}
                      labelStyle={{ color: "#0a3a6a", fontWeight: 700 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pessimistic"
                      stroke="#e84858"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="median"
                      stroke="#3a7fc4"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="optimistic"
                      stroke="#80c020"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-blueberry-900/70">
                <Legend color="#e84858" label="Pessimiste" />
                <Legend color="#3a7fc4" label="Médian" />
                <Legend color="#80c020" label="Optimiste" />
              </div>
            </Card>

            {final && (
              <Card>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
                  ◆ Dans {form.years} ans (médian)
                </div>
                <div className="num font-sans text-[42px] font-extralight tracking-tight text-blueberry-900 leading-none mt-1">
                  {formatEuro(final.value)}
                </div>
                <div className="mt-2 text-[12px] text-blueberry-900/70">
                  Capital investi :{" "}
                  <span className="num font-bold text-blueberry-900">
                    {formatEuro(final.capitalInvested)}
                  </span>
                  {" · Gains : "}
                  <span className="num font-bold text-lime-700">
                    {formatEuroDelta(final.gains)}
                  </span>
                  {form.constantEur && (
                    <>
                      <br />
                      En € constants (inflation {(form.inflation * 100).toFixed(1)}%) :{" "}
                      <span className="num font-bold text-blueberry-900">
                        {formatEuro(finalReal)}
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-3 flex gap-3 text-[11.5px]">
                  <span className="text-strawberry-700">
                    Pessimiste :{" "}
                    <span className="num font-bold">
                      {formatEuro(finalPessimistic.value)}
                    </span>
                  </span>
                  <span className="text-lime-700">
                    Optimiste :{" "}
                    <span className="num font-bold">
                      {formatEuro(finalOptimistic.value)}
                    </span>
                  </span>
                </div>
              </Card>
            )}
          </div>

          {/* RIGHT: Events */}
          <div className="lg:col-span-3">
            <Card header="Événements futurs">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Année (+N)">
                  <Input
                    mono
                    type="number"
                    min="1"
                    max={form.years}
                    value={draftEvent.year}
                    onChange={(e) =>
                      setDraftEvent((s) => ({
                        ...s,
                        year: Number(e.target.value),
                      }))
                    }
                  />
                </Field>
                <Field label="Montant (€)">
                  <Input
                    mono
                    type="number"
                    step="1000"
                    value={draftEvent.amount}
                    onChange={(e) =>
                      setDraftEvent((s) => ({
                        ...s,
                        amount: Number(e.target.value),
                      }))
                    }
                  />
                </Field>
                <Field label="Type" className="col-span-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={
                        draftEvent.type === "withdrawal" ? "tangerine" : "neutral"
                      }
                      onClick={() =>
                        setDraftEvent((s) => ({ ...s, type: "withdrawal" }))
                      }
                      className="flex-1"
                    >
                      Retrait
                    </Button>
                    <Button
                      type="button"
                      variant={
                        draftEvent.type === "deposit" ? "lime" : "neutral"
                      }
                      onClick={() =>
                        setDraftEvent((s) => ({ ...s, type: "deposit" }))
                      }
                      className="flex-1"
                    >
                      Apport
                    </Button>
                  </div>
                </Field>
                <div className="col-span-2 flex justify-end">
                  <Button variant="blueberry" onClick={addEvent}>
                    + Ajouter
                  </Button>
                </div>
              </div>

              {events.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {events.map((ev, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-[11.5px] py-1 border-b border-dashed border-blueberry-700/15 last:border-none"
                    >
                      <span>
                        <span className="num font-bold">+{ev.year}a</span>{" "}
                        <span
                          className={
                            ev.type === "withdrawal"
                              ? "text-tangerine-700"
                              : "text-lime-700"
                          }
                        >
                          {ev.type === "withdrawal" ? "Retrait" : "Apport"}
                        </span>{" "}
                        <span className="num font-bold">
                          {formatEuro(ev.amount)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEvent(i)}
                        className="text-[10px] font-bold uppercase text-strawberry-700 hover:underline"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {events.length === 0 && (
                <p className="mt-3 text-[11.5px] text-blueberry-900/55">
                  Ajoute des événements (achat immo, voiture, héritage…) pour
                  voir leur impact direct sur la courbe.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}
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
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatter: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
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
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-2.5 h-2.5 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
