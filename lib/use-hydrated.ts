"use client";

import { useEffect, useState } from "react";
import { useWealthStore } from "@/lib/store";

/**
 * Triggers manual rehydration of the persisted Zustand store on mount and
 * exposes a boolean ready flag. Components that read store state should
 * gate UI that depends on persisted data behind this flag to avoid
 * SSR/CSR mismatch flashes.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void useWealthStore.persist.rehydrate()?.then(() => {
      if (!cancelled) setHydrated(true);
    });
    if (useWealthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return () => {
      cancelled = true;
    };
  }, []);
  return hydrated;
}
