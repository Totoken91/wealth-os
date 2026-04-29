import Link from "next/link";
import { LiveNetWorthCard } from "@/components/dashboard/LiveNetWorthCard";
import { Card } from "@/components/ui/Card";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";

export default function DashboardPage() {
  return (
    <div>
      <LiveNetWorthCard />
      <DashboardEmptyState />

      <Card header="Aux prochains paliers">
        <p className="text-sm text-blueberry-900/80">
          Courbe d&apos;évolution 90j, donut d&apos;allocation, quick actions,
          objectifs, table positions et formulaire DCA.
        </p>
        <p className="mt-3 text-sm flex gap-4">
          <Link
            href="/settings"
            className="font-semibold text-blueberry-700 underline-offset-4 hover:underline"
          >
            → Préférences & sauvegarde
          </Link>
          <Link
            href="/kitchen"
            className="font-semibold text-blueberry-700 underline-offset-4 hover:underline"
          >
            → Kitchen UI
          </Link>
        </p>
      </Card>
    </div>
  );
}
