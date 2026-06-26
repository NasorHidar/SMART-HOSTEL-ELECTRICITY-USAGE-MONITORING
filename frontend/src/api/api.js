/**
 * src/api/api.js
 * Centralised Axios instance with JWT injection.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Attach JWT token to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — clear stale token and redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sm_token');
      localStorage.removeItem('sm_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const loginByEspId = (esp_id, password) =>
  api.post('/login', { esp_id, password });

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboard = (esp_id) =>
  api.get(`/dashboard/${esp_id}`);

// ─── Alerts ────────────────────────────────────────────────────────────────────
export const acknowledgeAlert = (alertId) =>
  api.patch(`/alerts/${alertId}/acknowledge`);

export default api;
