import { describe, expect, it } from "vitest";
import {
  calculateAveragePurchasePrice,
  calculateBreakdown,
  calculateCapitalInvestedEUR,
  calculateCurrentQuantity,
  calculateCurrentValueEUR,
  calculateMonthlyDcaActual,
  calculateRealizedPnL,
  calculateTotalCapitalInvested,
  calculateTotalNet,
  calculateUnrealizedPnL,
  calculateVehicleCurrentValue,
  createSnapshot,
  projectFutureValue,
  shouldCreateSnapshot,
} from "@/lib/finance";
import type {
  AppState,
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
    snapshots: [],
    goals: [],
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
      breakdown: { etf: 0, crypto: 0, stock: 0, cash: 0, vehicles: 0 },
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
