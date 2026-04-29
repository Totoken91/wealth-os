"use client";

import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";
import type { HoldingType } from "@/types";

const CATEGORIES: HoldingType[] = ["etf", "crypto", "stock", "cash"];

const LABELS: Record<HoldingType, string> = {
  etf: "ETF",
  crypto: "Crypto",
  stock: "Stocks",
  cash: "Cash",
};

interface Props {
  selected: Set<HoldingType>;
  onToggle: (type: HoldingType) => void;
  onClear: () => void;
}

export function CategoryFilters({ selected, onToggle, onClear }: Props) {
  const all = selected.size === 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onClear}
        className={cn(
          "px-3 py-1 rounded-full border text-[10.5px] font-extrabold uppercase tracking-wider transition-colors",
          all
            ? "bg-blueberry-700 text-white border-black/40 [text-shadow:0_-1px_0_rgba(0,0,0,0.3)]"
            : "bg-white/70 text-blueberry-800 border-blueberry-700/30 hover:bg-white",
        )}
      >
        Tous
      </button>
      {CATEGORIES.map((c) => {
        const active = selected.has(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => onToggle(c)}
            className={cn(
              "transition-transform",
              active ? "scale-105" : "opacity-60 hover:opacity-100",
            )}
            aria-pressed={active}
          >
            <Pill flavor={c}>{LABELS[c]}</Pill>
          </button>
        );
      })}
    </div>
  );
}
