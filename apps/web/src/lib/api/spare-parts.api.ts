import { apiClient } from './client';

export interface SparePart {
  id: string;
  stationId: string;
  station: { id: string; name: string };
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
  unitPriceLkr: number;
  costPriceLkr: number;
  currentStock: number;
  reorderLevel: number;
  isActive: boolean;
  createdAt: string;
}

export interface SparePartSaleItem {
  sparePartId: string;
  quantity: number;
  unitPriceLkr: number;
}

export interface SparePartSale {
  id: string;
  stationId: string;
  station: { id: string; name: string };
  totalAmountLkr: number;
  paymentMethod: string;
  saleDate: string;
  notes: string | null;
  items: Array<{
    id: string;
    sparePart: { id: string; name: string; sku: string };
    quantity: number;
    unitPriceLkr: number;
    totalLkr: number;
  }>;
  createdBy: { id: string; fullName: string };
  createdAt: string;
}

export interface SparePartStockIn {
  id: string;
  stationId: string;
  station: { id: string; name: string };
  sparePart: { id: string; name: string; sku: string; currentStock: number };
  quantity: number;
  costPriceLkr: number;
  totalCostLkr: number;
  receivedAt: string;
  notes: string | null;
  createdAt: string;
}

export const sparePartsApi = {
  createPart: async (payload: Partial<SparePart>): Promise<SparePart> => {
    const { data } = await apiClient.post('/v1/spare-parts/catalog', payload);
    return data;
  },

  getParts: async (params?: {
    stationId?: string;
    lowStockOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<SparePart[]> => {
    const { data } = await apiClient.get('/v1/spare-parts/catalog', { params });
    return data;
  },

  getLowStock: async (params?: { stationId?: string }): Promise<SparePart[]> => {
    const { data } = await apiClient.get('/v1/spare-parts/catalog/low-stock', { params });
    return data;
  },

  updatePart: async (id: string, payload: Partial<SparePart>): Promise<SparePart> => {
    const { data } = await apiClient.patch(`/v1/spare-parts/catalog/${id}`, payload);
    return data;
  },

  createSale: async (payload: {
    stationId: string;
    paymentMethod: string;
    saleDate: string;
    items: SparePartSaleItem[];
    notes?: string;
  }): Promise<SparePartSale> => {
    const { data } = await apiClient.post('/v1/spare-parts/sales', payload);
    return data;
  },

  getSales: async (params?: {
    stationId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: SparePartSale[]; total: number }> => {
    const { data } = await apiClient.get('/v1/spare-parts/sales', { params });
    return data;
  },

  createStockIn: async (payload: {
    stationId: string;
    sparePartId: string;
    quantity: number;
    costPriceLkr: number;
    receivedAt?: string;
    notes?: string;
  }): Promise<SparePartStockIn> => {
    const { data } = await apiClient.post('/v1/spare-parts/stock-ins', payload);
    return data;
  },

  getStockIns: async (params?: {
    stationId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: SparePartStockIn[]; total: number }> => {
    const { data } = await apiClient.get('/v1/spare-parts/stock-ins', { params });
    return data;
  },
};
