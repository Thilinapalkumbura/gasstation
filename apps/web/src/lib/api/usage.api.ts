import { apiClient } from './client';

export interface UsageLog {
  id: string;
  tankId: string;
  tank: {
    fuelType: string;
    station: { id: string; name: string; city: string };
  };
  shiftType: 'MORNING' | 'EVENING' | 'NIGHT';
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  openingMeterReading: number;
  closingMeterReading: number;
  openingStockLitres: number;
  closingStockLitres: number;
  dispensedLitres: number;
  physicalDispensedLitres: number;
  cashSalesLkr: number;
  creditSalesLkr: number;
  totalSalesLkr: number;
  pricePerLitreLkr: number;
  varianceLitres: number;
  isVarianceHigh: boolean;
  varianceSeverity: 'ok' | 'warning' | 'critical';
  workerNotes: string | null;
  rejectionNotes: string | null;
  recordedBy: { id: string; fullName: string; role: string };
  approvedBy: { id: string; fullName: string; role: string } | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface CreateUsageLogPayload {
  tankId: string;
  shiftType: string;
  date: string;
  openingMeterReading: number;
  closingMeterReading: number;
  openingStockLitres: number;
  closingStockLitres: number;
  pricePerLitreLkr: number;
  cashSalesLkr: number;
  creditSalesLkr: number;
  workerNotes?: string;
}

export interface DailySummaryEntry {
  date: string;
  fuels: Record<string, {
    dispensedLitres: number;
    totalSalesLkr: number;
    cashSalesLkr: number;
    creditSalesLkr: number;
    varianceLitres: number;
  }>;
  dayTotalLitres: number;
  dayTotalSalesLkr: number;
}

export const usageApi = {
  submitLog: async (payload: CreateUsageLogPayload): Promise<UsageLog> => {
    const { data } = await apiClient.post('/usage/logs', payload);
    return data;
  },

  getLogs: async (params?: {
    stationId?: string;
    tankId?: string;
    status?: string;
    shiftType?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: UsageLog[]; total: number }> => {
    const { data } = await apiClient.get('/usage/logs', { params });
    return data;
  },

  getPendingLogs: async (): Promise<{ items: UsageLog[]; total: number }> => {
    const { data } = await apiClient.get('/usage/logs/pending');
    return data;
  },

  getLog: async (id: string): Promise<UsageLog> => {
    const { data } = await apiClient.get(`/usage/logs/${id}`);
    return data;
  },

  approveLog: async (id: string): Promise<UsageLog> => {
    const { data } = await apiClient.patch(`/usage/logs/${id}/approve`);
    return data;
  },

  rejectLog: async (id: string, rejectionNotes: string): Promise<UsageLog> => {
    const { data } = await apiClient.patch(`/usage/logs/${id}/reject`, { rejectionNotes });
    return data;
  },

  getOpeningSuggestion: async (
    tankId: string,
    shiftType: string,
    date: string,
  ): Promise<{ openingStockLitres: number; source: string }> => {
    const { data } = await apiClient.get('/usage/suggest-opening', {
      params: { tankId, shiftType, date },
    });
    return data;
  },

  getDailySummary: async (
    stationId: string,
    from: string,
    to: string,
  ): Promise<DailySummaryEntry[]> => {
    const { data } = await apiClient.get('/usage/summary', { params: { stationId, from, to } });
    return data;
  },

  getPendingCount: async (stationId: string): Promise<number> => {
    const { data } = await apiClient.get('/usage/pending-count', { params: { stationId } });
    return data;
  },
};
