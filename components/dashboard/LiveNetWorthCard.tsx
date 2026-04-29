"use client";

import { useMemo } from "react";
import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import {
  calculateTotalNet,
  findSnapshotNear,
} from "@/lib/finance";
import { useWealthStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import type { AppState } from "@/types";

function deriveDeltas(state: AppState, totalNet: number) {
  const now = new Date();

  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthBaseline = findSnapshotNear(state.snapshots, monthAgo, 7);

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const ytdBaseline = findSnapshotNear(state.snapshots, yearStart, 30);

  const monthDelta = monthBaseline
    ? totalNet - monthBaseline.totalNet
    : undefined;
  const monthDeltaPct =
    monthBaseline && monthBaseline.totalNet !== 0
      ? ((totalNet - monthBaseline.totalNet) / monthBaseline.totalNet) * 100
      : undefined;
  const ytdDelta = ytdBaseline
    ? totalNet - ytdBaseline.totalNet
    : undefined;

  return { monthDelta, monthDeltaPct, ytdDelta };
}

export function LiveNetWorthCard() {
  const hydrated = useHydrated();
  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const vehicles = useWealthStore((s) => s.vehicles);
  const snapshots = useWealthStore((s) => s.snapshots);
  const goals = useWealthStore((s) => s.goals);
  const dcaRules = useWealthStore((s) => s.dcaRules);
  const settings = useWealthStore((s) => s.settings);

  const { totalNet, monthDelta, monthDeltaPct, ytdDelta } = useMemo(() => {
    const state: AppState = {
      holdings,
      transactions,
      vehicles,
      snapshots,
      goals,
      dcaRules,
      settings,
    };
    const total = calculateTotalNet(state);
    const deltas = deriveDeltas(state, total);
    return { totalNet: total, ...deltas };
  }, [holdings, transactions, vehicles, snapshots, goals, dcaRules, settings]);

  if (!hydrated) {
    return <NetWorthCard value={0} />;
  }

  return (
    <NetWorthCard
      value={totalNet}
      monthDelta={monthDelta}
      monthDeltaPct={monthDeltaPct}
      ytdDelta={ytdDelta}
    />
  );
}
