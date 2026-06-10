/**
 * routes/readingRoutes.js
 */

const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  saveReading,
  getDashboard,
  acknowledgeAlert,
} = require('../controllers/readingController');

// POST /api/readings — No auth: called directly by the ESP32 hardware
router.post('/readings', saveReading);

// GET /api/dashboard/:esp_id — Protected: only authenticated users
router.get('/dashboard/:esp_id', protect, getDashboard);

// PATCH /api/alerts/:id/acknowledge — Protected
router.patch('/alerts/:id/acknowledge', protect, acknowledgeAlert);

module.exports = router;
