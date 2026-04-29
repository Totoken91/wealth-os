import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { Card } from "@/components/ui/Card";

export default function DashboardPage() {
  return (
    <div>
      <NetWorthCard
        value={71240}
        monthDelta={1240}
        monthDeltaPct={1.8}
        ytdDelta={8940}
      />

      <Card header="À venir aux prochains paliers">
        <p className="text-sm text-blueberry-900/80">
          Courbe d&apos;évolution 90 jours, donut d&apos;allocation, quick
          actions, top objectif et table des positions.
        </p>
        <p className="mt-3 text-sm">
          <a
            href="/kitchen"
            className="font-semibold text-blueberry-700 underline-offset-4 hover:underline"
          >
            → Voir les atomiques (/kitchen)
          </a>
        </p>
      </Card>
    </div>
  );
}
