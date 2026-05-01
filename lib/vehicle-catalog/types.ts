export type VehicleCategory = "car" | "motorcycle";

export type VehicleSegment =
  | "citadine"
  | "compacte"
  | "berline"
  | "break"
  | "suv-compact"
  | "suv-large"
  | "premium"
  | "sportive"
  | "supercar"
  | "ludospace"
  | "utilitaire"
  | "moto-roadster"
  | "moto-sportive"
  | "moto-trail"
  | "moto-gt"
  | "moto-scooter"
  | "moto-cruiser";

export type Fuel =
  | "essence"
  | "diesel"
  | "hybride"
  | "phev"
  | "elec";

export interface CatalogEntry {
  /** Stable id, kebab-case e.g. "toyota-gr-supra-3.0" */
  id: string;
  brand: string;
  model: string;
  /** Optional finition / variant, e.g. "GT", "Allure", "RS Line", "GTI". */
  trim?: string;
  category: VehicleCategory;
  segment: VehicleSegment;
  /** Inclusive first model year. */
  yearStart: number;
  /** Inclusive last model year, or undefined if still in production. */
  yearEnd?: number;
  /** Prix catalogue France au lancement, TTC, en euros. */
  msrpEur: number;
  fuel?: Fuel;
  /** Puissance en ch DIN. */
  power?: number;
  /** Voitures iconiques qui ne se déprécient quasiment plus (Supra A90, MX-5, etc.). */
  iconic?: boolean;
}

export interface ValueEstimate {
  /** Valeur estimée à la date asOf (€). */
  estimatedValue: number;
  /** Pourcentage de la valeur neuve restant, e.g. 0.62 = 62% du neuf. */
  residualPct: number;
  /** Décote annuelle moyenne actuelle (autour de l'âge), pour pré-remplir le champ. */
  annualDepreciationRate: number;
}
