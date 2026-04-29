import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TrafficLight } from "@/components/ui/TrafficLight";

export default function KitchenPage() {
  return (
    <main className="relative z-10 mx-auto max-w-[1100px] px-6 py-10 text-blueberry-900">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
        ◆ Wealth OS — Kitchen
      </div>
      <h1 className="mt-2 mb-8 font-sans text-4xl font-extralight tracking-tight">
        Atomiques UI — Palier B
      </h1>

      <Card header="Buttons (5 saveurs)">
        <div className="flex flex-wrap gap-3">
          <Button variant="neutral">Neutral</Button>
          <Button variant="tangerine">Saisir DCA</Button>
          <Button variant="grape">Mettre à jour prix</Button>
          <Button variant="lime">Snapshot manuel</Button>
          <Button variant="blueberry">Dashboard</Button>
          <Button variant="tangerine" disabled>
            Disabled
          </Button>
        </div>
      </Card>

      <Card header="Pills catégorielles (mapping fonctionnel)">
        <div className="flex flex-wrap items-center gap-2">
          <Pill flavor="etf">ETF</Pill>
          <Pill flavor="crypto">Crypto</Pill>
          <Pill flavor="stock">Stocks</Pill>
          <Pill flavor="cash">Cash</Pill>
          <Pill flavor="vehicle">Véhicule</Pill>
        </div>
      </Card>

      <Card header="Traffic lights (Aqua bombés)">
        <div className="flex items-center gap-[9px]">
          <TrafficLight color="red" />
          <TrafficLight color="yellow" />
          <TrafficLight color="green" />
        </div>
      </Card>

      <Card header="Progress bar (style iTunes 2003 stripes)">
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1 text-[11px] font-semibold text-blueberry-800/80">
              Tangerine — 73%
            </div>
            <ProgressBar value={73} flavor="tangerine" />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-blueberry-800/80">
              Lime — 42%
            </div>
            <ProgressBar value={42} flavor="lime" />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-blueberry-800/80">
              Blueberry — 18%
            </div>
            <ProgressBar value={18} flavor="blueberry" />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-blueberry-800/80">
              Grape — 91%
            </div>
            <ProgressBar value={91} flavor="grape" />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-blueberry-800/80">
              Strawberry — 56%
            </div>
            <ProgressBar value={56} flavor="strawberry" />
          </div>
        </div>
      </Card>

      <Card header="Card avec contenu mixte">
        <p className="text-sm text-blueberry-900/80">
          Carte plastique translucide avec backdrop-blur, highlight intérieur
          top blanc et reflet glossy en haut. Chiffres en mono :
          <span className="num ml-2 text-blueberry-900">42 350,75 €</span>
        </p>
      </Card>
    </main>
  );
}
