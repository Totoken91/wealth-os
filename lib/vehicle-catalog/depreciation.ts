import type { VehicleSegment, CatalogEntry, ValueEstimate } from "./types";

/**
 * Courbes de dépréciation par segment (modèle France 2024-2026).
 * Pour chaque segment :
 *  - y1Drop : décote la première année (% du neuf perdu)
 *  - midRate : décote annuelle composée années 2-7
 *  - lateRate : décote annuelle composée années 7-15
 *  - floor : valeur résiduelle plancher (% du neuf, jamais en-dessous)
 */
interface Curve {
  y1Drop: number;
  midRate: number;
  lateRate: number;
  floor: number;
}

const CURVES: Record<VehicleSegment, Curve> = {
  citadine:        { y1Drop: 0.22, midRate: 0.12, lateRate: 0.06, floor: 0.10 },
  compacte:        { y1Drop: 0.20, midRate: 0.11, lateRate: 0.05, floor: 0.13 },
  berline:         { y1Drop: 0.22, midRate: 0.12, lateRate: 0.05, floor: 0.12 },
  break:           { y1Drop: 0.20, midRate: 0.11, lateRate: 0.05, floor: 0.14 },
  "suv-compact":   { y1Drop: 0.18, midRate: 0.10, lateRate: 0.05, floor: 0.18 },
  "suv-large":     { y1Drop: 0.20, midRate: 0.11, lateRate: 0.05, floor: 0.16 },
  premium:         { y1Drop: 0.24, midRate: 0.13, lateRate: 0.06, floor: 0.13 },
  sportive:        { y1Drop: 0.16, midRate: 0.08, lateRate: 0.04, floor: 0.28 },
  supercar:        { y1Drop: 0.12, midRate: 0.05, lateRate: 0.02, floor: 0.45 },
  ludospace:       { y1Drop: 0.22, midRate: 0.12, lateRate: 0.05, floor: 0.12 },
  utilitaire:      { y1Drop: 0.20, midRate: 0.11, lateRate: 0.05, floor: 0.14 },
  "moto-roadster": { y1Drop: 0.20, midRate: 0.10, lateRate: 0.05, floor: 0.22 },
  "moto-sportive": { y1Drop: 0.22, midRate: 0.12, lateRate: 0.06, floor: 0.20 },
  "moto-trail":    { y1Drop: 0.18, midRate: 0.09, lateRate: 0.04, floor: 0.25 },
  "moto-gt":       { y1Drop: 0.20, midRate: 0.10, lateRate: 0.05, floor: 0.22 },
  "moto-scooter":  { y1Drop: 0.22, midRate: 0.13, lateRate: 0.07, floor: 0.15 },
  "moto-cruiser":  { y1Drop: 0.16, midRate: 0.07, lateRate: 0.03, floor: 0.30 },
};

/** Iconic vehicles (collectors) : décote très douce, plancher haut. */
const ICONIC_CURVE: Curve = {
  y1Drop: 0.08,
  midRate: 0.03,
  lateRate: 0.01,
  floor: 0.55,
};

/**
 * Facteur résiduel à un âge donné (en années, fractionnaire ok).
 * Retourne value/MSRP, borné par le plancher du segment.
 */
export function residualFactor(
  segment: VehicleSegment,
  ageYears: number,
  iconic = false,
): number {
  if (ageYears <= 0) return 1;
  const c = iconic ? ICONIC_CURVE : CURVES[segment];

  let factor: number;
  if (ageYears <= 1) {
    factor = 1 - c.y1Drop * ageYears;
  } else {
    factor = 1 - c.y1Drop;
    const midYears = Math.min(ageYears - 1, 6);
    factor *= Math.pow(1 - c.midRate, midYears);
    if (ageYears > 7) {
      const lateYears = Math.min(ageYears - 7, 8);
      factor *= Math.pow(1 - c.lateRate, lateYears);
    }
    if (ageYears > 15) {
      // Au-delà de 15 ans, la décote ralentit fortement.
      const farYears = ageYears - 15;
      factor *= Math.pow(1 - c.lateRate * 0.4, farYears);
    }
  }
  return Math.max(factor, c.floor);
}

/**
 * Décote annuelle instantanée autour d'un âge — utilisée pour pré-remplir
 * le champ `annualDepreciation` de la fiche véhicule, qui sert ensuite à
 * lisser la valeur entre les snapshots.
 */
function instantaneousAnnualRate(
  segment: VehicleSegment,
  ageYears: number,
  iconic = false,
): number {
  const a = residualFactor(segment, Math.max(0, ageYears), iconic);
  const b = residualFactor(segment, ageYears + 1, iconic);
  if (a <= 0) return 0;
  return Math.max(0, 1 - b / a);
}

export function estimateCurrentValue(
  entry: CatalogEntry,
  modelYear: number,
  asOf: Date = new Date(),
  mileageKm?: number,
): ValueEstimate {
  const referenceDate = new Date(modelYear, 6, 1); // 1er juillet de l'année modèle
  const ageMs = asOf.getTime() - referenceDate.getTime();
  const ageYears = Math.max(0, ageMs / (365.25 * 24 * 3600 * 1000));

  // Mileage normalisation. Reference = 15 000 km/year for cars,
  // 5 000 km/year for motos.
  const annualKmReference =
    entry.category === "motorcycle" ? 5_000 : 15_000;
  const expectedKm = annualKmReference * ageYears;
  const deltaKm =
    mileageKm !== undefined && mileageKm >= 0
      ? mileageKm - expectedKm
      : 0;

  // High-mileage iconic cars / motos lose their collector premium.
  // > 1.5× the expected mileage = "out of collector market".
  const overMileageRatio =
    mileageKm !== undefined && expectedKm > 0
      ? mileageKm / expectedKm
      : 1;
  const treatAsIconic = !!entry.iconic && overMileageRatio <= 1.5;

  const baseResidual = residualFactor(entry.segment, ageYears, treatAsIconic);

  // Mileage adjustment :
  // - 3% deduction per 10 000 km above the reference (4% for sportives/supercar/iconic)
  // - +2% bonus per 10 000 km below the reference, capped at +20%
  // The mileage factor itself is bounded to [0.4, 1.20].
  const sensitivity =
    entry.iconic ||
    entry.segment === "sportive" ||
    entry.segment === "supercar" ||
    entry.segment === "moto-sportive"
      ? 0.04
      : 0.03;

  let mileageFactor = 1;
  if (mileageKm !== undefined && mileageKm >= 0) {
    if (deltaKm > 0) {
      mileageFactor = 1 - sensitivity * (deltaKm / 10_000);
    } else if (deltaKm < 0) {
      // Smaller bonus than penalty: a low km nudges the price up modestly,
      // but doesn't transform a normal car into a unicorn. Cap at +10%.
      mileageFactor = 1 + 0.01 * (-deltaKm / 10_000);
    }
    mileageFactor = Math.min(1.10, Math.max(0.4, mileageFactor));
  }

  const residual = baseResidual * mileageFactor;
  const annual = instantaneousAnnualRate(entry.segment, ageYears, treatAsIconic);
  return {
    estimatedValue: Math.round(entry.msrpEur * residual),
    residualPct: residual,
    annualDepreciationRate: Math.round(annual * 1000) / 1000,
  };
}
