import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  username: string | null;
  isAdmin: boolean;

  login: (token: string, username: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      isAdmin: false,

      login: (token, username) => set({ token, username, isAdmin: true }),
      logout: () => set({ token: null, username: null, isAdmin: false }),
    }),
    { name: 'restorano-auth' }
  )
);
