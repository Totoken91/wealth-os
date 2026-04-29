"use client";

import { AllocationDonut } from "@/components/dashboard/AllocationDonut";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { LiveNetWorthCard } from "@/components/dashboard/LiveNetWorthCard";
import { PortfolioLineChart } from "@/components/dashboard/PortfolioLineChart";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { TopPositionsCard } from "@/components/dashboard/TopPositionsCard";
import { useHydrated } from "@/lib/use-hydrated";

export default function DashboardPage() {
  const hydrated = useHydrated();

  return (
    <div>
      <LiveNetWorthCard />

      {!hydrated ? (
        <div className="text-blueberry-900/60 text-sm">Chargement…</div>
      ) : (
        <>
          <DashboardEmptyState />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8">
              <PortfolioLineChart />
            </div>
            <div className="lg:col-span-4">
              <AllocationDonut />
            </div>

            <div className="lg:col-span-4">
              <QuickActionsCard />
            </div>
            <div className="lg:col-span-4">
              <TopPositionsCard />
            </div>
            <div className="lg:col-span-4">
              <RecentActivityCard />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
