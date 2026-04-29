"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useWealthStore } from "@/lib/store";

export function QuickActionsCard() {
  const takeSnapshot = useWealthStore((s) => s.takeSnapshot);
  const exportState = useWealthStore((s) => s.exportState);

  const handleSnapshot = () => {
    takeSnapshot();
    toast.success("Snapshot enregistré", {
      description: "Le point d'aujourd'hui est figé dans l'historique.",
    });
  };

  const handleExport = () => {
    const data = exportState();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `wealth-os-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Export téléchargé");
  };

  return (
    <Card header="Actions rapides">
      <div className="flex flex-col gap-2">
        <Link href="/dca" className="inline-block">
          <Button variant="tangerine" className="w-full">
            + Saisir DCA
          </Button>
        </Link>
        <Link href="/positions" className="inline-block">
          <Button variant="grape" className="w-full">
            Mettre à jour prix
          </Button>
        </Link>
        <Button variant="lime" className="w-full" onClick={handleSnapshot}>
          Snapshot manuel
        </Button>
        <Button variant="neutral" className="w-full" onClick={handleExport}>
          Exporter données
        </Button>
      </div>
    </Card>
  );
}
