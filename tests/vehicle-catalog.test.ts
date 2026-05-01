import { describe, expect, it } from "vitest";
import {
  estimateCurrentValue,
  residualFactor,
  searchCatalog,
  availableYears,
  getCatalogEntry,
} from "@/lib/vehicle-catalog";

describe("residualFactor", () => {
  it("returns 1 at age 0", () => {
    expect(residualFactor("compacte", 0)).toBe(1);
  });

  it("drops ~22% the first year on a citadine", () => {
    const r = residualFactor("citadine", 1);
    expect(r).toBeCloseTo(0.78, 2);
  });

  it("never goes below floor", () => {
    expect(residualFactor("citadine", 60)).toBeGreaterThanOrEqual(0.10);
    expect(residualFactor("citadine", 60)).toBeLessThan(0.15);
  });

  it("iconic models depreciate much slower", () => {
    const normal = residualFactor("sportive", 5);
    const iconic = residualFactor("sportive", 5, true);
    expect(iconic).toBeGreaterThan(normal);
    expect(iconic).toBeGreaterThan(0.7);
  });

  it("supercar floor stays high", () => {
    expect(residualFactor("supercar", 30)).toBeGreaterThanOrEqual(0.45);
  });
});

describe("estimateCurrentValue", () => {
  it("computes a fresh GR Supra A90 3.0L at near-MSRP", () => {
    const supra = getCatalogEntry("toyota-gr-supra-3.0");
    expect(supra).toBeDefined();
    const est = estimateCurrentValue(supra!, 2024, new Date("2024-08-01"));
    expect(est.estimatedValue).toBeGreaterThan(supra!.msrpEur * 0.9);
    expect(est.residualPct).toBeGreaterThan(0.9);
  });

  it("computes a 5-year-old Yamaha MT-07 at sensible value", () => {
    const mt = getCatalogEntry("yamaha-mt-07-2014");
    const est = estimateCurrentValue(mt!, 2018, new Date("2024-01-01"));
    expect(est.estimatedValue).toBeLessThan(mt!.msrpEur);
    expect(est.estimatedValue).toBeGreaterThan(mt!.msrpEur * 0.3);
    expect(est.annualDepreciationRate).toBeGreaterThan(0);
    expect(est.annualDepreciationRate).toBeLessThan(0.2);
  });

  it("returns a positive annual depreciation rate", () => {
    const e = getCatalogEntry("peugeot-208-allure-ii")!;
    const est = estimateCurrentValue(e, 2022, new Date("2026-01-01"));
    expect(est.annualDepreciationRate).toBeGreaterThan(0);
  });

  it("applies a mileage penalty above the expected average", () => {
    const mx5 = getCatalogEntry("mazda-mx-5-nd-1.5")!;
    const baseline = estimateCurrentValue(mx5, 2018, new Date("2026-05-01"));
    const highKm = estimateCurrentValue(
      mx5,
      2018,
      new Date("2026-05-01"),
      120_000, // ~7 years × 15k = 105k expected → 15k over
    );
    expect(highKm.estimatedValue).toBeLessThan(baseline.estimatedValue);
  });

  it("applies a small mileage bonus below average", () => {
    const mx5 = getCatalogEntry("mazda-mx-5-nd-1.5")!;
    const baseline = estimateCurrentValue(mx5, 2018, new Date("2026-05-01"));
    const lowKm = estimateCurrentValue(
      mx5,
      2018,
      new Date("2026-05-01"),
      40_000, // very low for a 7-year-old car
    );
    expect(lowKm.estimatedValue).toBeGreaterThan(baseline.estimatedValue);
  });

  it("strips the iconic premium when mileage > 1.5× average", () => {
    // MX-5 ND 2.0 keeps the iconic flag (the desirable trim).
    const mx5_20 = getCatalogEntry("mazda-mx-5-nd-2.0")!;
    expect(mx5_20.iconic).toBe(true);
    const stripped = estimateCurrentValue(
      mx5_20,
      2018,
      new Date("2026-05-01"),
      200_000, // ~190% of expected (105k) → above 1.5× → strips iconic
    );
    const stillIconic = estimateCurrentValue(
      mx5_20,
      2018,
      new Date("2026-05-01"),
      105_000, // exactly average → keeps iconic
    );
    expect(stripped.estimatedValue).toBeLessThan(stillIconic.estimatedValue * 0.7);
  });

  it("never returns more than 110% of the MSRP-adjusted residual", () => {
    const mx5 = getCatalogEntry("mazda-mx-5-nd-1.5")!;
    const veryLow = estimateCurrentValue(
      mx5,
      2018,
      new Date("2026-05-01"),
      0,
    );
    expect(veryLow.residualPct).toBeLessThanOrEqual(1.10);
  });
});

describe("searchCatalog", () => {
  it("finds the Supra by token", () => {
    const results = searchCatalog("supra");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].brand).toBe("Toyota");
    expect(results[0].model).toContain("Supra");
  });

  it("finds an MT-07 with brand + model tokens", () => {
    const results = searchCatalog("yamaha mt 07");
    expect(results.some((r) => r.id.includes("mt-07"))).toBe(true);
  });

  it("filters by category", () => {
    const motos = searchCatalog("", { category: "motorcycle", limit: 200 });
    expect(motos.every((r) => r.category === "motorcycle")).toBe(true);
  });

  it("returns empty when no token matches", () => {
    expect(searchCatalog("zzqxnope")).toHaveLength(0);
  });

  it("handles accent-insensitive matching", () => {
    expect(searchCatalog("tenere").length).toBeGreaterThan(0);
    expect(searchCatalog("ténéré").length).toBeGreaterThan(0);
  });
});

describe("availableYears", () => {
  it("lists years from yearStart up to yearEnd inclusive, descending", () => {
    const e = getCatalogEntry("yamaha-mt-07-2014")!;
    const years = availableYears(e);
    expect(years[0]).toBe(2020);
    expect(years[years.length - 1]).toBe(2014);
  });

  it("uses current year when production is ongoing", () => {
    const e = getCatalogEntry("yamaha-mt-09-2021")!;
    const years = availableYears(e);
    expect(years[0]).toBeGreaterThanOrEqual(2025);
  });
});
