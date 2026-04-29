"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useWealthStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";

export function DashboardEmptyState() {
  const hydrated = useHydrated();
  const isEmpty = useWealthStore(
    (s) => s.holdings.length === 0 && s.vehicles.length === 0,
  );
  if (!hydrated || !isEmpty) return null;

  return (
    <Card header="Premiers pas">
      <p className="text-sm text-blueberry-900/80">
        Aucune donnée pour l&apos;instant. Pour commencer&nbsp;:
      </p>
      <ul className="mt-3 list-disc pl-5 text-[13px] text-blueberry-900/80 space-y-1">
        <li>
          Ajoute une position et une transaction (page DCA, à venir).
        </li>
        <li>
          Ou{" "}
          <Link
            href="/settings"
            className="font-semibold text-blueberry-700 underline-offset-4 hover:underline"
          >
            importe un backup JSON
          </Link>{" "}
          existant depuis les Préférences.
        </li>
      </ul>
    </Card>
  );
}
