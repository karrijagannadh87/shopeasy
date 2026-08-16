/**
 * Auth store (zustand + localStorage) — token & user, login/register/logout.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      ready: false,

      setSession(token, user) {
        localStorage.setItem('shopeasy_token', token);
        set({ token, user, ready: true });
      },

      async login(email, password) {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('shopeasy_token', data.token);
        set({ token: data.token, user: data.user, ready: true });
        return data.user;
      },

      async register(name, email, password) {
        const { data } = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('shopeasy_token', data.token);
        set({ token: data.token, user: data.user, ready: true });
        return data.user;
      },

      async fetchMe() {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.user, ready: true });
          return data.user;
        } catch {
          get().logout(false);
          return null;
        }
      },

      logout(notify = true) {
        localStorage.removeItem('shopeasy_token');
        set({ user: null, token: null, ready: true });
        if (notify && typeof window !== 'undefined') {
          window.dispatchEvent(new Event('shopeasy:logout'));
        }
      },
    }),
    {
      name: 'shopeasy-auth',
      partialize: (s) => ({ user: s.user, token: s.token, ready: true }),
      onRehydrateStorage: () => (state) => {
        // If a token exists, verify it against the server once per load.
        if (state?.token) state.fetchMe();
        else state?.setReady?.();
      },
    }
  )
);

// Small helper so rehydration can mark ready without a token.
useAuthStore.setState({ setReady: () => useAuthStore.setState({ ready: true }) });
