import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { IUser } from '@gasstation/shared-types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: IUser | null;
  isAuthenticated: boolean;
  setAuth: (data: { accessToken: string; refreshToken: string; user: IUser }) => void;
  updateAccessToken: (accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: ({ accessToken, refreshToken, user }) => {
        document.cookie = 'gs-authenticated=1; path=/; SameSite=Lax';
        set({ accessToken, refreshToken, user, isAuthenticated: true });
      },

      updateAccessToken: (accessToken) => set({ accessToken }),

      logout: () => {
        document.cookie = 'gs-authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'gasstation-auth',
      storage: createJSONStorage(() => sessionStorage), // sessionStorage: cleared on tab close
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
