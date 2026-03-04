import axios from 'axios';
import { AuthTokens, IUser, LoginDto } from '@gasstation/shared-types';

const BASE = '/api/v1/auth';

export const authApi = {
  login: async (dto: LoginDto): Promise<AuthTokens> => {
    const { data } = await axios.post(`${BASE}/login`, dto);
    return data;
  },

  getProfile: async (accessToken: string): Promise<IUser> => {
    const { data } = await axios.get(`${BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await axios.post(`${BASE}/refresh`, { refreshToken });
    return data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await axios.post(`${BASE}/logout`, { refreshToken });
  },
};
