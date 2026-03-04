import { apiClient } from './client';

export interface CarWashJob {
  id: string;
  stationId: string;
  station: { id: string; name: string };
  vehicleNumber: string;
  washType: string;
  amountLkr: number;
  paymentMethod: string;
  washDate: string;
  notes: string | null;
  createdBy: { id: string; fullName: string };
  createdAt: string;
}

export interface CreateCarWashJobPayload {
  stationId: string;
  vehicleNumber: string;
  washType: string;
  amountLkr: number;
  paymentMethod: string;
  washDate: string;
  notes?: string;
}

export interface CarWashSummary {
  period: { from: string; to: string };
  totalJobs: number;
  totalRevenue: number;
  byType: Array<{ washType: string; count: number; revenue: number }>;
}

export const carWashApi = {
  createJob: async (payload: CreateCarWashJobPayload): Promise<CarWashJob> => {
    const { data } = await apiClient.post('/v1/car-wash/jobs', payload);
    return data;
  },

  getJobs: async (params?: {
    stationId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: CarWashJob[]; total: number }> => {
    const { data } = await apiClient.get('/v1/car-wash/jobs', { params });
    return data;
  },

  getSummary: async (params: {
    stationId?: string;
    from: string;
    to: string;
  }): Promise<CarWashSummary> => {
    const { data } = await apiClient.get('/v1/car-wash/summary', { params });
    return data;
  },
};
