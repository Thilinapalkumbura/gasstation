import { create } from 'zustand';

export type AlertType = 'spare_part' | 'cylinder';

export interface ReorderAlert {
  id: string;
  type: AlertType;
  stationId: string;
  stationName: string;
  itemId: string;
  itemName: string;
  currentStock: number;
  reorderLevel: number;
  isCritical: boolean;
  receivedAt: string;
  dismissed: boolean;
}

interface AlertsState {
  alerts: ReorderAlert[];
  addSparePartAlert: (data: any, timestamp: string) => void;
  addCylinderAlert: (data: any, timestamp: string) => void;
  dismissAlert: (id: string) => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],

  addSparePartAlert: (data, timestamp) =>
    set((state) => {
      const id = `spare-${data.partId}`;
      const filtered = state.alerts.filter((a) => a.id !== id);
      const alert: ReorderAlert = {
        id,
        type: 'spare_part',
        stationId: data.stationId,
        stationName: data.stationName ?? data.stationId,
        itemId: data.partId,
        itemName: `${data.name} (${data.sku})`,
        currentStock: data.currentStock,
        reorderLevel: data.reorderLevel,
        isCritical: data.isCritical,
        receivedAt: timestamp,
        dismissed: false,
      };
      return { alerts: [alert, ...filtered] };
    }),

  addCylinderAlert: (data, timestamp) =>
    set((state) => {
      const id = `cylinder-${data.cylinderId}`;
      const filtered = state.alerts.filter((a) => a.id !== id);
      const alert: ReorderAlert = {
        id,
        type: 'cylinder',
        stationId: data.stationId,
        stationName: data.stationName ?? data.stationId,
        itemId: data.cylinderId,
        itemName: `${data.brand} ${data.sizeKg}kg`,
        currentStock: data.fullStock,
        reorderLevel: data.reorderLevel,
        isCritical: data.isCritical,
        receivedAt: timestamp,
        dismissed: false,
      };
      return { alerts: [alert, ...filtered] };
    }),

  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    })),
}));

export const selectActiveReorderAlerts = (state: AlertsState) =>
  state.alerts.filter((a) => !a.dismissed);
