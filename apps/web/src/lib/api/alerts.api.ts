import { apiClient } from './client';

export type AlertType = 'FUEL_TANK' | 'SPARE_PART' | 'GAS_CYLINDER';

export interface AlertHistoryItem {
  id: string;
  type: AlertType;
  stationId: string;
  station: { id: string; name: string };
  entityId: string;
  entityName: string;
  currentStock: number;
  reorderLevel: number;
  isCritical: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AlertsPage {
  data: AlertHistoryItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const alertsApi = {
  getAlerts: async (params?: {
    stationId?: string;
    type?: AlertType;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<AlertsPage> => {
    const { data } = await apiClient.get('/v1/alerts', { params });
    return data;
  },
};
