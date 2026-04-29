import { z } from "zod";
import type { AppState } from "@/types";

const holdingTypeSchema = z.enum(["etf", "crypto", "stock", "cash"]);
const vehicleTypeSchema = z.enum(["car", "motorcycle", "other"]);
const transactionTypeSchema = z.enum(["buy", "sell"]);
const currencySchema = z.enum(["EUR", "USD"]);
const goalSourceSchema = z.enum(["cash", "investment", "mixed"]);
const visualModeSchema = z.enum(["full", "sage"]);

const holdingSchema = z.object({
  id: z.string(),
  type: holdingTypeSchema,
  ticker: z.string(),
  name: z.string(),
  currency: currencySchema,
  currentPrice: z.number(),
  currentPriceUpdatedAt: z.string(),
  coingeckoId: z.string().optional(),
  yahooSymbol: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

const transactionSchema = z.object({
  id: z.string(),
  holdingId: z.string(),
  type: transactionTypeSchema,
  date: z.string(),
  quantity: z.number(),
  pricePerUnit: z.number(),
  fees: z.number(),
  exchangeRate: z.number().optional(),
  notes: z.string().optional(),
});

const vehicleSchema = z.object({
  id: z.string(),
  type: vehicleTypeSchema,
  name: z.string(),
  purchaseDate: z.string(),
  purchasePrice: z.number(),
  currentValue: z.number(),
  currentValueUpdatedAt: z.string(),
  annualDepreciation: z.number(),
});

const snapshotSchema = z.object({
  id: z.string(),
  date: z.string(),
  totalNet: z.number(),
  breakdown: z.object({
    etf: z.number(),
    crypto: z.number(),
    stock: z.number(),
    cash: z.number(),
    vehicles: z.number(),
  }),
  capitalInvested: z.number(),
});

const goalSchema = z.object({
  id: z.string(),
  name: z.string(),
  targetAmount: z.number(),
  targetDate: z.string(),
  source: goalSourceSchema,
  borrowAmount: z.number().optional(),
  monthlyOverride: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

const settingsSchema = z.object({
  baseCurrency: z.literal("EUR"),
  defaultAnnualReturn: z.number(),
  defaultVehicleDepreciation: z.number(),
  weeklyDcaTarget: z.number().optional(),
  monthlyDcaTarget: z.number().optional(),
  currentEurUsdRate: z.number().optional(),
  visualMode: visualModeSchema,
  lastDataUpdateReminder: z.string().optional(),
});

const dcaCadenceSchema = z.enum(["weekly", "biweekly", "monthly"]);

const dcaRuleSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  holdingId: z.string(),
  amount: z.number(),
  cadence: dcaCadenceSchema,
  dayOfPeriod: z.number(),
  startDate: z.string(),
  lastSettledDate: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export const appStateSchema = z.object({
  holdings: z.array(holdingSchema),
  transactions: z.array(transactionSchema),
  vehicles: z.array(vehicleSchema),
  snapshots: z.array(snapshotSchema),
  goals: z.array(goalSchema),
  dcaRules: z.array(dcaRuleSchema).optional().default([]),
  settings: settingsSchema,
});

export type AppStateZ = z.infer<typeof appStateSchema>;

export function parseAppStateJson(input: string): AppState {
  const raw = JSON.parse(input);
  return appStateSchema.parse(raw) as AppState;
}
