/**
 * src/api/carbonApi.js
 * Axios calls for all Carbon Footprint API endpoints.
 * Uses the existing api instance (auto-attaches JWT token).
 */

import api from './api';

// GET /api/carbon/:esp_id — Full carbon profile
export const getCarbonProfile = (esp_id) =>
  api.get(`/carbon/${esp_id}`);

// GET /api/carbon/trends/:esp_id — 30-day daily CO₂ trend
export const getCarbonTrends = (esp_id, days = 30) =>
  api.get(`/carbon/trends/${esp_id}`, { params: { days } });

// GET /api/carbon/leaderboard — Hostel-wide ranking
export const getCarbonLeaderboard = () =>
  api.get('/carbon/leaderboard');

// GET /api/carbon/insights/:esp_id — AI sustainability insights
export const getCarbonInsights = (esp_id) =>
  api.get(`/carbon/insights/${esp_id}`);
