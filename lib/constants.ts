import type { HoldingType, Settings } from "@/types";

export type Flavor =
  | "blueberry"
  | "tangerine"
  | "lime"
  | "strawberry"
  | "grape"
  | "bondi";

/** Mapping fonctionnel catégorie → saveur (brief §3.3) */
export const HOLDING_FLAVOR: Record<HoldingType, Flavor> = {
  etf: "blueberry",
  crypto: "grape",
  stock: "lime",
  cash: "strawberry",
};

export const HOLDING_LABEL: Record<HoldingType, string> = {
  etf: "ETF",
  crypto: "Crypto",
  stock: "Stocks",
  cash: "Cash",
};

export const VEHICLE_FLAVOR: Flavor = "tangerine";

export const STORAGE_KEY = "wealth-os-state-v1";

export const DEFAULT_SETTINGS: Settings = {
  baseCurrency: "EUR",
  defaultAnnualReturn: 0.07,
  defaultVehicleDepreciation: 0.15,
  visualMode: "full",
};
