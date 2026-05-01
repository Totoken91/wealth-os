import type {
  AppState,
  DcaRule,
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
    debts: 0,
    receivables: 0,
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
  for (const account of state.accounts ?? []) {
    const balance = Math.max(0, account.balance);
    if (account.type === "checking" || account.type === "savings") {
      result.cash += balance;
    } else if (account.type === "debt") {
      result.debts += balance;
    } else if (account.type === "receivable") {
      result.receivables += balance;
    }
  }
  return result;
}

function bucketKey(type: HoldingType): keyof SnapshotBreakdown {
  return type;
}

export function calculateTotalNet(state: AppState): number {
  const b = calculateBreakdown(state);
  return (
    b.etf +
    b.crypto +
    b.stock +
    b.cash +
    b.vehicles +
    b.receivables -
    b.debts
  );
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
    totalNet:
      breakdown.etf +
      breakdown.crypto +
      breakdown.stock +
      breakdown.cash +
      breakdown.vehicles +
      breakdown.receivables -
      breakdown.debts,
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
/* Loan optimizer (cash vs credit arbitrage)                           */
/* ------------------------------------------------------------------ */

/** Monthly payment for a fixed-rate amortizing loan. */
export function monthlyAnnuity(
  loan: number,
  annualRate: number,
  months: number,
): number {
  if (loan <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return loan / months;
  const factor = Math.pow(1 + r, months);
  return (loan * r * factor) / (factor - 1);
}

export interface FinancingScenario {
  /** EUR taken from current wealth at purchase. */
  downPayment: number;
  /** EUR borrowed. */
  loanAmount: number;
  loanDurationMonths: number;
  /** Annualised credit rate, e.g. 0.05. */
  creditRate: number;
  /** Computed monthly payment. */
  monthlyPayment: number;
  /** Sum of interest paid over the loan life. */
  totalInterest: number;
}

export interface FinancingProjection extends FinancingScenario {
  /** Wealth after `horizonMonths`, accounting for purchase impact + loan. */
  finalWealth: number;
}

export interface FinancingOptimization {
  scenarios: {
    cashOnly: FinancingProjection;
    maxLoan: FinancingProjection;
    optimal: FinancingProjection;
  };
  feasible: boolean;
  /** Reason if not feasible. */
  reason?: string;
}

interface OptimizeInput {
  targetAmount: number;
  /** Wealth available today (e.g. liquid investments). */
  currentWealth: number;
  /** Wealth to keep untouched after purchase (emergency fund). */
  reservedWealth: number;
  /** Net amount the user can save monthly (already nets fixed expenses). */
  monthlySavings: number;
  /** Maximum monthly loan payment supportable. */
  maxMonthlyPayment: number;
  /** Maximum loan duration in months. */
  maxLoanMonths: number;
  /** Credit annual rate, e.g. 0.05 for 5%. */
  creditRate: number;
  /** Expected annual return on the user's portfolio, e.g. 0.07 for 7%. */
  expectedReturn: number;
  /** Comparison horizon in years. */
  horizonYears: number;
}

function projectScenario(
  input: OptimizeInput,
  downPayment: number,
  loanAmount: number,
  loanDurationMonths: number,
): FinancingProjection {
  const monthly = monthlyAnnuity(
    loanAmount,
    input.creditRate,
    loanDurationMonths,
  );
  const totalInterest = monthly * loanDurationMonths - loanAmount;
  const horizonMonths = Math.max(1, Math.round(input.horizonYears * 12));
  const r = input.expectedReturn / 12;
  let wealth = input.currentWealth - downPayment;
  for (let m = 1; m <= horizonMonths; m += 1) {
    const contrib =
      m <= loanDurationMonths
        ? input.monthlySavings - monthly
        : input.monthlySavings;
    wealth = wealth * (1 + r) + contrib;
  }
  return {
    downPayment,
    loanAmount,
    loanDurationMonths,
    creditRate: input.creditRate,
    monthlyPayment: monthly,
    totalInterest: Math.max(0, totalInterest),
    finalWealth: wealth,
  };
}

const DURATIONS = [12, 24, 36, 48, 60, 72, 84];
const LOAN_STEP = 500; // EUR

/**
 * Search the discretised (loanAmount, duration) space for the mix that
 * maximises projected wealth at the chosen horizon, subject to the
 * monthly-payment cap and reserved-wealth floor.
 *
 * Also returns two reference points: cash-only (no loan) and max-loan
 * (largest loan that fits the constraints).
 */
export function optimizeFinancing(input: OptimizeInput): FinancingOptimization {
  const { targetAmount, currentWealth, reservedWealth } = input;
  const availableCash = Math.max(0, currentWealth - reservedWealth);

  // Cash-only scenario (loan = 0). May be infeasible if user can't fully fund.
  const cashOnly = projectScenario(
    input,
    Math.min(targetAmount, availableCash),
    0,
    0,
  );

  // Max-loan scenario: try the longest accepted duration with the largest loan
  // whose monthly payment fits the cap.
  let maxLoan: FinancingProjection = cashOnly;
  for (let L = targetAmount; L >= 0; L -= LOAN_STEP) {
    for (const d of DURATIONS.filter((d) => d <= input.maxLoanMonths)) {
      const monthly = monthlyAnnuity(L, input.creditRate, d);
      if (monthly > input.maxMonthlyPayment) continue;
      const dp = targetAmount - L;
      if (dp > availableCash) continue;
      maxLoan = projectScenario(input, dp, L, d);
      break;
    }
    if (maxLoan !== cashOnly) break;
  }

  // Search all (L, d) for the best wealth at horizon.
  let optimal: FinancingProjection = cashOnly;
  let feasibleAny = false;
  for (let L = 0; L <= targetAmount; L += LOAN_STEP) {
    const dp = targetAmount - L;
    if (dp < 0 || dp > availableCash) continue;
    feasibleAny = true;
    if (L === 0) {
      // cash-only point already covered
      if (cashOnly.finalWealth > optimal.finalWealth) optimal = cashOnly;
      continue;
    }
    for (const d of DURATIONS.filter((d) => d <= input.maxLoanMonths)) {
      const monthly = monthlyAnnuity(L, input.creditRate, d);
      if (monthly > input.maxMonthlyPayment) continue;
      const proj = projectScenario(input, dp, L, d);
      if (proj.finalWealth > optimal.finalWealth) optimal = proj;
    }
  }
  // Edge step: include exactly targetAmount as max loan if step missed it
  for (const d of DURATIONS.filter((d) => d <= input.maxLoanMonths)) {
    const monthly = monthlyAnnuity(targetAmount, input.creditRate, d);
    if (monthly > input.maxMonthlyPayment) continue;
    const proj = projectScenario(input, 0, targetAmount, d);
    if (proj.finalWealth > optimal.finalWealth) optimal = proj;
  }

  if (!feasibleAny) {
    return {
      scenarios: { cashOnly, maxLoan: cashOnly, optimal: cashOnly },
      feasible: false,
      reason:
        "Apport minimum impossible : pas assez de liquidités après réserve d'urgence.",
    };
  }

  return {
    scenarios: { cashOnly, maxLoan, optimal },
    feasible: true,
  };
}

/* ------------------------------------------------------------------ */
/* Smart goal assessment (combines plan + financing + trajectory)      */
/* ------------------------------------------------------------------ */

export type GoalSmartStatus =
  | "optimal-now"          // can execute optimal financing without compromising trajectory
  | "feasible-tight"       // can execute but eats into reserve / strains
  | "loan-strategic"       // strategy = borrow heavily (return > rate) — keep capital working
  | "wait"                 // not yet feasible at current pace; needs time
  | "out-of-reach";        // even max loan doesn't fit budget

export interface GoalAssessment {
  /** Existing PMT-based plan (kept for backwards compatibility). */
  plan: GoalPlan;
  /** True when the goal is interpreted as a one-shot purchase (borrowAmount > 0). */
  isPurchase: boolean;

  /* Wealth slicing */
  liquidWealth: number;            // accounts (cash + savings) + receivables
  investableWealth: number;        // liquid + ETF + crypto + stocks
  totalWealth: number;             // investable + vehicles - debts
  reservedFloor: number;           // recommended emergency-fund (3 months observed × 12)
  availableForDownPayment: number; // max(0, liquid + investable_sellable - reserved)

  /* Financing optimization (only computed for purchase goals) */
  optimization?: FinancingOptimization;
  creditRate: number;
  maxMonthlyPayment: number;
  horizonYears: number;

  /* Trajectory comparisons (purchase goals only) */
  /** Final wealth at horizon if you skip the purchase entirely. */
  wealthIfSkip: number;
  /** Final wealth at horizon if you buy with the optimal mix. */
  wealthIfBuyOptimal: number;
  /** Final wealth at horizon if you pay everything cash. */
  wealthIfBuyCash: number;
  /** Future wealth lost by buying with the optimal mix vs skipping (positive = costs you). */
  opportunityCostOptimal: number;
  /** Extra wealth gained by financing optimally vs paying cash (positive = leverage helps). */
  loanAdvantageVsCash: number;

  /* Rich status */
  smartStatus: GoalSmartStatus;
  smartHeadline: string;
  smartDetail: string;
}

interface AssessGoalOptions {
  /** Annual credit rate the user expects on a consumer loan, default 0.05. */
  creditRate?: number;
  /** Hard cap on the monthly payment they're willing to commit, default = 50% of observed savings (or 800 €). */
  maxMonthlyPayment?: number;
  /** Months of observed savings to keep as untouched emergency fund, default 3. */
  emergencyFundMonths?: number;
  /** Long-term horizon in years for the trajectory comparison, default 10. */
  horizonYears?: number;
  /** Maximum loan duration in months, default 84. */
  maxLoanMonths?: number;
}

export function assessGoal(
  goal: Goal,
  state: AppState,
  opts: AssessGoalOptions = {},
): GoalAssessment {
  const plan = planForGoal(goal, state);
  const breakdown = calculateBreakdown(state);
  const annualReturn = state.settings.defaultAnnualReturn;
  const observedMonthly = calculateObservedMonthlySavings(state) ?? 0;

  // Defaults
  const creditRate = opts.creditRate ?? 0.05;
  const emergencyFundMonths = opts.emergencyFundMonths ?? 3;
  const horizonYears = opts.horizonYears ?? 10;
  const maxLoanMonths = opts.maxLoanMonths ?? 84;
  const maxMonthlyPayment =
    opts.maxMonthlyPayment ?? Math.max(observedMonthly * 0.5, 800);

  // Wealth slicing
  const liquidWealth =
    breakdown.cash + breakdown.receivables; // accounts already reflect checking + savings
  const investableWealth =
    liquidWealth + breakdown.etf + breakdown.crypto + breakdown.stock;
  const totalWealth =
    investableWealth + breakdown.vehicles - breakdown.debts;
  const reservedFloor = Math.max(0, observedMonthly * emergencyFundMonths);
  const availableForDownPayment = Math.max(
    0,
    investableWealth - reservedFloor,
  );

  const isPurchase = (goal.borrowAmount ?? 0) > 0;

  if (!isPurchase) {
    // Savings goal — keep the existing plan-driven semantics, but enrich the
    // headline so the user knows what's measured.
    let smartStatus: GoalSmartStatus = "wait";
    let headline = "À épargner";
    if (plan.status === "reached") {
      smartStatus = "optimal-now";
      headline = "✓ Cible atteinte";
    } else if (plan.status === "ahead") {
      smartStatus = "optimal-now";
      headline = "En avance — bon rythme";
    } else if (plan.status === "on-track") {
      smartStatus = "loan-strategic";
      headline = "Sur la trajectoire";
    } else if (plan.status === "behind") {
      smartStatus = "wait";
      headline = "En retard — augmenter l'effort";
    } else if (plan.status === "unreachable") {
      smartStatus = "out-of-reach";
      headline = "Cible inatteignable au rythme actuel";
    }
    return {
      plan,
      isPurchase: false,
      liquidWealth,
      investableWealth,
      totalWealth,
      reservedFloor,
      availableForDownPayment,
      creditRate,
      maxMonthlyPayment,
      horizonYears,
      wealthIfSkip: 0,
      wealthIfBuyOptimal: 0,
      wealthIfBuyCash: 0,
      opportunityCostOptimal: 0,
      loanAdvantageVsCash: 0,
      smartStatus,
      smartHeadline: headline,
      smartDetail:
        plan.status === "reached"
          ? `Tu as ${formatPlainEuro(plan.currentAmount)} sur ${formatPlainEuro(plan.effectiveTarget)} requis.`
          : `Manque ${formatPlainEuro(plan.remaining)}.`,
    };
  }

  // Purchase goal — run the optimizer
  const optimization = optimizeFinancing({
    targetAmount: goal.targetAmount,
    currentWealth: investableWealth,
    reservedWealth: reservedFloor,
    monthlySavings: observedMonthly,
    maxMonthlyPayment,
    maxLoanMonths,
    creditRate,
    expectedReturn: annualReturn,
    horizonYears,
  });

  // Counterfactual: what if you skip the purchase entirely?
  const horizonMonths = horizonYears * 12;
  const r = annualReturn / 12;
  let skipWealth = investableWealth;
  for (let m = 1; m <= horizonMonths; m += 1) {
    skipWealth = skipWealth * (1 + r) + observedMonthly;
  }

  const wealthIfBuyOptimal = optimization.scenarios.optimal.finalWealth;
  const wealthIfBuyCash = optimization.scenarios.cashOnly.finalWealth;
  const opportunityCostOptimal = skipWealth - wealthIfBuyOptimal;
  const loanAdvantageVsCash = wealthIfBuyOptimal - wealthIfBuyCash;

  // Determine smart status
  let smartStatus: GoalSmartStatus;
  let smartHeadline: string;
  let smartDetail: string;

  const optimal = optimization.scenarios.optimal;

  if (!optimization.feasible) {
    smartStatus = "out-of-reach";
    smartHeadline = "Pas faisable maintenant";
    smartDetail =
      optimization.reason ??
      "Même avec le crédit maximum, le mix ne tient pas dans tes contraintes (mensualité ou réserve).";
  } else if (
    optimal.loanAmount === 0 &&
    optimal.downPayment > availableForDownPayment * 0.95
  ) {
    smartStatus = "feasible-tight";
    smartHeadline = "Faisable, mais tendu";
    smartDetail = `Le mix optimal vide quasiment ta réserve liquide. Tu finis à ${formatPlainEuro(wealthIfBuyOptimal)} à ${horizonYears} ans (vs ${formatPlainEuro(skipWealth)} si tu n'achètes pas).`;
  } else if (loanAdvantageVsCash > 500) {
    smartStatus = "loan-strategic";
    smartHeadline = "Stratégie : emprunte, garde tes investissements";
    smartDetail = `Avec ${(annualReturn * 100).toFixed(1)}% de rendement attendu et ${(creditRate * 100).toFixed(1)}% de crédit, le mix optimal te fait gagner ${formatPlainEuro(loanAdvantageVsCash)} de patrimoine à ${horizonYears} ans vs payer cash.`;
  } else if (opportunityCostOptimal < skipWealth * 0.05) {
    smartStatus = "optimal-now";
    smartHeadline = "Tu peux y aller — coût trajectoire faible";
    smartDetail = `L'achat te coûte ${formatPlainEuro(opportunityCostOptimal)} de patrimoine futur sur ${horizonYears} ans (${((opportunityCostOptimal / skipWealth) * 100).toFixed(1)}%). Acceptable.`;
  } else {
    smartStatus = "feasible-tight";
    smartHeadline = "Faisable, mais coût significatif";
    smartDetail = `Acheter maintenant te ferait perdre ${formatPlainEuro(opportunityCostOptimal)} (${((opportunityCostOptimal / skipWealth) * 100).toFixed(1)}%) de patrimoine projeté à ${horizonYears} ans.`;
  }

  return {
    plan,
    isPurchase: true,
    liquidWealth,
    investableWealth,
    totalWealth,
    reservedFloor,
    availableForDownPayment,
    optimization,
    creditRate,
    maxMonthlyPayment,
    horizonYears,
    wealthIfSkip: skipWealth,
    wealthIfBuyOptimal,
    wealthIfBuyCash,
    opportunityCostOptimal,
    loanAdvantageVsCash,
    smartStatus,
    smartHeadline,
    smartDetail,
  };
}

/* ------------------------------------------------------------------ */
/* Smart purchase timeline                                              */
/*                                                                      */
/* Given a vehicle (price + optional deadline), simulate every possible */
/* purchase month from 0 to maxMonths and compute the projected wealth  */
/* at a long-term horizon. Returns the "recommended" month = first      */
/* month where buying degrades long-term wealth by ≤ tolerancePct vs    */
/* "never buy".                                                         */
/* ------------------------------------------------------------------ */

export interface PurchaseTimelinePoint {
  month: number;                    // m=0 means "today", m=12 means "in 12 months"
  projectedWealth: number;          // your investable wealth at month m if you don't buy yet
  feasible: boolean;
  /** Optimal financing scenario at this month. Defined only when feasible. */
  scenario?: FinancingProjection;
  /** Final wealth at horizon (years from now) if you buy at month m using the optimal mix. */
  finalWealthIfBuy: number;
  /** Final wealth at horizon (years from now) if you NEVER buy — same regardless of m, included for convenience. */
  finalWealthIfSkip: number;
  /** Patrimoine sacrifié à horizon : finalWealthIfSkip − finalWealthIfBuy (positive = cost). */
  trajectoryCost: number;
  /** trajectoryCost / finalWealthIfSkip, clipped to [0, 1+]. */
  trajectoryCostPct: number;
}

export interface PurchaseTimelineSummary {
  vehiclePrice: number;
  horizonYears: number;
  tolerancePct: number;
  /** Monthly savings used in the simulation (override > observed > 0). */
  monthlySavings: number;
  /** Months of leeway from "today" until the user's deadline, if any. undefined = no deadline. */
  monthsUntilDeadline?: number;
  /** Final wealth in horizonYears if user never buys this vehicle. */
  finalWealthIfSkip: number;

  points: PurchaseTimelinePoint[];

  /** First month where the optimizer is feasible (any mix works). null if never. */
  minFeasibleMonth: number | null;
  /** First month where you can buy entirely cash (no loan needed). null if never within window. */
  cashFullMonth: number | null;
  /**
   * Recommended purchase month : first feasible month where trajectoryCostPct ≤ tolerancePct.
   * null if no acceptable date exists OR if the goal is out of reach.
   */
  recommendedMonth: number | null;
  /** True when no realistic scenario exists in the window. */
  outOfReach: boolean;
  /** Why we recommend this month (human-readable). */
  recommendationReason: string;
}

interface SimulateTimelineOptions {
  /** Vehicle (or anything) price in € — fixed across the simulation. */
  vehiclePrice: number;
  /** Months from today until the user's deadline (inclusive). undefined = no constraint. */
  monthsUntilDeadline?: number;
  /** 0..1, default 0.10. */
  tolerancePct?: number;
  /** Long-term horizon for wealth projection, default 10y. */
  horizonYears?: number;
  /** Search ceiling (months), default 84 = 7 years. */
  maxMonths?: number;
  /** Annual return assumption, default settings.defaultAnnualReturn. */
  expectedReturn?: number;
  /** Annual credit rate, default 0.05. */
  creditRate?: number;
  /** Months of observed savings to keep as emergency fund, default 3. */
  emergencyFundMonths?: number;
  /** Hard cap on monthly loan payment, default = max(observed × 0.5, 800). */
  maxMonthlyPayment?: number;
  /** Maximum loan duration in months, default 84. */
  maxLoanMonths?: number;
  /**
   * User-declared monthly savings override. Used when observed is null
   * (not enough history) or the user knows better. Falls back to observed
   * or 0.
   */
  monthlySavingsOverride?: number;
}

export function simulatePurchaseTimeline(
  state: AppState,
  opts: SimulateTimelineOptions,
): PurchaseTimelineSummary {
  const tolerancePct = opts.tolerancePct ?? 0.10;
  const horizonYears = opts.horizonYears ?? 10;
  const maxMonths = opts.maxMonths ?? 84;
  const annualReturn = opts.expectedReturn ?? state.settings.defaultAnnualReturn;
  const creditRate = opts.creditRate ?? 0.05;
  const emergencyFundMonths = opts.emergencyFundMonths ?? 3;
  const maxLoanMonths = opts.maxLoanMonths ?? 84;

  const breakdown = calculateBreakdown(state);
  const observed = calculateObservedMonthlySavings(state);
  const observedMonthly =
    opts.monthlySavingsOverride ?? observed ?? 0;
  const investableWealth =
    breakdown.cash + breakdown.receivables +
    breakdown.etf + breakdown.crypto + breakdown.stock;

  const reservedFloor = Math.max(0, observedMonthly * emergencyFundMonths);
  const maxMonthlyPayment =
    opts.maxMonthlyPayment ?? Math.max(observedMonthly * 0.5, 800);

  const r = annualReturn / 12;
  const horizonMonths = Math.max(1, Math.round(horizonYears * 12));

  // "Never buy" baseline — wealth in horizonMonths if user keeps saving without buying.
  let skipWealth = investableWealth;
  for (let m = 1; m <= horizonMonths; m += 1) {
    skipWealth = skipWealth * (1 + r) + observedMonthly;
  }

  // Project investableWealth from now to month m for each m.
  const projectedAt: number[] = [investableWealth];
  for (let m = 1; m <= maxMonths; m += 1) {
    projectedAt.push(projectedAt[m - 1] * (1 + r) + observedMonthly);
  }

  const points: PurchaseTimelinePoint[] = [];
  let minFeasibleMonth: number | null = null;
  let cashFullMonth: number | null = null;

  for (let m = 0; m <= maxMonths; m += 1) {
    const projWealth = projectedAt[m];
    // Run optimizer for a purchase at month m.
    const remainingHorizonYears = Math.max(0.001, horizonYears - m / 12);
    const optim = optimizeFinancing({
      targetAmount: opts.vehiclePrice,
      currentWealth: projWealth,
      reservedWealth: reservedFloor,
      monthlySavings: observedMonthly,
      maxMonthlyPayment,
      maxLoanMonths,
      creditRate,
      expectedReturn: annualReturn,
      horizonYears: remainingHorizonYears,
    });

    if (optim.feasible && minFeasibleMonth === null) minFeasibleMonth = m;
    if (
      cashFullMonth === null &&
      projWealth - reservedFloor >= opts.vehiclePrice
    ) {
      cashFullMonth = m;
    }

    let finalWealthIfBuy = 0;
    if (optim.feasible) {
      // Wealth at horizon = wealth from purchase month to horizon, projected forward.
      // optim.scenarios.optimal.finalWealth is wealth at "remainingHorizonYears" from purchase.
      // That IS the wealth at horizonYears from today.
      finalWealthIfBuy = optim.scenarios.optimal.finalWealth;
    }
    const trajectoryCost = optim.feasible
      ? skipWealth - finalWealthIfBuy
      : skipWealth; // when infeasible, "cost" = full skip (you can't buy)
    const trajectoryCostPct =
      skipWealth > 0 ? trajectoryCost / skipWealth : 0;

    points.push({
      month: m,
      projectedWealth: projWealth,
      feasible: optim.feasible,
      scenario: optim.feasible ? optim.scenarios.optimal : undefined,
      finalWealthIfBuy,
      finalWealthIfSkip: skipWealth,
      trajectoryCost,
      trajectoryCostPct,
    });
  }

  // Find recommended month : first feasible m where cost% <= tolerance.
  // If a deadline is set, only consider m ≤ deadline.
  const deadlineCap = opts.monthsUntilDeadline ?? maxMonths;
  const eligible = points.filter(
    (p) => p.feasible && p.month <= deadlineCap,
  );

  let recommendedMonth: number | null = null;
  let recommendationReason = "";
  let outOfReach = false;

  const firstUnderTolerance = eligible.find(
    (p) => p.trajectoryCostPct <= tolerancePct,
  );

  if (firstUnderTolerance) {
    recommendedMonth = firstUnderTolerance.month;
    if (recommendedMonth === 0) {
      recommendationReason = `Achète maintenant : la dégradation de ta richesse projetée à ${horizonYears} ans est de ${(firstUnderTolerance.trajectoryCostPct * 100).toFixed(1)}%, sous ton seuil de tolérance (${(tolerancePct * 100).toFixed(0)}%).`;
    } else {
      recommendationReason = `Attends ${recommendedMonth} mois : c'est le premier moment où la dégradation de richesse projetée à ${horizonYears} ans tombe sous ton seuil de ${(tolerancePct * 100).toFixed(0)}% (${(firstUnderTolerance.trajectoryCostPct * 100).toFixed(1)}% à cette date).`;
    }
  } else if (eligible.length > 0) {
    // No month meets tolerance — pick the best (lowest cost) within deadline.
    const best = eligible.reduce((a, b) =>
      b.trajectoryCostPct < a.trajectoryCostPct ? b : a,
    );
    // "Out of reach" guard : even the best month is catastrophic. Don't
    // pretend this is a viable purchase.
    const goingBroke = best.finalWealthIfBuy <= 0;
    const ridiculousCost = best.trajectoryCostPct > 0.5;
    if (goingBroke || ridiculousCost) {
      outOfReach = true;
      recommendedMonth = null;
      const reasons: string[] = [];
      if (observedMonthly <= 0) {
        reasons.push("ton épargne mensuelle est nulle ou non mesurée — saisis-la dans le formulaire");
      }
      if (investableWealth < opts.vehiclePrice * 0.1) {
        reasons.push("tu as trop peu de patrimoine investissable pour servir d'apport sans crédit ruineux");
      }
      if (goingBroke) {
        reasons.push("le scénario le moins mauvais te ferait finir avec un patrimoine négatif (crédit non remboursable au rythme actuel)");
      }
      if (reasons.length === 0) {
        reasons.push(`coût trajectoire trop élevé (${(best.trajectoryCostPct * 100).toFixed(0)}%) sur toutes les dates testées`);
      }
      recommendationReason = `✗ Hors portée dans les ${maxMonths} prochains mois : ${reasons.join(" ; ")}.`;
    } else {
      recommendedMonth = best.month;
      if (opts.monthsUntilDeadline !== undefined) {
        recommendationReason = `Aucune date avant ta deadline (${opts.monthsUntilDeadline} mois) ne respecte ton seuil. Meilleur compromis : ${best.month} mois (${(best.trajectoryCostPct * 100).toFixed(1)}% de dégradation).`;
      } else {
        recommendationReason = `Aucune date dans ${maxMonths} mois ne respecte ton seuil de ${(tolerancePct * 100).toFixed(0)}%. Meilleur compromis : ${best.month} mois (${(best.trajectoryCostPct * 100).toFixed(1)}%).`;
      }
    }
  } else {
    outOfReach = true;
    recommendationReason = `Pas de scénario faisable dans les ${maxMonths} prochains mois — augmente ton épargne, baisse la cible, ou agrandis l'horizon.`;
  }

  return {
    vehiclePrice: opts.vehiclePrice,
    horizonYears,
    tolerancePct,
    monthlySavings: observedMonthly,
    monthsUntilDeadline: opts.monthsUntilDeadline,
    finalWealthIfSkip: skipWealth,
    points,
    minFeasibleMonth,
    cashFullMonth,
    recommendedMonth,
    outOfReach,
    recommendationReason,
  };
}

function formatPlainEuro(v: number): string {
  return `${Math.round(v).toLocaleString("fr-FR")} €`;
}

/* ------------------------------------------------------------------ */
/* DCA rules — pending drafts                                          */
/* ------------------------------------------------------------------ */
export interface DcaDraft {
  ruleId: string;
  occurrenceDate: string; // YYYY-MM-DD
  holdingId: string;
  amount: number;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns 1..7 with Monday = 1. */
function isoDayOfWeek(d: Date): number {
  const dow = d.getDay();
  return dow === 0 ? 7 : dow;
}

function alignToDayOfWeek(start: Date, target: number): Date {
  const out = new Date(start);
  const diff = ((target - isoDayOfWeek(out)) + 7) % 7;
  out.setDate(out.getDate() + diff);
  return out;
}

function clampDayOfMonth(year: number, month0: number, day: number): Date {
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  return new Date(year, month0, Math.min(day, lastDay));
}

function enumerateOccurrences(
  rule: DcaRule,
  until: Date,
): Date[] {
  const start = parseISODate(rule.startDate);
  const occs: Date[] = [];
  if (rule.cadence === "weekly" || rule.cadence === "biweekly") {
    const step = rule.cadence === "weekly" ? 7 : 14;
    let cur = alignToDayOfWeek(start, rule.dayOfPeriod);
    while (cur.getTime() <= until.getTime()) {
      occs.push(new Date(cur));
      cur = new Date(cur);
      cur.setDate(cur.getDate() + step);
    }
  } else {
    // monthly
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur.getTime() <= until.getTime()) {
      const occ = clampDayOfMonth(cur.getFullYear(), cur.getMonth(), rule.dayOfPeriod);
      if (occ.getTime() >= start.getTime() && occ.getTime() <= until.getTime()) {
        occs.push(occ);
      }
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return occs;
}

/**
 * Returns the list of pending DCA drafts (occurrences past `now` that have
 * not been settled yet) sorted by date ascending.
 */
export function generatePendingDrafts(
  rules: DcaRule[],
  now: Date = new Date(),
): DcaDraft[] {
  const out: DcaDraft[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const settled = rule.lastSettledDate
      ? parseISODate(rule.lastSettledDate)
      : null;
    const occs = enumerateOccurrences(rule, now);
    for (const occ of occs) {
      if (settled && occ.getTime() <= settled.getTime()) continue;
      out.push({
        ruleId: rule.id,
        occurrenceDate: isoDay(occ),
        holdingId: rule.holdingId,
        amount: rule.amount,
      });
    }
  }
  return out.sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate));
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
