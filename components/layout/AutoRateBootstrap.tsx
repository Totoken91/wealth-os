"use client";

import { useEffect, useRef } from "react";
import { fetchEurUsdRate } from "@/lib/price-fetcher";
import { useWealthStore } from "@/lib/store";

const RATE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const STAMP_KEY = "wealth-os.eurUsdRate.fetchedAt";

/**
 * Mounted once at the root. If the user holds anything in USD and the
 * EUR/USD rate is either missing or older than 24h, refresh it silently in
 * the background. Without this, USD holdings get valued as if their price
 * was already in EUR (calc multiplies by `rate ?? 1`), inflating Visa /
 * Apple / NASDAQ ETFs by ~8-10%.
 */
export function AutoRateBootstrap() {
  const hasUsdHolding = useWealthStore((s) =>
    s.holdings.some((h) => h.currency === "USD"),
  );
  const currentRate = useWealthStore((s) => s.settings.currentEurUsdRate);
  const updateSettings = useWealthStore((s) => s.updateSettings);
  const ranThisLoad = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (ranThisLoad.current) return;
    if (!hasUsdHolding) return;

    const stamp = Number(window.localStorage.getItem(STAMP_KEY) ?? 0);
    const fresh = stamp > 0 && Date.now() - stamp < RATE_TTL_MS;
    if (currentRate && fresh) return;

    ranThisLoad.current = true;
    fetchEurUsdRate()
      .then((rate) => {
        if (typeof rate === "number" && rate > 0) {
          updateSettings({ currentEurUsdRate: rate });
          window.localStorage.setItem(STAMP_KEY, String(Date.now()));
        }
      })
      .catch(() => {
        // Silent: a missing rate falls back to 1 in calculations. The user
        // can still set it manually via Settings or "Mettre à jour les prix".
      });
  }, [hasUsdHolding, currentRate, updateSettings]);

  return null;
}
