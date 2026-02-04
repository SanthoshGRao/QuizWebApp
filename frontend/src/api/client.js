import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const BASE_PATH = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';

if (!API_BASE_URL) {
  // In production this must be set; in development we log loudly to make misconfig obvious.
  // The app will fallback to same-origin requests if this is missing.
  // eslint-disable-next-line no-console
  console.error('VITE_API_URL is not set. API requests will target the current origin.');
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL || '',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('quizapp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isLoginRequest = err.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('quizapp_token');
        window.location.href = `${BASE_PATH}/login`.replace(/\/\/+/g, '/');
      }
    }
    return Promise.reject(err);
  },
);

