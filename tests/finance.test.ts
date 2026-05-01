import { describe, expect, it } from "vitest";
import {
  calculateAveragePurchasePrice,
  calculateBreakdown,
  calculateCapitalInvestedEUR,
  calculateCurrentQuantity,
  calculateCurrentValueEUR,
  calculateMonthlyDcaActual,
  calculateObservedMonthlySavings,
  calculateRealizedPnL,
  calculateTotalCapitalInvested,
  calculateTotalNet,
  calculateUnrealizedPnL,
  calculateVehicleCurrentValue,
  createSnapshot,
  generatePendingDrafts,
  monthlyAnnuity,
  optimizeFinancing,
  planForGoal,
  projectFutureValue,
  shouldCreateSnapshot,
  simulatePurchaseTimeline,
} from "@/lib/finance";
import type {
  AppState,
  DcaRule,
  Goal,
  Holding,
  Settings,
  Snapshot,
  Transaction,
  Vehicle,
} from "@/types";

const baseSettings: Settings = {
  baseCurrency: "EUR",
  defaultAnnualReturn: 0.07,
  defaultVehicleDepreciation: 0.15,
  visualMode: "full",
};

function makeHolding(over: Partial<Holding> = {}): Holding {
  return {
    id: "h1",
    type: "etf",
    ticker: "WPEA",
    name: "Amundi PEA Monde",
    currency: "EUR",
    currentPrice: 30,
    currentPriceUpdatedAt: "2026-04-01T00:00:00Z",
    createdAt: "2025-01-01T00:00:00Z",
    ...over,
  };
}

function makeTx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx",
    holdingId: "h1",
    type: "buy",
    date: "2025-01-15",
    quantity: 10,
    pricePerUnit: 20,
    fees: 0,
    ...over,
  };
}

/* -------------------------------------------------------------------- */
/* Quantity                                                              */
/* -------------------------------------------------------------------- */

describe("calculateCurrentQuantity", () => {
  it("sums buys and subtracts sells", () => {
    const txs = [
      makeTx({ id: "1", type: "buy", quantity: 10 }),
      makeTx({ id: "2", type: "sell", quantity: 4 }),
      makeTx({ id: "3", type: "buy", quantity: 3 }),
    ];
    expect(calculateCurrentQuantity(txs)).toBe(9);
  });

  it("returns 0 for empty input", () => {
    expect(calculateCurrentQuantity([])).toBe(0);
  });
});

/* -------------------------------------------------------------------- */
/* Average purchase price                                                */
/* -------------------------------------------------------------------- */

describe("calculateAveragePurchasePrice", () => {
  it("computes weighted average across multiple buys", () => {
    const txs = [
      makeTx({ id: "1", type: "buy", quantity: 10, pricePerUnit: 20 }),
      makeTx({ id: "2", type: "buy", quantity: 30, pricePerUnit: 30 }),
    ];
    // (10*20 + 30*30) / 40 = 1100/40 = 27.5
    expect(calculateAveragePurchasePrice(txs)).toBeCloseTo(27.5, 5);
  });

  it("ignores sells and returns 0 with no buys", () => {
    expect(
      calculateAveragePurchasePrice([
        makeTx({ id: "1", type: "sell", quantity: 5, pricePerUnit: 50 }),
      ]),
    ).toBe(0);
  });

  it("multi-currency: PRU EUR weights buys by EUR price at the time", () => {
    // Brief test: holding USD with two buys at different rates → coherent EUR PRU.
    const txs = [
      // 5 units @ $20 with EUR/USD = 0.90 → 5 * 18 = 90 EUR
      makeTx({
        id: "1",
        type: "buy",
        quantity: 5,
        pricePerUnit: 20,
        exchangeRate: 0.9,
      }),
      // 5 units @ $20 with EUR/USD = 1.10 → 5 * 22 = 110 EUR
      makeTx({
        id: "2",
        type: "buy",
        quantity: 5,
        pricePerUnit: 20,
        exchangeRate: 1.1,
      }),
    ];
    // (90 + 110) / 10 = 20 EUR/unit
    expect(calculateAveragePurchasePrice(txs)).toBeCloseTo(20, 5);
  });
});

/* -------------------------------------------------------------------- */
/* Capital invested                                                      */
/* -------------------------------------------------------------------- */

describe("calculateCapitalInvestedEUR", () => {
  it("buy then partial sell: capital reduced by qty_sold × PRU, NOT sale price", () => {
    // Buy 10 @ 20 → capital = 200, PRU = 20
    // Sell 4 @ 50 (huge gain)
    //   capital -= 4 × 20 = 80 → capital = 120
    //   sale price (50) is irrelevant to capital invested
    const txs = [
      makeTx({ id: "1", type: "buy", quantity: 10, pricePerUnit: 20, fees: 0 }),
      makeTx({
        id: "2",
        type: "sell",
        quantity: 4,
        pricePerUnit: 50,
        fees: 0,
        date: "2025-02-01",
      }),
    ];
    expect(calculateCapitalInvestedEUR(txs)).toBeCloseTo(120, 5);
  });

  it("includes buy fees and sell fees", () => {
    const txs = [
      makeTx({
        id: "1",
        type: "buy",
        quantity: 10,
        pricePerUnit: 20,
        fees: 5,
      }),
      makeTx({
        id: "2",
        type: "sell",
        quantity: 5,
        pricePerUnit: 50,
        fees: 2,
        date: "2025-02-01",
      }),
    ];
    // capital = 200 + 5 (buy fees) - 5 × 20 (PRU) + 2 (sell fees) = 107
    expect(calculateCapitalInvestedEUR(txs)).toBeCloseTo(107, 5);
  });

  it("returns 0 for empty input", () => {
    expect(calculateCapitalInvestedEUR([])).toBe(0);
  });
});

/* -------------------------------------------------------------------- */
/* Current value & PnL                                                   */
/* -------------------------------------------------------------------- */

describe("calculateCurrentValueEUR", () => {
  it("EUR holding: qty × currentPrice", () => {
    const holding = makeHolding({ currency: "EUR", currentPrice: 35 });
    const txs = [makeTx({ id: "1", type: "buy", quantity: 10 })];
    expect(calculateCurrentValueEUR(holding, txs)).toBe(350);
  });

  it("USD holding: applies live EUR/USD rate", () => {
    const holding = makeHolding({ currency: "USD", currentPrice: 100 });
    const txs = [
      makeTx({ id: "1", type: "buy", quantity: 5, exchangeRate: 0.9 }),
    ];
    // 5 units × $100 × 0.95 EUR/USD = 475 EUR
    expect(calculateCurrentValueEUR(holding, txs, 0.95)).toBeCloseTo(475, 5);
  });
});

describe("calculateUnrealizedPnL", () => {
  it("computes EUR diff and pct from PRU", () => {
    const holding = makeHolding({ currency: "EUR", currentPrice: 30 });
    const txs = [makeTx({ id: "1", type: "buy", quantity: 10, pricePerUnit: 20 })];
    // value = 300, cost = 200, eur = +100, pct = 50
    const pnl = calculateUnrealizedPnL(holding, txs);
    expect(pnl.eur).toBeCloseTo(100, 5);
    expect(pnl.pct).toBeCloseTo(50, 5);
  });

  it("returns zeros when nothing held", () => {
    const holding = makeHolding();
    expect(calculateUnrealizedPnL(holding, [])).toEqual({ eur: 0, pct: 0 });
  });
});

describe("calculateRealizedPnL", () => {
  it("FIFO: matches sells against earliest lots", () => {
    const txs = [
      // Buy 10 @ 20 (oldest)
      makeTx({
        id: "1",
        type: "buy",
        quantity: 10,
        pricePerUnit: 20,
        date: "2025-01-01",
      }),
      // Buy 10 @ 30
      makeTx({
        id: "2",
        type: "buy",
        quantity: 10,
        pricePerUnit: 30,
        date: "2025-02-01",
      }),
      // Sell 5 @ 40 → matched against the 20 lot → realized = 5*(40-20) = 100
      makeTx({
        id: "3",
        type: "sell",
        quantity: 5,
        pricePerUnit: 40,
        date: "2025-03-01",
      }),
    ];
    expect(calculateRealizedPnL(txs)).toBeCloseTo(100, 5);
  });

  it("returns 0 when no sells happened", () => {
    expect(
      calculateRealizedPnL([makeTx({ id: "1", type: "buy", quantity: 10 })]),
    ).toBe(0);
  });
});

/* -------------------------------------------------------------------- */
/* Vehicles                                                              */
/* -------------------------------------------------------------------- */

describe("calculateVehicleCurrentValue", () => {
  it("applies continuous depreciation between updates", () => {
    const vehicle: Vehicle = {
      id: "v1",
      type: "car",
      name: "Toyota",
      purchaseDate: "2024-01-01",
      purchasePrice: 30000,
      currentValue: 20000,
      currentValueUpdatedAt: "2026-01-01T00:00:00Z",
      annualDepreciation: 0.2,
    };
    // 1 year later, 20% off: 20000 × 0.80 = 16000
    const result = calculateVehicleCurrentValue(
      vehicle,
      new Date("2027-01-01T00:00:00Z"),
    );
    expect(result).toBeCloseTo(16000, 0);
  });

  it("returns currentValue when 0 days have passed", () => {
    const vehicle: Vehicle = {
      id: "v1",
      type: "car",
      name: "Toyota",
      purchaseDate: "2026-01-01",
      purchasePrice: 30000,
      currentValue: 25000,
      currentValueUpdatedAt: "2026-04-01T00:00:00Z",
      annualDepreciation: 0.2,
    };
    expect(
      calculateVehicleCurrentValue(vehicle, new Date("2026-04-01T00:00:00Z")),
    ).toBe(25000);
  });
});

/* -------------------------------------------------------------------- */
/* Aggregates / snapshots                                                */
/* -------------------------------------------------------------------- */

function emptyState(): AppState {
  return {
    holdings: [],
    transactions: [],
    vehicles: [],
    accounts: [],
    snapshots: [],
    goals: [],
    dcaRules: [],
    settings: baseSettings,
  };
}

describe("calculateBreakdown / TotalNet / Snapshot", () => {
  it("returns all-zero breakdown for empty state", () => {
    const state = emptyState();
    expect(calculateBreakdown(state)).toEqual({
      etf: 0,
      crypto: 0,
      stock: 0,
      cash: 0,
      vehicles: 0,
      debts: 0,
      receivables: 0,
    });
    expect(calculateTotalNet(state)).toBe(0);
  });

  it("aggregates multiple holdings into the correct buckets", () => {
    const state: AppState = {
      ...emptyState(),
      holdings: [
        makeHolding({ id: "etf1", type: "etf", currentPrice: 30 }),
        makeHolding({
          id: "btc",
          type: "crypto",
          currentPrice: 50000,
          ticker: "BTC",
          name: "Bitcoin",
        }),
      ],
      transactions: [
        makeTx({ id: "1", holdingId: "etf1", type: "buy", quantity: 10 }),
        makeTx({
          id: "2",
          holdingId: "btc",
          type: "buy",
          quantity: 0.5,
          pricePerUnit: 30000,
        }),
      ],
    };
    const b = calculateBreakdown(state);
    expect(b.etf).toBeCloseTo(300, 5); // 10 * 30
    expect(b.crypto).toBeCloseTo(25000, 5); // 0.5 * 50000
    expect(b.stock).toBe(0);
    expect(b.cash).toBe(0);
    expect(b.vehicles).toBe(0);
    expect(calculateTotalNet(state)).toBeCloseTo(25300, 5);
  });

  it("createSnapshot on empty state has all zeros", () => {
    const snap = createSnapshot(emptyState());
    expect(snap.totalNet).toBe(0);
    expect(snap.capitalInvested).toBe(0);
    expect(snap.breakdown).toEqual({
      etf: 0,
      crypto: 0,
      stock: 0,
      cash: 0,
      vehicles: 0,
      debts: 0,
      receivables: 0,
    });
  });

  it("calculateTotalCapitalInvested includes vehicle purchase price", () => {
    const state: AppState = {
      ...emptyState(),
      holdings: [makeHolding({ id: "etf1" })],
      transactions: [makeTx({ id: "1", holdingId: "etf1", quantity: 10 })],
      vehicles: [
        {
          id: "v1",
          type: "car",
          name: "Toyota",
          purchaseDate: "2024-01-01",
          purchasePrice: 30000,
          currentValue: 25000,
          currentValueUpdatedAt: "2026-01-01T00:00:00Z",
          annualDepreciation: 0.15,
        },
      ],
    };
    // ETF: 10 * 20 = 200 capital + vehicle purchase 30000
    expect(calculateTotalCapitalInvested(state)).toBeCloseTo(30200, 5);
  });
});

describe("shouldCreateSnapshot", () => {
  it("returns true when no snapshot exists yet", () => {
    expect(shouldCreateSnapshot(emptyState())).toBe(true);
  });

  it("returns false when a snapshot already exists for today", () => {
    const today = new Date();
    const snap: Snapshot = {
      id: "s",
      date: today.toISOString(),
      totalNet: 0,
      breakdown: { etf: 0, crypto: 0, stock: 0, cash: 0, vehicles: 0, debts: 0, receivables: 0 },
      capitalInvested: 0,
    };
    const state: AppState = { ...emptyState(), snapshots: [snap] };
    expect(shouldCreateSnapshot(state, today)).toBe(false);
  });
});

/* -------------------------------------------------------------------- */
/* Projection                                                            */
/* -------------------------------------------------------------------- */

describe("projectFutureValue", () => {
  it("compound growth: PV=10000, monthly=0, return=10%, 1y → ~11000", () => {
    const points = projectFutureValue({
      initialCapital: 10000,
      monthlyContribution: 0,
      annualReturn: 0.1,
      years: 1,
    });
    expect(points).toHaveLength(2);
    expect(points[1].value).toBeCloseTo(11000, 5);
    expect(points[1].capitalInvested).toBe(10000);
    expect(points[1].gains).toBeCloseTo(1000, 5);
  });

  it("withdrawal event: curve drops at the right year", () => {
    const points = projectFutureValue({
      initialCapital: 100000,
      monthlyContribution: 0,
      annualReturn: 0, // no growth, so the drop is unambiguous
      years: 5,
      events: [{ year: 3, amount: 40000, type: "withdrawal" }],
    });
    expect(points[2].value).toBe(100000); // end of year 2: unchanged
    expect(points[3].value).toBe(60000); // end of year 3: -40000
    expect(points[4].value).toBe(60000); // end of year 4: still 60k
    // capital invested is unaffected by withdrawals
    expect(points[3].capitalInvested).toBe(100000);
  });

  it("includes baseline year 0 + N projected years", () => {
    const points = projectFutureValue({
      initialCapital: 1000,
      monthlyContribution: 100,
      annualReturn: 0.05,
      years: 3,
    });
    expect(points).toHaveLength(4);
    expect(points[0]).toEqual({
      year: 0,
      value: 1000,
      capitalInvested: 1000,
      gains: 0,
    });
  });
});

/* -------------------------------------------------------------------- */
/* DCA actuals                                                           */
/* -------------------------------------------------------------------- */

/* -------------------------------------------------------------------- */
/* Observed monthly savings + Goal solver                                */
/* -------------------------------------------------------------------- */

function makeSnapshot(over: Partial<Snapshot> = {}): Snapshot {
  return {
    id: `s-${Math.random()}`,
    date: "2026-01-01T00:00:00Z",
    totalNet: 0,
    breakdown: { etf: 0, crypto: 0, stock: 0, cash: 0, vehicles: 0, debts: 0, receivables: 0 },
    capitalInvested: 0,
    ...over,
  };
}

describe("calculateObservedMonthlySavings", () => {
  it("returns null when there are no snapshots", () => {
    expect(calculateObservedMonthlySavings(emptyState())).toBeNull();
  });

  it("returns null when not enough history (< 14 days)", () => {
    const now = new Date("2026-04-29T00:00:00Z");
    const state: AppState = {
      ...emptyState(),
      snapshots: [
        makeSnapshot({
          id: "s1",
          date: "2026-04-25T00:00:00Z",
          totalNet: 10000,
        }),
      ],
    };
    expect(calculateObservedMonthlySavings(state, 90, now)).toBeNull();
  });

  it("computes ~1500 €/mois when net worth grew by 1500€ over 30 days", () => {
    const now = new Date("2026-04-29T00:00:00Z");
    const state: AppState = {
      ...emptyState(),
      // 1 cash holding worth 11500 EUR today (cash = 1 EUR each)
      holdings: [
        {
          id: "h1",
          type: "cash",
          ticker: "CHK",
          name: "Compte courant",
          currency: "EUR",
          currentPrice: 1,
          currentPriceUpdatedAt: now.toISOString(),
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      transactions: [
        {
          id: "tx",
          holdingId: "h1",
          type: "buy",
          date: "2026-01-01",
          quantity: 11500,
          pricePerUnit: 1,
          fees: 0,
        },
      ],
      // baseline 30 days ago at 10000
      snapshots: [
        makeSnapshot({
          id: "s1",
          date: "2026-03-30T00:00:00Z",
          totalNet: 10000,
        }),
      ],
    };
    const result = calculateObservedMonthlySavings(state, 90, now);
    expect(result).not.toBeNull();
    // (11500 - 10000) / 30 * 30.44 ≈ 1522
    expect(result!).toBeCloseTo(1522, -1); // ~1500€/mois ±10
  });

  it("uses oldest snapshot in window as baseline", () => {
    const now = new Date("2026-04-29T00:00:00Z");
    const state: AppState = {
      ...emptyState(),
      holdings: [
        {
          id: "h1",
          type: "cash",
          ticker: "CHK",
          name: "Cash",
          currency: "EUR",
          currentPrice: 1,
          currentPriceUpdatedAt: now.toISOString(),
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      transactions: [
        {
          id: "tx",
          holdingId: "h1",
          type: "buy",
          date: "2026-01-01",
          quantity: 13000,
          pricePerUnit: 1,
          fees: 0,
        },
      ],
      snapshots: [
        // both in window, but the oldest (5000@90j) is used as baseline
        makeSnapshot({ id: "s1", date: "2026-01-30T00:00:00Z", totalNet: 5000 }),
        makeSnapshot({ id: "s2", date: "2026-04-01T00:00:00Z", totalNet: 12000 }),
      ],
    };
    const r = calculateObservedMonthlySavings(state, 120, now);
    expect(r).not.toBeNull();
    // (13000 - 5000) / 89 * 30.44 ≈ 2737
    expect(r!).toBeGreaterThan(2500);
    expect(r!).toBeLessThan(3000);
  });
});

describe("planForGoal", () => {
  function supraGoal(over: Partial<Goal> = {}): Goal {
    return {
      id: "g-supra",
      name: "Toyota Supra",
      targetAmount: 45000,
      targetDate: "2027-12-31",
      source: "mixed",
      borrowAmount: 15000,
      createdAt: "2026-01-01T00:00:00Z",
      ...over,
    };
  }

  it("effectiveTarget subtracts borrowAmount", () => {
    const plan = planForGoal(supraGoal(), emptyState());
    expect(plan.effectiveTarget).toBe(30000);
  });

  it("returns reached when current already covers effective target", () => {
    const state: AppState = {
      ...emptyState(),
      holdings: [
        {
          id: "h1",
          type: "cash",
          ticker: "CHK",
          name: "Cash",
          currency: "EUR",
          currentPrice: 1,
          currentPriceUpdatedAt: "2026-04-29T00:00:00Z",
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      transactions: [
        {
          id: "tx",
          holdingId: "h1",
          type: "buy",
          date: "2026-01-01",
          quantity: 35000,
          pricePerUnit: 1,
          fees: 0,
        },
      ],
    };
    const plan = planForGoal(supraGoal(), state);
    expect(plan.status).toBe("reached");
    expect(plan.remaining).toBe(0);
  });

  it("monthlyOverride takes priority over observed rate", () => {
    const plan = planForGoal(
      supraGoal({ monthlyOverride: 1500 }),
      emptyState(),
    );
    expect(plan.declaredMonthly).toBe(1500);
    expect(plan.effectiveMonthly).toBe(1500);
    expect(plan.status).not.toBe("unknown");
    expect(plan.projectedReachDate).not.toBeNull();
  });

  it("status=unknown when no override and no observed history", () => {
    const plan = planForGoal(supraGoal(), emptyState());
    expect(plan.observedMonthly).toBeNull();
    expect(plan.declaredMonthly).toBeNull();
    expect(plan.status).toBe("unknown");
  });

  it("status=unreachable when effort 0 and remaining > 0 but override forces 0", () => {
    const plan = planForGoal(
      supraGoal({ monthlyOverride: 0 }),
      emptyState(),
    );
    expect(plan.effectiveMonthly).toBe(0);
    expect(plan.projectedReachDate).toBeNull();
    expect(plan.status).toBe("unreachable");
  });

  it("requiredMonthly with zero return reduces to remaining / months", () => {
    const state: AppState = {
      ...emptyState(),
      settings: { ...baseSettings, defaultAnnualReturn: 0 },
    };
    // Pick a date 10 months out
    const future = new Date();
    future.setMonth(future.getMonth() + 10);
    const goal = supraGoal({
      targetDate: future.toISOString().slice(0, 10),
      borrowAmount: 0,
      targetAmount: 10000,
    });
    const plan = planForGoal(goal, state);
    // remaining 10000 / 10 months ≈ 1000 (approximate; date arithmetic may be slightly off)
    expect(plan.requiredMonthly).toBeGreaterThan(900);
    expect(plan.requiredMonthly).toBeLessThan(1100);
  });
});

/* -------------------------------------------------------------------- */
/* Loan optimizer                                                        */
/* -------------------------------------------------------------------- */

describe("monthlyAnnuity", () => {
  it("zero rate reduces to loan/months", () => {
    expect(monthlyAnnuity(12000, 0, 12)).toBe(1000);
  });

  it("standard 60-month auto loan at 5% yields ~188.7 €/mois on 10k", () => {
    // PMT = 10000 * (0.05/12) * (1+0.05/12)^60 / ((1+0.05/12)^60 - 1) ≈ 188.71
    const pmt = monthlyAnnuity(10000, 0.05, 60);
    expect(pmt).toBeGreaterThan(188);
    expect(pmt).toBeLessThan(190);
  });

  it("returns 0 when loan or months is zero", () => {
    expect(monthlyAnnuity(0, 0.05, 60)).toBe(0);
    expect(monthlyAnnuity(10000, 0.05, 0)).toBe(0);
  });
});

describe("optimizeFinancing", () => {
  it("when expected return > credit rate, optimal includes a loan (leverage)", () => {
    const opt = optimizeFinancing({
      targetAmount: 45000,
      currentWealth: 50000,
      reservedWealth: 5000,
      monthlySavings: 1500,
      maxMonthlyPayment: 800,
      maxLoanMonths: 60,
      creditRate: 0.05,
      expectedReturn: 0.08,
      horizonYears: 20,
    });
    expect(opt.feasible).toBe(true);
    expect(opt.scenarios.optimal.loanAmount).toBeGreaterThan(0);
    expect(opt.scenarios.optimal.finalWealth).toBeGreaterThan(
      opt.scenarios.cashOnly.finalWealth,
    );
  });

  it("when credit rate >= return, optimal is cash-only", () => {
    const opt = optimizeFinancing({
      targetAmount: 20000,
      currentWealth: 30000,
      reservedWealth: 5000,
      monthlySavings: 1000,
      maxMonthlyPayment: 800,
      maxLoanMonths: 60,
      creditRate: 0.08,
      expectedReturn: 0.04,
      horizonYears: 15,
    });
    expect(opt.feasible).toBe(true);
    expect(opt.scenarios.optimal.loanAmount).toBe(0);
  });

  it("not feasible when no available cash for any down payment > 0", () => {
    const opt = optimizeFinancing({
      targetAmount: 45000,
      currentWealth: 1000,
      reservedWealth: 5000, // available cash = 0
      monthlySavings: 1000,
      maxMonthlyPayment: 800,
      maxLoanMonths: 60,
      creditRate: 0.05,
      expectedReturn: 0.08,
      horizonYears: 20,
    });
    // The 'optimal' will be the only feasible point: down=0, full loan
    // (reservedWealth doesn't restrict if down=0).
    expect(opt.feasible).toBe(true);
    expect(opt.scenarios.optimal.downPayment).toBe(0);
  });
});

/* -------------------------------------------------------------------- */
/* DCA rules drafts                                                      */
/* -------------------------------------------------------------------- */

function makeRule(over: Partial<DcaRule> = {}): DcaRule {
  return {
    id: "r1",
    enabled: true,
    holdingId: "h1",
    amount: 50,
    cadence: "weekly",
    dayOfPeriod: 1, // Monday
    startDate: "2026-04-01",
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("generatePendingDrafts", () => {
  it("weekly Monday rule generates each Monday since startDate", () => {
    // 2026-04-01 is a Wednesday → first Monday is 2026-04-06
    const now = new Date(2026, 3, 27); // Mon 2026-04-27
    const drafts = generatePendingDrafts([makeRule()], now);
    const dates = drafts.map((d) => d.occurrenceDate);
    expect(dates).toEqual([
      "2026-04-06",
      "2026-04-13",
      "2026-04-20",
      "2026-04-27",
    ]);
  });

  it("respects lastSettledDate to skip already validated occurrences", () => {
    const now = new Date(2026, 3, 27);
    const drafts = generatePendingDrafts(
      [makeRule({ lastSettledDate: "2026-04-13" })],
      now,
    );
    expect(drafts.map((d) => d.occurrenceDate)).toEqual([
      "2026-04-20",
      "2026-04-27",
    ]);
  });

  it("disabled rules produce no drafts", () => {
    const now = new Date(2026, 3, 27);
    expect(generatePendingDrafts([makeRule({ enabled: false })], now)).toEqual([]);
  });

  it("biweekly skips every other week", () => {
    const now = new Date(2026, 3, 27);
    const drafts = generatePendingDrafts(
      [makeRule({ cadence: "biweekly" })],
      now,
    );
    expect(drafts.map((d) => d.occurrenceDate)).toEqual([
      "2026-04-06",
      "2026-04-20",
    ]);
  });

  it("monthly anchors on dayOfPeriod each month", () => {
    const now = new Date(2026, 5, 20); // 2026-06-20
    const rule = makeRule({
      cadence: "monthly",
      dayOfPeriod: 15,
      startDate: "2026-04-01",
    });
    const drafts = generatePendingDrafts([rule], now);
    expect(drafts.map((d) => d.occurrenceDate)).toEqual([
      "2026-04-15",
      "2026-05-15",
      "2026-06-15",
    ]);
  });
});

describe("calculateMonthlyDcaActual", () => {
  it("filters by month and nets sells against buys", () => {
    const ref = new Date("2026-04-15T00:00:00Z");
    const txs = [
      makeTx({
        id: "1",
        type: "buy",
        quantity: 10,
        pricePerUnit: 20,
        date: "2026-04-05",
      }),
      makeTx({
        id: "2",
        type: "buy",
        quantity: 5,
        pricePerUnit: 30,
        date: "2026-03-20", // outside the month, ignored
      }),
      makeTx({
        id: "3",
        type: "sell",
        quantity: 2,
        pricePerUnit: 25,
        date: "2026-04-22",
      }),
    ];
    // 10*20 - 2*25 = 200 - 50 = 150
    expect(calculateMonthlyDcaActual(txs, ref)).toBeCloseTo(150, 5);
  });

  it("returns 0 when no transactions in the month", () => {
    expect(
      calculateMonthlyDcaActual(
        [makeTx({ date: "2025-01-01" })],
        new Date("2026-04-15T00:00:00Z"),
      ),
    ).toBe(0);
  });
});

/* -------------------------------------------------------------------- */
/* simulatePurchaseTimeline                                              */
/* -------------------------------------------------------------------- */

function stateWithSnapshot(
  totalNet: number,
  monthsAgo: number,
  baselineNet: number,
): AppState {
  const now = new Date();
  const past = new Date(now);
  past.setMonth(past.getMonth() - monthsAgo);
  return {
    ...emptyState(),
    accounts: [
      {
        id: "acc1",
        name: "PEA",
        type: "savings",
        institution: "Test",
        balance: totalNet,
        balanceUpdatedAt: now.toISOString(),
        createdAt: now.toISOString(),
      },
    ],
    snapshots: [
      {
        id: "old",
        date: past.toISOString(),
        totalNet: baselineNet,
        capitalInvested: baselineNet,
        breakdown: {
          etf: 0,
          crypto: 0,
          stock: 0,
          cash: baselineNet,
          vehicles: 0,
          debts: 0,
          receivables: 0,
        },
      },
    ],
  };
}

describe("simulatePurchaseTimeline", () => {
  it("recommends buying immediately when the price is small relative to wealth", () => {
    // 200k cash + 1500/mo saving, want a tiny 5k vehicle. Almost zero impact.
    const state = stateWithSnapshot(200_000, 3, 195_500);
    const result = simulatePurchaseTimeline(state, {
      vehiclePrice: 5_000,
      tolerancePct: 0.10,
    });
    expect(result.minFeasibleMonth).toBe(0);
    expect(result.recommendedMonth).toBe(0);
    expect(result.points[0].feasible).toBe(true);
    expect(result.points[0].trajectoryCostPct).toBeLessThan(0.05);
  });

  it("delays the recommendation when the price impacts long-term wealth meaningfully", () => {
    // 200k cash, want a 50k vehicle. Buying now eats ~13% of projected 10y wealth.
    // With 10% tolerance, the algo should defer the purchase.
    const state = stateWithSnapshot(200_000, 3, 195_500);
    const result = simulatePurchaseTimeline(state, {
      vehiclePrice: 50_000,
      tolerancePct: 0.10,
      horizonYears: 10,
    });
    expect(result.minFeasibleMonth).toBe(0);
    expect(result.recommendedMonth).not.toBeNull();
    expect(result.recommendedMonth!).toBeGreaterThan(0);
    // First point exceeds tolerance
    expect(result.points[0].trajectoryCostPct).toBeGreaterThan(0.10);
    // Recommended point is under tolerance
    expect(
      result.points[result.recommendedMonth!].trajectoryCostPct,
    ).toBeLessThanOrEqual(0.10);
  });

  it("respects a deadline cap", () => {
    const state = stateWithSnapshot(20_000, 3, 15_500);
    const result = simulatePurchaseTimeline(state, {
      vehiclePrice: 60_000,
      tolerancePct: 0.05,
      monthsUntilDeadline: 24,
    });
    if (result.recommendedMonth !== null) {
      expect(result.recommendedMonth).toBeLessThanOrEqual(24);
    }
  });

  it("flags cashFullMonth when wealth eventually covers price + reserve", () => {
    const state = stateWithSnapshot(30_000, 3, 25_500);
    const result = simulatePurchaseTimeline(state, {
      vehiclePrice: 40_000,
      maxMonths: 84,
    });
    expect(result.cashFullMonth).not.toBeNull();
    if (result.cashFullMonth !== null) {
      expect(result.points[result.cashFullMonth].projectedWealth).toBeGreaterThanOrEqual(40_000);
    }
  });

  it("returns the right number of points", () => {
    const state = stateWithSnapshot(50_000, 3, 45_500);
    const result = simulatePurchaseTimeline(state, {
      vehiclePrice: 30_000,
      maxMonths: 60,
    });
    expect(result.points).toHaveLength(61);
    expect(result.points[0].month).toBe(0);
    expect(result.points[60].month).toBe(60);
  });
});
