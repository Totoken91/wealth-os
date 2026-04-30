"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { NumberInput } from "@/components/ui/NumberInput";
import { fetchEurUsdRate } from "@/lib/price-fetcher";
import { formatEuro } from "@/lib/formatters";
import { useWealthStore } from "@/lib/store";
import type { Holding, Transaction } from "@/types";

interface Bad {
  holding: Holding;
  txs: Transaction[];
  totalUsd: number;
}

/**
 * Global fixer for USD transactions saved before the EUR/USD rate was known.
 * Such transactions have exchangeRate = undefined or 1, which makes the calc
 * treat the USD price as if it were already in EUR (Visa @ 330$ × 9.85 shown
 * as 3 256€ instead of ~2 765€). One click writes the live rate to every
 * flagged transaction across all holdings.
 */
export function BadUsdRatesPanel() {
  const holdings = useWealthStore((s) => s.holdings);
  const transactions = useWealthStore((s) => s.transactions);
  const liveRate = useWealthStore((s) => s.settings.currentEurUsdRate);
  const updateSettings = useWealthStore((s) => s.updateSettings);
  const updateTransaction = useWealthStore((s) => s.updateTransaction);
  const [manualRate, setManualRate] = useState<number | undefined>(undefined);
  const [fetching, setFetching] = useState(false);

  const usdHoldings = useMemo(
    () => holdings.filter((h) => h.currency === "USD"),
    [holdings],
  );

  const groups = useMemo<Bad[]>(() => {
    if (usdHoldings.length === 0) return [];
    const out: Bad[] = [];
    for (const h of usdHoldings) {
      const txs = transactions.filter(
        (t) =>
          t.holdingId === h.id &&
          (t.exchangeRate === undefined ||
            t.exchangeRate === null ||
            t.exchangeRate === 1),
      );
      if (txs.length === 0) continue;
      const totalUsd = txs.reduce(
        (s, t) => s + t.quantity * t.pricePerUnit,
        0,
      );
      out.push({ holding: h, txs, totalUsd });
    }
    return out;
  }, [usdHoldings, transactions]);

  if (groups.length === 0) return null;

  const totalCount = groups.reduce((s, g) => s + g.txs.length, 0);
  const totalUsd = groups.reduce((s, g) => s + g.totalUsd, 0);
  // Effective rate to apply: explicit manual > live > nothing
  const rateToApply =
    manualRate && manualRate > 0 && manualRate < 5
      ? manualRate
      : liveRate && liveRate > 0 && liveRate !== 1
        ? liveRate
        : undefined;
  const beforeEur = totalUsd; // current calc (rate = 1)
  const afterEur = rateToApply ? totalUsd * rateToApply : 0;
  const delta = beforeEur - afterEur;

  const handleFetchRate = async () => {
    setFetching(true);
    try {
      const r = await fetchEurUsdRate();
      updateSettings({ currentEurUsdRate: r });
      setManualRate(r);
      toast.success(`Taux EUR/USD fetché : ${r.toFixed(4)}`);
    } catch (err) {
      toast.error("Échec du fetch", {
        description:
          err instanceof Error
            ? err.message
            : "Saisis le taux à la main ci-dessous.",
      });
    } finally {
      setFetching(false);
    }
  };

  const fixAll = () => {
    if (!rateToApply) {
      toast.error("Taux EUR/USD non disponible", {
        description: "Fetche-le ou saisis-le à la main avant d'appliquer.",
      });
      return;
    }
    if (
      !confirm(
        `Appliquer le taux EUR/USD ${rateToApply.toFixed(4)} à ${totalCount} transaction${totalCount > 1 ? "s" : ""} USD sur ${groups.length} position${groups.length > 1 ? "s" : ""} ?\n\nLe capital investi et les PRU seront recalculés.`,
      )
    ) {
      return;
    }
    let applied = 0;
    for (const g of groups) {
      for (const t of g.txs) {
        updateTransaction(t.id, { exchangeRate: rateToApply });
        applied += 1;
      }
    }
    // Persist the rate in settings if we used a manual override
    if (manualRate && manualRate !== liveRate) {
      updateSettings({ currentEurUsdRate: manualRate });
    }
    toast.success(
      `${applied} transaction${applied > 1 ? "s" : ""} corrigée${applied > 1 ? "s" : ""}`,
      {
        description: `Taux ${rateToApply.toFixed(4)} appliqué — capital recalculé`,
      },
    );
  };

  return (
    <div className="mb-4 px-4 py-3 rounded-[12px] bg-strawberry-100/40 border border-strawberry-700/40 text-[12px] text-strawberry-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <div className="font-bold text-[12.5px] mb-1">
            ⚠ {totalCount} transaction{totalCount > 1 ? "s" : ""} USD avec
            taux historique manquant ({groups.length} position
            {groups.length > 1 ? "s" : ""})
          </div>
          <div className="text-[11.5px] text-strawberry-900/85 leading-snug">
            {groups
              .map(
                (g) =>
                  `${g.holding.ticker} (${g.txs.length} ligne${g.txs.length > 1 ? "s" : ""})`,
              )
              .join(" · ")}
          </div>
          {rateToApply && (
            <div className="text-[11.5px] text-strawberry-900/80 mt-1.5">
              Total affiché en € :{" "}
              <span className="font-mono font-bold">
                {formatEuro(beforeEur)}
              </span>{" "}
              · après correction (taux {rateToApply.toFixed(4)}) :{" "}
              <span className="font-mono font-bold">
                {formatEuro(afterEur)}
              </span>{" "}
              · écart{" "}
              <span className="font-mono font-bold">{formatEuro(delta)}</span>
            </div>
          )}
          {!rateToApply && (
            <div className="text-[11.5px] text-strawberry-900/80 mt-1.5">
              Taux EUR/USD non configuré. Fetche-le automatiquement ou
              saisis-le à la main ci-dessous.
            </div>
          )}
        </div>
        <Button variant="strawberry" onClick={fixAll} disabled={!rateToApply}>
          {rateToApply
            ? `Corriger les ${totalCount} transaction${totalCount > 1 ? "s" : ""}`
            : "Pas de taux"}
        </Button>
      </div>

      <div className="mt-3 pt-3 border-t border-strawberry-700/20 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-strawberry-900/80">
          Taux EUR/USD
        </span>
        <Button
          variant="neutral"
          onClick={handleFetchRate}
          disabled={fetching}
        >
          {fetching ? "Fetch…" : "↻ Fetch automatique"}
        </Button>
        <span className="text-[11px] text-strawberry-900/70">ou</span>
        <div className="w-32">
          <NumberInput
            value={manualRate}
            onChange={(v) => setManualRate(v)}
            placeholder={liveRate ? liveRate.toFixed(4) : "ex: 0.92"}
          />
        </div>
        {liveRate && (
          <span className="text-[10.5px] text-strawberry-900/65">
            actuel : <span className="font-mono">{liveRate.toFixed(4)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
