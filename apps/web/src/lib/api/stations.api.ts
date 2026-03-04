import { apiClient } from './client';

export interface Station {
  id: string;
  name: string;
  city: string;
  address: string;
  contactNumber: string;
  isActive: boolean;
}

export const stationsApi = {
  getAll: async (): Promise<Station[]> => {
    const { data } = await apiClient.get('/stations');
    return data;
  },
};
