/**
 * src/api/paymentApi.js
 * Payment-specific API calls — uses the centralised Axios instance from api.js.
 */

import api from './api';

// ── GET /api/payments/current-bill/:esp_id ────────────────────────────────────
export const getCurrentBill = (esp_id) =>
  api.get(`/payments/current-bill/${esp_id}`);

// ── POST /api/payments/create ─────────────────────────────────────────────────
export const createPayment = (esp_id) =>
  api.post('/payments/create', { esp_id });

// ── POST /api/payments/verify ─────────────────────────────────────────────────
export const verifyPayment = (transactionId) =>
  api.post('/payments/verify', { transactionId });

// ── GET /api/payments/history/:esp_id ────────────────────────────────────────
export const getPaymentHistory = (esp_id, { page = 1, limit = 10, search = '' } = {}) =>
  api.get(`/payments/history/${esp_id}`, { params: { page, limit, search } });
