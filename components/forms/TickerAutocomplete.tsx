"use client";

import { useEffect, useRef, useState } from "react";
import { Pill } from "@/components/ui/Pill";
import {
  searchAssets,
  type AssetSearchResult,
} from "@/lib/price-fetcher";
import { cn } from "@/lib/utils";

interface Props {
  onSelect: (asset: AssetSearchResult) => void;
  placeholder?: string;
}

export function TickerAutocomplete({ onSelect, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssetSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const r = await searchAssets(q).catch(() => []);
      setResults(r);
      setHighlight(0);
      setLoading(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  // Click-outside to close
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleSelect = (asset: AssetSearchResult) => {
    onSelect(asset);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        autoComplete="off"
        value={query}
        placeholder={placeholder ?? "Cherche un ticker (BTC, vanguard, AAPL…)"}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onKeyDown={handleKey}
        className="
          w-full h-9 px-3 rounded-[8px]
          text-[13px] text-[#0a2855]
          bg-white/95 border border-blueberry-700/40
          shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),0_1px_0_rgba(255,255,255,0.7)]
          outline-none transition-shadow
          focus:border-blueberry-600 focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),0_0_0_3px_rgba(58,138,204,0.35)]
          placeholder:text-[#0a2855]/35
        "
      />

      {open && (loading || results.length > 0 || query.trim().length >= 2) && (
        <div
          className="
            absolute left-0 right-0 top-[calc(100%+4px)] z-30
            rounded-[10px] bg-white/95 backdrop-blur-md
            border border-blueberry-700/30
            shadow-[0_8px_24px_rgba(40,80,130,0.2),inset_0_1px_0_rgba(255,255,255,1)]
            max-h-[280px] overflow-y-auto
          "
        >
          {loading && (
            <div className="px-3 py-2.5 text-[12px] text-blueberry-900/55">
              Recherche…
            </div>
          )}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div className="px-3 py-2.5 text-[12px] text-blueberry-900/55">
              Aucun résultat — vérifie l&apos;orthographe ou continue à taper.
            </div>
          )}
          {results.map((r, i) => (
            <button
              type="button"
              key={`${r.source}:${r.coingeckoId ?? r.yahooSymbol ?? r.ticker}`}
              onClick={() => handleSelect(r)}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "w-full text-left px-3 py-2 flex items-center gap-2 text-[12px]",
                "border-b border-blueberry-700/10 last:border-none",
                i === highlight ? "bg-blueberry-100/40" : "hover:bg-blueberry-100/25",
              )}
            >
              <span className="font-bold text-blueberry-900 min-w-[60px]">
                {r.ticker}
              </span>
              <Pill flavor={r.type}>{r.type}</Pill>
              <span className="text-blueberry-900/85 truncate flex-1">
                {r.name}
              </span>
              <span className="text-[10.5px] text-blueberry-900/55 whitespace-nowrap">
                {r.currency}
                {r.marketHint ? ` · ${r.marketHint}` : ""}
                {" · "}
                <span
                  className={
                    r.source === "coingecko"
                      ? "text-grape-700"
                      : "text-blueberry-700"
                  }
                >
                  {r.source === "coingecko" ? "CoinGecko" : "Yahoo"}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
