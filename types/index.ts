export type HoldingType = "etf" | "crypto" | "stock" | "cash";
export type VehicleType = "car" | "motorcycle" | "other";
export type TransactionType = "buy" | "sell";
export type Currency = "EUR" | "USD";

export interface Holding {
  id: string;
  type: HoldingType;
  ticker: string;
  name: string;
  currency: Currency;
  currentPrice: number;
  currentPriceUpdatedAt: string;
  /** CoinGecko coin id, e.g. "bitcoin" — for crypto auto price update */
  coingeckoId?: string;
  /** Yahoo Finance symbol, e.g. "WPEA.PA", "AAPL" — for stock/ETF auto price update */
  yahooSymbol?: string;
  notes?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  holdingId: string;
  type: TransactionType;
  date: string;
  quantity: number;
  pricePerUnit: number;
  fees: number;
  /** EUR per 1 USD at the time of the transaction (required for USD holdings) */
  exchangeRate?: number;
  notes?: string;
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  name: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  currentValueUpdatedAt: string;
  /** Annual depreciation rate, e.g. 0.15 for 15%/yr */
  annualDepreciation: number;
}

export interface SnapshotBreakdown {
  etf: number;
  crypto: number;
  stock: number;
  cash: number;
  vehicles: number;
}

export interface Snapshot {
  id: string;
  date: string;
  totalNet: number;
  breakdown: SnapshotBreakdown;
  capitalInvested: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  source: "cash" | "investment" | "mixed";
  /** Amount to be borrowed / not saved (e.g. 15000 € of car loan). */
  borrowAmount?: number;
  /** User-declared monthly savings override; takes priority over observed rate. */
  monthlyOverride?: number;
  notes?: string;
  createdAt: string;
}

export interface Settings {
  baseCurrency: "EUR";
  defaultAnnualReturn: number;
  defaultVehicleDepreciation: number;
  weeklyDcaTarget?: number;
  monthlyDcaTarget?: number;
  /** Current EUR/USD exchange rate (EUR per 1 USD) for live valuation */
  currentEurUsdRate?: number;
  visualMode: "full" | "sage";
  lastDataUpdateReminder?: string;
}

export type DcaCadence = "weekly" | "biweekly" | "monthly";

export interface DcaRule {
  id: string;
  enabled: boolean;
  holdingId: string;
  /** Amount in EUR per occurrence. */
  amount: number;
  cadence: DcaCadence;
  /**
   * For weekly/biweekly: day of week (1 = Monday … 7 = Sunday).
   * For monthly: day of month (1..28).
   */
  dayOfPeriod: number;
  /** First occurrence date, ISO YYYY-MM-DD. */
  startDate: string;
  /** Last occurrence date that was either validated or skipped. */
  lastSettledDate?: string;
  notes?: string;
  createdAt: string;
}

export interface AppState {
  holdings: Holding[];
  transactions: Transaction[];
  vehicles: Vehicle[];
  snapshots: Snapshot[];
  goals: Goal[];
  dcaRules: DcaRule[];
  settings: Settings;
}
