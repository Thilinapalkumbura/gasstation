import { apiClient } from './client';

export interface ServiceJob {
  id: string;
  stationId: string;
  station: { id: string; name: string };
  vehicleNumber: string;
  serviceType: string;
  amountLkr: number;
  paymentMethod: string;
  serviceDate: string;
  notes: string | null;
  createdBy: { id: string; fullName: string };
  createdAt: string;
}

export interface CreateServiceJobPayload {
  stationId: string;
  vehicleNumber: string;
  serviceType: string;
  amountLkr: number;
  paymentMethod: string;
  serviceDate: string;
  notes?: string;
}

export interface ServiceJobSummary {
  period: { from: string; to: string };
  totalJobs: number;
  totalRevenue: number;
  byType: Array<{ serviceType: string; count: number; revenue: number }>;
}

export const vehicleServicesApi = {
  createJob: async (payload: CreateServiceJobPayload): Promise<ServiceJob> => {
    const { data } = await apiClient.post('/v1/vehicle-services/jobs', payload);
    return data;
  },

  getJobs: async (params?: {
    stationId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ServiceJob[]; total: number }> => {
    const { data } = await apiClient.get('/v1/vehicle-services/jobs', { params });
    return data;
  },

  getSummary: async (params: {
    stationId?: string;
    from: string;
    to: string;
  }): Promise<ServiceJobSummary> => {
    const { data } = await apiClient.get('/v1/vehicle-services/summary', { params });
    return data;
  },
};
