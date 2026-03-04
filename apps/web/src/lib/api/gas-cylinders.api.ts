import { apiClient } from './client';

export interface GasCylinder {
  id: string;
  stationId: string;
  station: { id: string; name: string };
  brand: string;
  sizeKg: number;
  sellingPriceLkr: number;
  purchasePriceLkr: number;
  fullStock: number;
  emptyStock: number;
  reorderLevel: number;
  isActive: boolean;
  createdAt: string;
}

export interface CylinderSale {
  id: string;
  stationId: string;
  station: { id: string; name: string };
  gasCylinder: { id: string; brand: string; sizeKg: number };
  isExchange: boolean;
  quantity: number;
  amountLkr: number;
  paymentMethod: string;
  saleDate: string;
  notes: string | null;
  createdBy: { id: string; fullName: string };
  createdAt: string;
}

export interface CylinderStockIn {
  id: string;
  stationId: string;
  station: { id: string; name: string };
  gasCylinder: { id: string; brand: string; sizeKg: number; fullStock: number };
  quantity: number;
  purchasePriceLkr: number;
  totalCostLkr: number;
  receivedAt: string;
  notes: string | null;
  createdAt: string;
}

export const gasCylindersApi = {
  createCylinder: async (payload: Partial<GasCylinder>): Promise<GasCylinder> => {
    const { data } = await apiClient.post('/v1/gas-cylinders/catalog', payload);
    return data;
  },

  getCylinders: async (params?: {
    stationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<GasCylinder[]> => {
    const { data } = await apiClient.get('/v1/gas-cylinders/catalog', { params });
    return data;
  },

  getLowStock: async (params?: { stationId?: string }): Promise<GasCylinder[]> => {
    const { data } = await apiClient.get('/v1/gas-cylinders/catalog/low-stock', { params });
    return data;
  },

  updateCylinder: async (id: string, payload: Partial<GasCylinder>): Promise<GasCylinder> => {
    const { data } = await apiClient.patch(`/v1/gas-cylinders/catalog/${id}`, payload);
    return data;
  },

  createSale: async (payload: {
    stationId: string;
    gasCylinderId: string;
    isExchange: boolean;
    quantity: number;
    amountLkr: number;
    paymentMethod: string;
    saleDate: string;
    notes?: string;
  }): Promise<CylinderSale> => {
    const { data } = await apiClient.post('/v1/gas-cylinders/sales', payload);
    return data;
  },

  getSales: async (params?: {
    stationId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: CylinderSale[]; total: number }> => {
    const { data } = await apiClient.get('/v1/gas-cylinders/sales', { params });
    return data;
  },

  createStockIn: async (payload: {
    stationId: string;
    gasCylinderId: string;
    quantity: number;
    purchasePriceLkr: number;
    receivedAt?: string;
    notes?: string;
  }): Promise<CylinderStockIn> => {
    const { data } = await apiClient.post('/v1/gas-cylinders/stock-ins', payload);
    return data;
  },

  getStockIns: async (params?: {
    stationId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: CylinderStockIn[]; total: number }> => {
    const { data } = await apiClient.get('/v1/gas-cylinders/stock-ins', { params });
    return data;
  },
};
