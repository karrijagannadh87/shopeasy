/**
 * API client — axios instance pointing at the Next.js /api proxy,
 * which rewrites to the Express backend. JWT is attached automatically.
 */
import axios from 'axios';

// In static-demo builds the site is served under a base path (GitHub Pages)
// and the service worker answers /api/*; otherwise Next.js proxies to Express.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const api = axios.create({ baseURL: `${BASE}/api` });

api.interceptors.request.use((config) => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('shopeasy_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      // Only clear when the request actually needed auth (has a token).
      if (localStorage.getItem('shopeasy_token')) {
        const url = err.config?.url || '';
        if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
          localStorage.removeItem('shopeasy_token');
          localStorage.removeItem('shopeasy_user');
          window.dispatchEvent(new Event('shopeasy:logout'));
        }
      }
    }
    return Promise.reject(err);
  }
);

export function errorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error || err?.message || fallback;
}

export const money = (value) =>
  `$${Number(value || 0).toFixed(2)}`;

export default api;
