/**
 * routes/usagePredictionRoutes.js
 *
 * POST /api/predictions/predict-usage — Run both daily + monthly predictions
 * GET  /api/predictions/:esp_id       — Convenience GET alias (same result)
 *
 * Both endpoints are JWT-protected and enforce device ownership.
 */

'use strict';

const express = require('express');
const router  = express.Router();
const { protect }              = require('../middleware/authMiddleware');
const { predictDailyUsage, predictMonthlyUsage } = require('../services/usagePredictionService');

// ─── Shared handler ───────────────────────────────────────────────────────────

const runPredictions = async (req, res) => {
  try {
    // Accept esp_id from body (POST) or route params (GET).
    const rawId = req.body?.esp_id || req.params?.esp_id;

    if (!rawId) {
      return res.status(400).json({ message: 'Missing required field: esp_id' });
    }

    const esp_id = rawId.trim().toUpperCase();

    // Enforce ownership — token user must match the requested device.
    if (req.user.esp_id !== esp_id) {
      return res.status(403).json({ message: 'Access denied — device mismatch' });
    }

    // Run both predictions in parallel — each makes its own parallel DB calls.
    const [dailyPrediction, monthlyPrediction] = await Promise.all([
      predictDailyUsage(esp_id),
      predictMonthlyUsage(esp_id),
    ]);

    return res.status(200).json({
      esp_id,
      dailyPrediction,
      monthlyPrediction,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Prediction] Route error:', error);
    return res.status(500).json({ message: 'Failed to generate predictions' });
  }
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/predictions/predict-usage  — original endpoint (body: { esp_id })
router.post('/predictions/predict-usage', protect, runPredictions);

// GET  /api/predictions/:esp_id        — REST-friendly alias
router.get('/predictions/:esp_id', protect, runPredictions);

module.exports = router;