import { apiClient } from './client';

export interface TankSnapshot {
  id: string;
  stationId: string;
  station: { id: string; name: string; city: string } | null;
  fuelType: string;
  capacityLitres: number;
  currentLevelLitres: number;
  reorderLevelLitres: number;
  reorderQtyLitres: number;
  percentageFull: number;
  availableLitres: number;
  isLow: boolean;
  isCritical: boolean;
  lastUpdated: string;
}

export interface StationSummary {
  stationId: string;
  tanks: TankSnapshot[];
  totalCapacityLitres: number;
  totalCurrentLitres: number;
  overallPercentage: number;
  lowStockCount: number;
  lowStockTanks: TankSnapshot[];
}

export interface StockMovement {
  id: string;
  tankId: string;
  type: string;
  quantityLitres: number;
  balanceAfterLitres: number;
  unitCostLkr: number | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  tank: { fuelType: string; station: { name: string } };
  createdBy: { fullName: string; role: string };
}

export interface RecordMovementPayload {
  tankId: string;
  type: string;
  quantityLitres: number;
  unitCostLkr?: number;
  reference?: string;
  notes?: string;
}

export interface UpdateReorderPayload {
  capacityLitres?: number;
  reorderLevelLitres: number;
  reorderQtyLitres: number;
}

export const stockApi = {
  getTanks: async (stationId?: string): Promise<TankSnapshot[]> => {
    const { data } = await apiClient.get('/stock/tanks', {
      params: stationId ? { stationId } : undefined,
    });
    return data;
  },

  getTank: async (tankId: string): Promise<TankSnapshot> => {
    const { data } = await apiClient.get(`/stock/tanks/${tankId}`);
    return data;
  },

  getAllSummaries: async (): Promise<StationSummary[]> => {
    const { data } = await apiClient.get('/stock/summary');
    return data;
  },

  getStationSummary: async (stationId: string): Promise<StationSummary> => {
    const { data } = await apiClient.get(`/stock/summary/${stationId}`);
    return data;
  },

  recordMovement: async (payload: RecordMovementPayload) => {
    const { data } = await apiClient.post('/stock/movements', payload);
    return data;
  },

  getMovements: async (params: {
    tankId?: string;
    type?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const { data } = await apiClient.get('/stock/movements', { params });
    return data as { items: StockMovement[]; total: number };
  },

  updateReorder: async (tankId: string, payload: UpdateReorderPayload): Promise<TankSnapshot> => {
    const { data } = await apiClient.patch(`/stock/tanks/${tankId}/reorder`, payload);
    return data;
  },

  getValuation: async (stationId: string) => {
    const { data } = await apiClient.get(`/stock/valuation/${stationId}`);
    return data;
  },
};
