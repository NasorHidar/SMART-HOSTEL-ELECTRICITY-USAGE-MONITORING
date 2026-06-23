/**
 * routes/paymentRoutes.js
 *
 * Express router for all payment-related endpoints.
 * Webhook is deliberately NOT protected by JWT — it is called by the
 * SSLCommerz gateway server, not by the end user's browser.
 */

const express = require('express');
const router  = express.Router();

const { protect } = require('../middleware/authMiddleware');
const {
  getCurrentBill,
  createPayment,
  verifyPayment,
  webhookHandler,
  getPaymentHistory,
} = require('../controllers/paymentController');

// ── Protected routes (require Bearer JWT) ─────────────────────────────────────

// GET  /api/payments/current-bill/:esp_id — Fetch live bill calculation
router.get('/payments/current-bill/:esp_id', protect, getCurrentBill);

// POST /api/payments/create — Initiate SSLCommerz payment session
router.post('/payments/create', protect, createPayment);

// POST /api/payments/verify — Manual transaction verification
router.post('/payments/verify', protect, verifyPayment);

// GET  /api/payments/history/:esp_id — Paginated payment history
router.get('/payments/history/:esp_id', protect, getPaymentHistory);

// ── Public route — gateway callback (no JWT) ──────────────────────────────────

// POST /api/payments/webhook — SSLCommerz success/fail/cancel redirect
router.post('/payments/webhook', webhookHandler);

module.exports = router;
