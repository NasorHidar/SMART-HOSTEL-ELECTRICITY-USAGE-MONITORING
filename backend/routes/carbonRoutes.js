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

// ⚠️  Order is critical: specific sub-paths must be registered BEFORE the
// generic /:esp_id route, otherwise Express will match /:esp_id first and
// treat "trends" / "insights" / "leaderboard" as an esp_id param value.

// GET /api/carbon/leaderboard
router.get('/carbon/leaderboard', protect, getCarbonLeaderboard);

// GET /api/carbon/trends/:esp_id
router.get('/carbon/trends/:esp_id', protect, getCarbonTrends);

// GET /api/carbon/insights/:esp_id
router.get('/carbon/insights/:esp_id', protect, getCarbonInsights);

// GET /api/carbon/:esp_id — must come LAST among carbon routes
router.get('/carbon/:esp_id', protect, getCarbonProfile);

module.exports = router;
