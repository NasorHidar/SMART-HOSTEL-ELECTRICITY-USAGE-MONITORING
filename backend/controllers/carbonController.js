/**
 * controllers/carbonController.js
 *
 * GET /api/carbon/:esp_id           — Full carbon profile for a device
 * GET /api/carbon/trends/:esp_id    — 30-day daily CO₂ trend data
 * GET /api/carbon/leaderboard       — Top 10 hostel rooms by monthly efficiency
 * GET /api/carbon/insights/:esp_id  — Last 5 AI sustainability insights
 *
 * All routes protected by JWT middleware.
 */

const {
  getFullCarbonProfile,
  getDailyTrend,
  getLeaderboard,
} = require('../services/carbonService');
const SustainabilityInsight = require('../models/SustainabilityInsight');

// ─── GET /api/carbon/:esp_id ──────────────────────────────────────────────────
/**
 * Returns the complete carbon profile:
 *   - daily / weekly / monthly / lifetime emissions (kWh + kg CO₂)
 *   - sustainability score
 *   - carbon savings vs previous periods
 *   - trees needed to offset
 *   - environmental equivalents
 */
const getCarbonProfile = async (req, res) => {
  try {
    const esp_id = req.params.esp_id.trim().toUpperCase();

    // Verify ownership
    if (req.user.esp_id !== esp_id) {
      return res.status(403).json({ message: 'Access denied — device mismatch' });
    }

    const profile = await getFullCarbonProfile(esp_id);
    res.json(profile);
  } catch (err) {
    console.error('[Carbon] getCarbonProfile error:', err);
    res.status(500).json({ message: 'Failed to fetch carbon profile' });
  }
};

// ─── GET /api/carbon/trends/:esp_id ──────────────────────────────────────────
/**
 * Returns an array of { date, kwh, co2 } for each of the last 30 days.
 * Used to render the Carbon Trend Area Chart in the frontend.
 */
const getCarbonTrends = async (req, res) => {
  try {
    const esp_id = req.params.esp_id.trim().toUpperCase();

    // Verify ownership
    if (req.user.esp_id !== esp_id) {
      return res.status(403).json({ message: 'Access denied — device mismatch' });
    }

    const days   = parseInt(req.query.days, 10) || 30;
    const trend  = await getDailyTrend(esp_id, Math.min(days, 90));
    res.json({ trend, days });
  } catch (err) {
    console.error('[Carbon] getCarbonTrends error:', err);
    res.status(500).json({ message: 'Failed to fetch carbon trends' });
  }
};

// ─── GET /api/carbon/leaderboard ─────────────────────────────────────────────
/**
 * Returns the top 10 most energy-efficient hostel rooms for the current month.
 * Privacy: only room_number is exposed, not student_name.
 */
const getCarbonLeaderboard = async (_req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json({ leaderboard, month: new Date().toISOString().slice(0, 7) });
  } catch (err) {
    console.error('[Carbon] getCarbonLeaderboard error:', err);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
};

// ─── GET /api/carbon/insights/:esp_id ────────────────────────────────────────
/**
 * Returns the last 5 AI-generated sustainability insights for a device.
 * Sorted newest first.
 */
const getCarbonInsights = async (req, res) => {
  try {
    const esp_id = req.params.esp_id.trim().toUpperCase();

    // Verify ownership
    if (req.user.esp_id !== esp_id) {
      return res.status(403).json({ message: 'Access denied — device mismatch' });
    }

    const insights = await SustainabilityInsight.find({ esp_id })
      .sort({ date: -1 })
      .limit(5)
      .lean();
    res.json({ insights });
  } catch (err) {
    console.error('[Carbon] getCarbonInsights error:', err);
    res.status(500).json({ message: 'Failed to fetch sustainability insights' });
  }
};

module.exports = {
  getCarbonProfile,
  getCarbonTrends,
  getCarbonLeaderboard,
  getCarbonInsights,
};
