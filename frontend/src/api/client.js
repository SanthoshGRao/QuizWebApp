import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_PATH = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

