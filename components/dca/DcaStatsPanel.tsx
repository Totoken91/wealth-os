"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  calculateMonthlyDcaActual,
  calculateWeeklyDcaActual,
} from "@/lib/finance";
import { formatEuro } from "@/lib/formatters";
import { useWealthStore } from "@/lib/store";

export function DcaStatsPanel() {
  const transactions = useWealthStore((s) => s.transactions);
  const settings = useWealthStore((s) => s.settings);

  const { weekly, monthly } = useMemo(() => {
    const now = new Date();
    return {
      weekly: calculateWeeklyDcaActual(transactions, now),
      monthly: calculateMonthlyDcaActual(transactions, now),
    };
  }, [transactions]);

  return (
    <Card header="Cadence DCA">
      <Row
        title="Cette semaine"
        actual={weekly}
        target={settings.weeklyDcaTarget}
        flavor="lime"
      />
      <div className="mt-4">
        <Row
          title="Ce mois"
          actual={monthly}
          target={settings.monthlyDcaTarget}
          flavor="lime"
        />
      </div>
      {!settings.weeklyDcaTarget && !settings.monthlyDcaTarget && (
        <p className="mt-4 text-[11.5px] text-blueberry-900/55">
          Définis tes objectifs hebdo/mensuels dans{" "}
          <Link
            href="/settings"
            className="font-semibold text-blueberry-700 underline-offset-4 hover:underline"
          >
            Préférences
          </Link>{" "}
          pour voir des jauges.
        </p>
      )}
    </Card>
  );
}

function Row({
  title,
  actual,
  target,
  flavor,
}: {
  title: string;
  actual: number;
  target?: number;
  flavor: "lime" | "tangerine" | "blueberry" | "grape" | "strawberry";
}) {
  const pct = target && target > 0 ? Math.min(100, (actual / target) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-blueberry-800/80">
          {title}
        </div>
        <div className="num text-[14px] font-bold text-blueberry-900">
          {formatEuro(actual)}
          {target ? (
            <span className="text-blueberry-900/55 font-normal text-[11px] ml-1">
              / {formatEuro(target)}
            </span>
          ) : null}
        </div>
      </div>
      {target ? (
        <div className="mt-1.5">
          <ProgressBar value={pct} flavor={flavor} animated />
        </div>
      ) : null}
    </div>
  );
}
