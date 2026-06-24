/**
 * routes/carbonRoutes.js
 *
 * All carbon footprint routes — protected by JWT middleware.
 *
 * IMPORTANT: The leaderboard route is registered before /:esp_id
 * to prevent Express from treating "leaderboard" as an esp_id param.
 */

const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getCarbonProfile,
  getCarbonTrends,
  getCarbonLeaderboard,
  getCarbonInsights,
} = require('../controllers/carbonController');

// GET /api/carbon/leaderboard — must be before /:esp_id
router.get('/carbon/leaderboard', protect, getCarbonLeaderboard);

// GET /api/carbon/:esp_id
router.get('/carbon/:esp_id', protect, getCarbonProfile);

// GET /api/carbon/trends/:esp_id
router.get('/carbon/trends/:esp_id', protect, getCarbonTrends);

// GET /api/carbon/insights/:esp_id
router.get('/carbon/insights/:esp_id', protect, getCarbonInsights);

module.exports = router;
