import { PillDelta } from "@/components/ui/PillDelta";
import { formatEuro, formatEuroDelta, formatPct } from "@/lib/formatters";

interface NetWorthCardProps {
  value: number;
  monthDelta: number;
  monthDeltaPct: number;
  ytdDelta: number;
  label?: string;
}

export function NetWorthCard({
  value,
  monthDelta,
  monthDeltaPct,
  ytdDelta,
  label = "Patrimoine net total",
}: NetWorthCardProps) {
  const monthTone = monthDelta > 0 ? "pos" : monthDelta < 0 ? "neg" : "neutral";
  const arrow = monthDelta > 0 ? "▲" : monthDelta < 0 ? "▼" : "▶";
  return (
    <div
      className="
        relative overflow-hidden
        rounded-[18px] px-7 py-[26px] mb-4
        bg-[linear-gradient(135deg,rgba(255,220,180,0.7)_0%,rgba(180,220,250,0.7)_50%,rgba(220,180,240,0.7)_100%)]
        backdrop-blur-[15px] backdrop-saturate-[1.3]
        border-2 border-[rgba(60,100,150,0.4)]
        shadow-[inset_0_2px_0_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.08),0_8px_24px_rgba(40,80,130,0.2)]
      "
    >
      {/* Reflets plastique top-left et bottom-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[30%] -left-[10%] w-[60%] h-full bg-[radial-gradient(ellipse_at_50%_50%,rgba(255,255,255,0.7)_0%,transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[40%] -right-[10%] w-[50%] h-full bg-[radial-gradient(ellipse_at_50%_50%,rgba(255,255,255,0.4)_0%,transparent_60%)]"
      />

      <div className="relative z-[1]">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[rgba(20,50,100,0.8)] [text-shadow:0_1px_0_rgba(255,255,255,0.9)] mb-[6px]">
          ◆ {label}
        </div>
        <div
          className="
            num font-sans font-extralight leading-none
            text-[56px] tracking-[-1.5px] text-[#0a2855]
            [text-shadow:0_2px_0_rgba(255,255,255,0.7),0_-1px_1px_rgba(0,0,0,0.1)]
          "
        >
          {formatEuro(value)}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <PillDelta tone={monthTone}>
            {arrow} {formatEuroDelta(monthDelta)} ({formatPct(monthDeltaPct)}){" "}
            ce mois
          </PillDelta>
          <PillDelta tone="neutral">
            YTD : {formatEuroDelta(ytdDelta)}
          </PillDelta>
        </div>
      </div>
    </div>
  );
}
