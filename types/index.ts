export type HoldingType = "etf" | "crypto" | "stock" | "cash";
export type VehicleType = "car" | "motorcycle" | "other";
export type TransactionType = "buy" | "sell";
export type Currency = "EUR" | "USD";

/**
 * Liquid balances and counterparty positions.
 * - checking / savings : positive contribution to net worth (cash you hold)
 * - debt              : you owe this money (subtracts from net worth)
 * - receivable        : someone owes you this money (adds to net worth)
 *
 * Stored balance is always >= 0; the sign comes from the type.
 */
export type AccountType = "checking" | "savings" | "debt" | "receivable";

export interface Account {
  id: string;
  type: AccountType;
  name: string;
  /** Always positive in storage; sign is implied by `type`. */
  balance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

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
  /** Total kilometres on the odometer at currentValueUpdatedAt. */
  mileageKm?: number;
}

export interface SnapshotBreakdown {
  etf: number;
  crypto: number;
  stock: number;
  /** Cash holdings + checking + savings. */
  cash: number;
  vehicles: number;
  /** Outstanding debts (positive number; subtracts from net worth). */
  debts: number;
  /** Receivables — money owed to you (positive contribution). */
  receivables: number;
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
  /**
   * If set, this goal is a "smart vehicle purchase" : the targetAmount is the
   * vehicle price, the timeline is computed automatically (when to buy + how
   * much to borrow + which mix maximises long-term wealth), and the user does
   * not enter borrowAmount manually.
   */
  vehicleCatalogId?: string;
  /** Model year of the vehicle (lets us redo the price estimate at any time). */
  vehicleModelYear?: number;
  /**
   * Acceptable degradation of projected 10y wealth vs "never buy" baseline,
   * 0..1 (default 0.10 = up to 10% future-wealth lost is OK).
   */
  tolerancePct?: number;
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
  accounts: Account[];
  snapshots: Snapshot[];
  goals: Goal[];
  dcaRules: DcaRule[];
  settings: Settings;
}
