import { apiClient } from './client';

export interface WorkerChangeRequest {
  id: string;
  workerId: string;
  requestedById: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  newWorkerType?: string | null;
  newFullName?: string | null;
  newStationId?: string | null;
  newIsActive?: boolean | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewerNotes?: string | null;
  createdAt: string;
  worker: { id: string; fullName: string; role: string; stationId: string | null; workerType: string | null };
  requestedBy: { id: string; fullName: string; role: string };
  reviewedBy?: { id: string; fullName: string } | null;
}

export const workerChangesApi = {
  createRequest: async (payload: {
    workerId: string;
    newWorkerType?: string;
    newFullName?: string;
    newStationId?: string;
    newIsActive?: boolean;
  }): Promise<WorkerChangeRequest> => {
    const { data } = await apiClient.post('/v1/worker-changes', payload);
    return data;
  },

  getRequests: async (params?: {
    status?: string;
    workerId?: string;
  }): Promise<WorkerChangeRequest[]> => {
    const { data } = await apiClient.get('/v1/worker-changes', { params });
    return data;
  },

  approve: async (id: string): Promise<WorkerChangeRequest> => {
    const { data } = await apiClient.patch(`/v1/worker-changes/${id}/approve`);
    return data;
  },

  reject: async (id: string, reviewerNotes?: string): Promise<WorkerChangeRequest> => {
    const { data } = await apiClient.patch(`/v1/worker-changes/${id}/reject`, { reviewerNotes });
    return data;
  },
};
