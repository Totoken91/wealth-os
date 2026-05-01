import { CAR_CATALOG } from "./data-cars";
import { MOTO_CATALOG } from "./data-motos";
import type { CatalogEntry } from "./types";

export type { CatalogEntry, ValueEstimate, VehicleSegment } from "./types";
export { estimateCurrentValue, residualFactor } from "./depreciation";

export const VEHICLE_CATALOG: CatalogEntry[] = [...CAR_CATALOG, ...MOTO_CATALOG];

const CATALOG_BY_ID = new Map(
  VEHICLE_CATALOG.map((entry) => [entry.id, entry] as const),
);

export function getCatalogEntry(id: string): CatalogEntry | undefined {
  return CATALOG_BY_ID.get(id);
}

/** Strip accents + lowercase for fuzzy matching. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

interface ScoredEntry {
  entry: CatalogEntry;
  score: number;
}

/**
 * Fuzzy search across brand + model + trim. Tokenized AND match : every
 * search token must appear as a substring of the haystack. The score
 * favors prefix matches and recent year-start.
 */
export function searchCatalog(
  query: string,
  options: { limit?: number; category?: "car" | "motorcycle" } = {},
): CatalogEntry[] {
  const { limit = 30, category } = options;
  const trimmed = query.trim();
  const pool = category
    ? VEHICLE_CATALOG.filter((e) => e.category === category)
    : VEHICLE_CATALOG;

  if (!trimmed) {
    // No query : return most recent / iconic mix sorted by yearStart desc.
    return [...pool]
      .sort((a, b) => b.yearStart - a.yearStart)
      .slice(0, limit);
  }

  const tokens = normalize(trimmed).split(/\s+/).filter(Boolean);
  const scored: ScoredEntry[] = [];

  for (const entry of pool) {
    const haystack = normalize(
      `${entry.brand} ${entry.model} ${entry.trim ?? ""}`,
    );
    const haystackBrand = normalize(entry.brand);
    const haystackModel = normalize(entry.model);

    let allMatch = true;
    let score = 0;
    for (const tok of tokens) {
      const pos = haystack.indexOf(tok);
      if (pos < 0) {
        allMatch = false;
        break;
      }
      score += 100 - Math.min(pos, 50); // earlier = better
      if (haystackBrand.startsWith(tok)) score += 50;
      if (haystackModel.startsWith(tok)) score += 80;
      if (haystackModel === tok) score += 200;
    }
    if (!allMatch) continue;

    score += Math.min(entry.yearStart - 2000, 25); // recency bonus
    if (entry.iconic) score += 5;
    scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}

/** Years available for a given entry (inclusive of yearEnd or current year). */
export function availableYears(entry: CatalogEntry): number[] {
  const lastYear = entry.yearEnd ?? new Date().getFullYear();
  const out: number[] = [];
  for (let y = lastYear; y >= entry.yearStart; y--) out.push(y);
  return out;
}
