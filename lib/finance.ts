import type {
  AppState,
  Goal,
  Holding,
  HoldingType,
  Snapshot,
  SnapshotBreakdown,
  Transaction,
  Vehicle,
} from "@/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function txRate(tx: Transaction): number {
  return tx.exchangeRate ?? 1;
}

/** EUR price per unit at the time of the transaction. */
function txUnitPriceEur(tx: Transaction): number {
  return tx.pricePerUnit * txRate(tx);
}

function holdingCurrentRate(
  holding: Holding,
  currentEurUsdRate?: number,
): number {
  if (holding.currency === "USD") return currentEurUsdRate ?? 1;
  return 1;
}

function dayKey(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date): Date {
  // Monday-based week (FR)
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - diff);
  return out;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/* ------------------------------------------------------------------ */
/* Per-holding calculations                                            */
/* ------------------------------------------------------------------ */

/** Net quantity = Σ buy.qty - Σ sell.qty. */
export function calculateCurrentQuantity(transactions: Transaction[]): number {
  return transactions.reduce((acc, tx) => {
    return acc + (tx.type === "buy" ? tx.quantity : -tx.quantity);
  }, 0);
}

/**
 * Weighted average purchase price in EUR (PRU pondéré).
 * Only buy transactions count, weighted by quantity.
 * Returns 0 when there are no buys.
 */
export function calculateAveragePurchasePrice(
  transactions: Transaction[],
): number {
  let totalQty = 0;
  let totalCost = 0;
  for (const tx of transactions) {
    if (tx.type !== "buy") continue;
    totalQty += tx.quantity;
    totalCost += tx.quantity * txUnitPriceEur(tx);
  }
  if (totalQty === 0) return 0;
  return totalCost / totalQty;
}

/**
 * Current EUR value of a holding using its currentPrice and an optional live
 * EUR/USD rate. If the holding is USD and no rate is supplied, the price is
 * assumed to already be in EUR.
 */
export function calculateCurrentValueEUR(
  holding: Holding,
  transactions: Transaction[],
  currentEurUsdRate?: number,
): number {
  const qty = calculateCurrentQuantity(transactions);
  const eurPrice =
    holding.currentPrice * holdingCurrentRate(holding, currentEurUsdRate);
  return qty * eurPrice;
}

/**
 * Cumulative capital invested in EUR.
 *
 * Brief §5: at buy → capital += qty × price × rate + fees ; at sell → capital
 * is reduced by the EUR value of the AVERAGE purchase price of the sold
 * units (FIFO-equivalent for cost-basis reporting), NOT by the sale proceeds.
 */
export function calculateCapitalInvestedEUR(
  transactions: Transaction[],
): number {
  // Walk transactions chronologically, maintaining a running PRU on buys.
  const sorted = [...transactions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  let qty = 0;
  let costBasisPerUnit = 0; // EUR per unit
  let capital = 0;
  for (const tx of sorted) {
    const unitEur = txUnitPriceEur(tx);
    if (tx.type === "buy") {
      const newQty = qty + tx.quantity;
      // recompute weighted cost basis
      costBasisPerUnit =
        newQty === 0
          ? 0
          : (qty * costBasisPerUnit + tx.quantity * unitEur) / newQty;
      qty = newQty;
      capital += tx.quantity * unitEur + tx.fees;
    } else {
      // sell: reduce capital by qty sold × current PRU
      const removed = Math.min(tx.quantity, qty) * costBasisPerUnit;
      capital -= removed;
      capital += tx.fees; // sell fees still cost real money
      qty = Math.max(0, qty - tx.quantity);
      // PRU per unit is unchanged for remaining units
    }
  }
  return capital;
}

export interface UnrealizedPnL {
  eur: number;
  pct: number;
}

export function calculateUnrealizedPnL(
  holding: Holding,
  transactions: Transaction[],
  currentEurUsdRate?: number,
): UnrealizedPnL {
  const qty = calculateCurrentQuantity(transactions);
  if (qty <= 0) return { eur: 0, pct: 0 };
  const pru = calculateAveragePurchasePrice(transactions);
  const eurPrice =
    holding.currentPrice * holdingCurrentRate(holding, currentEurUsdRate);
  const eur = (eurPrice - pru) * qty;
  const costBasis = pru * qty;
  const pct = costBasis === 0 ? 0 : (eur / costBasis) * 100;
  return { eur, pct };
}

/**
 * Realized PnL across sells, FIFO. Returns total EUR.
 * Buy fees are amortized into cost basis; sell fees reduce realized PnL.
 */
export function calculateRealizedPnL(transactions: Transaction[]): number {
  const sorted = [...transactions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  // Each lot: { qty, costPerUnit }
  const lots: Array<{ qty: number; costPerUnit: number }> = [];
  let realized = 0;
  for (const tx of sorted) {
    const unitEur = txUnitPriceEur(tx);
    if (tx.type === "buy") {
      const cost =
        tx.quantity === 0
          ? unitEur
          : unitEur + tx.fees / tx.quantity; // amortize buy fees
      lots.push({ qty: tx.quantity, costPerUnit: cost });
    } else {
      let remaining = tx.quantity;
      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        const take = Math.min(remaining, lot.qty);
        realized += take * (unitEur - lot.costPerUnit);
        lot.qty -= take;
        remaining -= take;
        if (lot.qty === 0) lots.shift();
      }
      realized -= tx.fees;
    }
  }
  return realized;
}

/* ------------------------------------------------------------------ */
/* Vehicles                                                            */
/* ------------------------------------------------------------------ */

/**
 * Estimated current value of a vehicle today, applying continuous
 * depreciation between manual updates.
 *   value = currentValue × (1 - annualDep)^(daysSinceUpdate / 365)
 */
export function calculateVehicleCurrentValue(
  vehicle: Vehicle,
  now: Date = new Date(),
): number {
  const updated = new Date(vehicle.currentValueUpdatedAt);
  const days = Math.max(0, (now.getTime() - updated.getTime()) / MS_PER_DAY);
  const factor = Math.pow(1 - vehicle.annualDepreciation, days / 365);
  return vehicle.currentValue * factor;
}

/* ------------------------------------------------------------------ */
/* Aggregates                                                          */
/* ------------------------------------------------------------------ */

function transactionsByHolding(
  transactions: Transaction[],
): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const arr = map.get(tx.holdingId);
    if (arr) arr.push(tx);
    else map.set(tx.holdingId, [tx]);
  }
  return map;
}

export function calculateBreakdown(state: AppState): SnapshotBreakdown {
  const result: SnapshotBreakdown = {
    etf: 0,
    crypto: 0,
    stock: 0,
    cash: 0,
    vehicles: 0,
  };
  const txByHolding = transactionsByHolding(state.transactions);
  const rate = state.settings.currentEurUsdRate;
  for (const holding of state.holdings) {
    const txs = txByHolding.get(holding.id) ?? [];
    const value = calculateCurrentValueEUR(holding, txs, rate);
    const bucket = bucketKey(holding.type);
    result[bucket] += value;
  }
  for (const vehicle of state.vehicles) {
    result.vehicles += calculateVehicleCurrentValue(vehicle);
  }
  return result;
}

function bucketKey(type: HoldingType): keyof SnapshotBreakdown {
  return type;
}

export function calculateTotalNet(state: AppState): number {
  const b = calculateBreakdown(state);
  return b.etf + b.crypto + b.stock + b.cash + b.vehicles;
}

export function calculateTotalCapitalInvested(state: AppState): number {
  const txByHolding = transactionsByHolding(state.transactions);
  let total = 0;
  for (const holding of state.holdings) {
    const txs = txByHolding.get(holding.id) ?? [];
    total += calculateCapitalInvestedEUR(txs);
  }
  // Vehicles count toward capital invested at purchase price (one-shot).
  for (const vehicle of state.vehicles) {
    total += vehicle.purchasePrice;
  }
  return total;
}

/* ------------------------------------------------------------------ */
/* Projection                                                          */
/* ------------------------------------------------------------------ */

export interface ProjectionEvent {
  year: number;
  amount: number;
  type: "withdrawal" | "deposit";
}

export interface ProjectionPoint {
  year: number;
  value: number;
  capitalInvested: number;
  gains: number;
}

export interface ProjectionParams {
  initialCapital: number;
  monthlyContribution: number;
  /** Annual return rate, e.g. 0.07 for 7% */
  annualReturn: number;
  years: number;
  events?: ProjectionEvent[];
}

/**
 * Project future portfolio value year-by-year, using a simple annual compound
 * with end-of-year addition of 12 monthly contributions.
 *
 * Events for a given year are applied AFTER the year's growth: deposits add
 * to value AND to capitalInvested; withdrawals remove from value only.
 */
export function projectFutureValue(params: ProjectionParams): ProjectionPoint[] {
  const { initialCapital, monthlyContribution, annualReturn, years, events } =
    params;
  const points: ProjectionPoint[] = [];
  let value = initialCapital;
  let capital = initialCapital;
  // year 0 baseline
  points.push({
    year: 0,
    value,
    capitalInvested: capital,
    gains: value - capital,
  });
  for (let y = 1; y <= years; y += 1) {
    value = value * (1 + annualReturn) + 12 * monthlyContribution;
    capital += 12 * monthlyContribution;
    if (events) {
      for (const ev of events) {
        if (ev.year !== y) continue;
        if (ev.type === "deposit") {
          value += ev.amount;
          capital += ev.amount;
        } else {
          value -= ev.amount;
        }
      }
    }
    points.push({ year: y, value, capitalInvested: capital, gains: value - capital });
  }
  return points;
}

/* ------------------------------------------------------------------ */
/* Snapshots                                                           */
/* ------------------------------------------------------------------ */

export function createSnapshot(state: AppState, id?: string): Snapshot {
  const breakdown = calculateBreakdown(state);
  return {
    id: id ?? `snap-${Date.now()}`,
    date: new Date().toISOString(),
    totalNet: breakdown.etf + breakdown.crypto + breakdown.stock + breakdown.cash + breakdown.vehicles,
    breakdown,
    capitalInvested: calculateTotalCapitalInvested(state),
  };
}

/** True iff there is no snapshot for today yet. */
export function shouldCreateSnapshot(state: AppState, now: Date = new Date()): boolean {
  const today = dayKey(now);
  return !state.snapshots.some((s) => dayKey(s.date) === today);
}

/* ------------------------------------------------------------------ */
/* Goal solver                                                         */
/* ------------------------------------------------------------------ */

const DAYS_PER_MONTH = 30.44; // average

function currentAmountForGoal(goal: Goal, breakdown: SnapshotBreakdown): number {
  if (goal.source === "cash") return breakdown.cash;
  if (goal.source === "investment")
    return breakdown.etf + breakdown.crypto + breakdown.stock;
  return (
    breakdown.etf +
    breakdown.crypto +
    breakdown.stock +
    breakdown.cash +
    breakdown.vehicles
  );
}

/**
 * Observed monthly savings rate based on net-worth deltas over `windowDays`.
 * Picks the oldest snapshot within the window as baseline. Returns null if
 * fewer than 14 days of history (not enough signal).
 */
export function calculateObservedMonthlySavings(
  state: AppState,
  windowDays = 90,
  now: Date = new Date(),
): number | null {
  if (state.snapshots.length === 0) return null;
  const cutoffMs = now.getTime() - windowDays * MS_PER_DAY;
  const minDaysMs = 14 * MS_PER_DAY;
  // Oldest snapshot within window
  const inWindow = state.snapshots
    .map((s) => ({ snap: s, ts: new Date(s.date).getTime() }))
    .filter((x) => x.ts >= cutoffMs && x.ts <= now.getTime())
    .sort((a, b) => a.ts - b.ts);
  if (inWindow.length === 0) return null;
  const baseline = inWindow[0];
  const elapsedMs = now.getTime() - baseline.ts;
  if (elapsedMs < minDaysMs) return null;
  const liveNet = calculateTotalNet(state);
  const elapsedDays = elapsedMs / MS_PER_DAY;
  return ((liveNet - baseline.snap.totalNet) / elapsedDays) * DAYS_PER_MONTH;
}

export type GoalStatus =
  | "reached"
  | "on-track"
  | "ahead"
  | "behind"
  | "unreachable"
  | "unknown";

export interface GoalPlan {
  currentAmount: number;
  effectiveTarget: number;
  remaining: number;
  monthsToTarget: number;
  requiredMonthly: number;
  observedMonthly: number | null;
  declaredMonthly: number | null;
  effectiveMonthly: number;
  projectedReachDate: Date | null;
  daysAhead: number | null;
  status: GoalStatus;
}

/**
 * Required monthly contribution (PMT) to reach FV from PV across `n` monthly
 * periods at monthly rate `r`. Handles r = 0 and n ≤ 0 explicitly.
 */
function requiredPMT(pv: number, fv: number, n: number, r: number): number {
  const remaining = fv - pv;
  if (remaining <= 0) return 0;
  if (n <= 0) return remaining; // must contribute everything immediately
  if (r === 0) return remaining / n;
  const factor = Math.pow(1 + r, n);
  return ((fv - pv * factor) * r) / (factor - 1);
}

/**
 * Project month-by-month from `pv` adding `pmt` each month at monthly rate `r`,
 * until reaching `target` or until cap reached. Returns null if not reached.
 */
function monthsToReach(
  pv: number,
  pmt: number,
  target: number,
  r: number,
  cap = 1200,
): number | null {
  if (pv >= target) return 0;
  if (pmt <= 0 && r <= 0) return null;
  let value = pv;
  for (let m = 1; m <= cap; m += 1) {
    value = value * (1 + r) + pmt;
    if (value >= target) return m;
  }
  return null;
}

export function planForGoal(goal: Goal, state: AppState): GoalPlan {
  const breakdown = calculateBreakdown(state);
  const currentAmount = currentAmountForGoal(goal, breakdown);
  const borrow = goal.borrowAmount ?? 0;
  const effectiveTarget = goal.targetAmount - borrow;
  const remaining = Math.max(0, effectiveTarget - currentAmount);

  const now = new Date();
  const target = new Date(goal.targetDate);
  const monthsToTarget =
    (target.getTime() - now.getTime()) / (MS_PER_DAY * DAYS_PER_MONTH);

  const annualReturn = state.settings.defaultAnnualReturn;
  const monthlyRate = annualReturn / 12;

  const observedMonthly = calculateObservedMonthlySavings(state, 90, now);
  const declaredMonthly =
    goal.monthlyOverride !== undefined && goal.monthlyOverride !== null
      ? goal.monthlyOverride
      : null;
  const effectiveMonthly = declaredMonthly ?? observedMonthly ?? 0;

  const requiredMonthly = requiredPMT(
    currentAmount,
    effectiveTarget,
    monthsToTarget,
    monthlyRate,
  );

  const monthsNeeded = monthsToReach(
    currentAmount,
    effectiveMonthly,
    effectiveTarget,
    monthlyRate,
  );
  const projectedReachDate =
    monthsNeeded === null
      ? null
      : new Date(now.getTime() + monthsNeeded * DAYS_PER_MONTH * MS_PER_DAY);
  const daysAhead =
    projectedReachDate === null
      ? null
      : Math.round(
          (target.getTime() - projectedReachDate.getTime()) / MS_PER_DAY,
        );

  let status: GoalStatus;
  if (currentAmount >= effectiveTarget) {
    status = "reached";
  } else if (declaredMonthly === null && observedMonthly === null) {
    status = "unknown";
  } else if (projectedReachDate === null) {
    status = "unreachable";
  } else if (daysAhead === null) {
    status = "unknown";
  } else if (daysAhead > 30) {
    status = "ahead";
  } else if (daysAhead < -30) {
    status = "behind";
  } else {
    status = "on-track";
  }

  return {
    currentAmount,
    effectiveTarget,
    remaining,
    monthsToTarget,
    requiredMonthly,
    observedMonthly,
    declaredMonthly,
    effectiveMonthly,
    projectedReachDate,
    daysAhead,
    status,
  };
}

/**
 * Find the snapshot whose date is closest to `target` within `toleranceDays`.
 * Returns undefined if none qualify.
 */
export function findSnapshotNear(
  snapshots: Snapshot[],
  target: Date,
  toleranceDays: number,
): Snapshot | undefined {
  const targetMs = target.getTime();
  const tolMs = toleranceDays * MS_PER_DAY;
  let best: Snapshot | undefined;
  let bestDiff = Infinity;
  for (const s of snapshots) {
    const diff = Math.abs(new Date(s.date).getTime() - targetMs);
    if (diff <= tolMs && diff < bestDiff) {
      best = s;
      bestDiff = diff;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* DCA actuals                                                         */
/* ------------------------------------------------------------------ */

function netInvestedEurInRange(
  transactions: Transaction[],
  from: Date,
  to: Date,
): number {
  let total = 0;
  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (d < from || d >= to) continue;
    const sign = tx.type === "buy" ? 1 : -1;
    total += sign * (tx.quantity * txUnitPriceEur(tx));
  }
  return total;
}

export function calculateWeeklyDcaActual(
  transactions: Transaction[],
  weekRef: Date = new Date(),
): number {
  const start = startOfWeek(weekRef);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return netInvestedEurInRange(transactions, start, end);
}

export function calculateMonthlyDcaActual(
  transactions: Transaction[],
  monthRef: Date = new Date(),
): number {
  const start = startOfMonth(monthRef);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return netInvestedEurInRange(transactions, start, end);
}
