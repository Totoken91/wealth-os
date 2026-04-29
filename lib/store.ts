"use client";

import { nanoid } from "nanoid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_SETTINGS, STORAGE_KEY } from "@/lib/constants";
import { createSnapshot, shouldCreateSnapshot } from "@/lib/finance";
import type {
  AppState,
  Goal,
  Holding,
  Settings,
  Transaction,
  Vehicle,
} from "@/types";

type HoldingInput = Omit<Holding, "id" | "createdAt">;
type TransactionInput = Omit<Transaction, "id">;
type VehicleInput = Omit<Vehicle, "id">;
type GoalInput = Omit<Goal, "id" | "createdAt">;

interface Actions {
  // Holdings
  addHolding: (input: HoldingInput) => string;
  updateHolding: (id: string, patch: Partial<Holding>) => void;
  deleteHolding: (id: string) => void;

  // Transactions
  addTransaction: (input: TransactionInput) => string;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Vehicles
  addVehicle: (input: VehicleInput) => string;
  updateVehicle: (id: string, patch: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;

  // Goals
  addGoal: (input: GoalInput) => string;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  // Settings
  updateSettings: (patch: Partial<Settings>) => void;

  // Snapshots
  takeSnapshot: () => void;
  deleteSnapshot: (id: string) => void;

  // Bulk
  importState: (data: AppState) => void;
  exportState: () => AppState;
  resetState: () => void;
}

type Store = AppState & Actions;

const initialState: AppState = {
  holdings: [],
  transactions: [],
  vehicles: [],
  snapshots: [],
  goals: [],
  settings: { ...DEFAULT_SETTINGS },
};

/**
 * Auto-snapshot helper: takes a daily snapshot if none exists for today.
 * Called after every mutation that changes net worth.
 */
function maybeSnapshot(state: AppState): AppState {
  if (!shouldCreateSnapshot(state)) return state;
  const snap = createSnapshot(state, `snap-${nanoid(8)}`);
  return { ...state, snapshots: [...state.snapshots, snap] };
}

export const useWealthStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,

      /* ---------------- Holdings ---------------- */
      addHolding: (input) => {
        const id = `h-${nanoid(8)}`;
        const holding: Holding = {
          ...input,
          id,
          createdAt: new Date().toISOString(),
        };
        set((s) => maybeSnapshot({ ...s, holdings: [...s.holdings, holding] }));
        return id;
      },
      updateHolding: (id, patch) =>
        set((s) =>
          maybeSnapshot({
            ...s,
            holdings: s.holdings.map((h) =>
              h.id === id ? { ...h, ...patch } : h,
            ),
          }),
        ),
      deleteHolding: (id) =>
        set((s) =>
          maybeSnapshot({
            ...s,
            holdings: s.holdings.filter((h) => h.id !== id),
            transactions: s.transactions.filter((t) => t.holdingId !== id),
          }),
        ),

      /* ---------------- Transactions ---------------- */
      addTransaction: (input) => {
        const id = `tx-${nanoid(8)}`;
        const tx: Transaction = { ...input, id };
        set((s) =>
          maybeSnapshot({ ...s, transactions: [...s.transactions, tx] }),
        );
        return id;
      },
      updateTransaction: (id, patch) =>
        set((s) =>
          maybeSnapshot({
            ...s,
            transactions: s.transactions.map((t) =>
              t.id === id ? { ...t, ...patch } : t,
            ),
          }),
        ),
      deleteTransaction: (id) =>
        set((s) =>
          maybeSnapshot({
            ...s,
            transactions: s.transactions.filter((t) => t.id !== id),
          }),
        ),

      /* ---------------- Vehicles ---------------- */
      addVehicle: (input) => {
        const id = `v-${nanoid(8)}`;
        const vehicle: Vehicle = { ...input, id };
        set((s) => maybeSnapshot({ ...s, vehicles: [...s.vehicles, vehicle] }));
        return id;
      },
      updateVehicle: (id, patch) =>
        set((s) =>
          maybeSnapshot({
            ...s,
            vehicles: s.vehicles.map((v) =>
              v.id === id ? { ...v, ...patch } : v,
            ),
          }),
        ),
      deleteVehicle: (id) =>
        set((s) =>
          maybeSnapshot({
            ...s,
            vehicles: s.vehicles.filter((v) => v.id !== id),
          }),
        ),

      /* ---------------- Goals ---------------- */
      addGoal: (input) => {
        const id = `g-${nanoid(8)}`;
        const goal: Goal = {
          ...input,
          id,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ ...s, goals: [...s.goals, goal] }));
        return id;
      },
      updateGoal: (id, patch) =>
        set((s) => ({
          ...s,
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      deleteGoal: (id) =>
        set((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) })),

      /* ---------------- Settings ---------------- */
      updateSettings: (patch) =>
        set((s) => ({ ...s, settings: { ...s.settings, ...patch } })),

      /* ---------------- Snapshots ---------------- */
      takeSnapshot: () => {
        const s = get();
        const snap = createSnapshot(s, `snap-${nanoid(8)}`);
        set({ snapshots: [...s.snapshots, snap] });
      },
      deleteSnapshot: (id) =>
        set((s) => ({
          ...s,
          snapshots: s.snapshots.filter((sn) => sn.id !== id),
        })),

      /* ---------------- Bulk ---------------- */
      importState: (data) => {
        set({
          holdings: data.holdings ?? [],
          transactions: data.transactions ?? [],
          vehicles: data.vehicles ?? [],
          snapshots: data.snapshots ?? [],
          goals: data.goals ?? [],
          settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
        });
      },
      exportState: () => {
        const s = get();
        return {
          holdings: s.holdings,
          transactions: s.transactions,
          vehicles: s.vehicles,
          snapshots: s.snapshots,
          goals: s.goals,
          settings: s.settings,
        };
      },
      resetState: () => set({ ...initialState }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only persist data slices, not action references
      partialize: (state) => ({
        holdings: state.holdings,
        transactions: state.transactions,
        vehicles: state.vehicles,
        snapshots: state.snapshots,
        goals: state.goals,
        settings: state.settings,
      }),
      skipHydration: true,
    },
  ),
);
