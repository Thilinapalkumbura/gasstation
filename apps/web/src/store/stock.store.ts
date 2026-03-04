import { create } from 'zustand';
import { TankSnapshot } from '@/lib/api/stock.api';

export interface LowStockAlert {
  tankId: string;
  stationId: string;
  stationName: string;
  fuelType: string;
  currentLevelLitres: number;
  reorderLevelLitres: number;
  percentageFull: number;
  isCritical: boolean;
  receivedAt: string;
  dismissed: boolean;
}

interface StockState {
  tanks: Record<string, TankSnapshot>;          // tankId → snapshot
  alerts: LowStockAlert[];
  lastSyncAt: string | null;
  isConnected: boolean;

  setTanks: (tanks: TankSnapshot[]) => void;
  updateTank: (tank: TankSnapshot) => void;
  addAlert: (alert: Omit<LowStockAlert, 'dismissed'>) => void;
  dismissAlert: (tankId: string) => void;
  clearDismissedAlerts: () => void;
  setConnected: (connected: boolean) => void;
}

export const useStockStore = create<StockState>((set) => ({
  tanks: {},
  alerts: [],
  lastSyncAt: null,
  isConnected: false,

  setTanks: (tanks) => {
    const byId = tanks.reduce<Record<string, TankSnapshot>>((acc, t) => {
      acc[t.id] = t;
      return acc;
    }, {});
    set({ tanks: byId, lastSyncAt: new Date().toISOString() });
  },

  updateTank: (tank) =>
    set((state) => ({
      tanks: { ...state.tanks, [tank.id]: tank },
      lastSyncAt: new Date().toISOString(),
    })),

  addAlert: (alert) =>
    set((state) => {
      // Deduplicate: replace existing alert for same tank
      const filtered = state.alerts.filter((a) => a.tankId !== alert.tankId);
      return {
        alerts: [{ ...alert, dismissed: false }, ...filtered],
      };
    }),

  dismissAlert: (tankId) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.tankId === tankId ? { ...a, dismissed: true } : a,
      ),
    })),

  clearDismissedAlerts: () =>
    set((state) => ({
      alerts: state.alerts.filter((a) => !a.dismissed),
    })),

  setConnected: (connected) => set({ isConnected: connected }),
}));

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectTanksByStation = (stationId: string) => (state: StockState) =>
  Object.values(state.tanks).filter((t) => t.stationId === stationId);

export const selectLowTanks = (state: StockState) =>
  Object.values(state.tanks).filter((t) => t.isLow);

export const selectActiveAlerts = (state: StockState) =>
  state.alerts.filter((a) => !a.dismissed);
