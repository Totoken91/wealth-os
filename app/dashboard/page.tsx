import { Card } from "@/components/ui/Card";

export default function DashboardPage() {
  return (
    <div>
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
        ◆ Wealth OS
      </div>
      <h1 className="mt-1 mb-6 font-sans text-3xl font-extralight tracking-tight text-blueberry-900">
        Palier C — layout iMac G3
      </h1>

      <Card header="Layout fonctionnel">
        <p className="text-sm text-blueberry-900/80">
          Fenêtre plastique translucide, title bar avec traffic lights,
          toolbar avec onglets bonbons, sidebar Blueberry — tout en place.
          Le hero NetWorthCard arrive au Palier D.
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
