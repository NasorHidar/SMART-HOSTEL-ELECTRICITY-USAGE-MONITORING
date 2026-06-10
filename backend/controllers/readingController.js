/**
 * controllers/readingController.js
 *
 * POST /api/readings   — Receive data from ESP32 and persist to MongoDB
 * GET  /api/dashboard/:esp_id — Return dashboard data (latest + 24 h chart + alerts)
 */

const Reading = require('../models/Reading');
const Alert   = require('../models/Alert');
const User    = require('../models/User');

// ─── POST /api/readings ───────────────────────────────────────────────────────
/**
 * Called by the ESP32 every ~2 seconds.
 * Body: { esp_id, voltage, current, power, energy }
 * No auth required — the ESP device itself doesn't hold a token.
 * Security note: in production, add a shared device secret header.
 */
const saveReading = async (req, res) => {
  try {
    const { esp_id, voltage, current, power, energy } = req.body;

    // Basic validation
    if (!esp_id || voltage == null || current == null || power == null || energy == null) {
      return res.status(400).json({ message: 'Missing required fields: esp_id, voltage, current, power, energy' });
    }

    const reading = await Reading.create({
      esp_id: esp_id.trim().toUpperCase(),
      timestamp: new Date(),
      voltage: parseFloat(voltage),
      current: parseFloat(current),
      power:   parseFloat(power),
      energy:  parseFloat(energy),
    });

    res.status(201).json({ message: 'Reading saved', id: reading._id });
  } catch (error) {
    console.error('[Readings] Save error:', error);
    res.status(500).json({ message: 'Failed to save reading' });
  }
};

// ─── GET /api/dashboard/:esp_id ───────────────────────────────────────────────
/**
 * Returns:
 *   latest   — the most recent Reading document
 *   daily    — today's total energy delta (kWh)
 *   chart    — hourly average power for the last 24 hours (for the chart)
 *   alerts   — last 10 unacknowledged AI alerts
 *   user     — student info (if registered)
 */
const getDashboard = async (req, res) => {
  try {
    const esp_id = req.params.esp_id.trim().toUpperCase();

    // ── Latest reading ────────────────────────────────────────────────────────
    const latest = await Reading.findOne({ esp_id })
      .sort({ timestamp: -1 })
      .lean();

    // ── 24-hour chart data (hourly average power) ─────────────────────────────
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const chartData = await Reading.aggregate([
      {
        $match: {
          esp_id,
          timestamp: { $gte: since24h },
        },
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            day:  { $dayOfMonth: '$timestamp' },
          },
          avgPower:   { $avg: '$power' },
          avgVoltage: { $avg: '$voltage' },
          avgCurrent: { $avg: '$current' },
          // Bucket timestamp = start of the hour
          hourStart: { $min: '$timestamp' },
        },
      },
      { $sort: { hourStart: 1 } },
      {
        $project: {
          _id: 0,
          timestamp: '$hourStart',
          power:   { $round: ['$avgPower',   2] },
          voltage: { $round: ['$avgVoltage', 2] },
          current: { $round: ['$avgCurrent', 3] },
        },
      },
    ]);

    // ── Daily energy total ────────────────────────────────────────────────────
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Daily kWh = last energy reading today − first energy reading today
    const [firstToday, lastToday] = await Promise.all([
      Reading.findOne({ esp_id, timestamp: { $gte: startOfDay } })
        .sort({ timestamp: 1 })
        .lean(),
      Reading.findOne({ esp_id, timestamp: { $gte: startOfDay } })
        .sort({ timestamp: -1 })
        .lean(),
    ]);

    const dailyKWh =
      firstToday && lastToday
        ? Math.max(0, lastToday.energy - firstToday.energy)
        : 0;

    // ── Alerts ────────────────────────────────────────────────────────────────
    const alerts = await Alert.find({ esp_id, acknowledged: false })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // ── User info ─────────────────────────────────────────────────────────────
    const user = await User.findOne({ esp_id }).lean();

    res.status(200).json({
      latest,
      dailyKWh: parseFloat(dailyKWh.toFixed(4)),
      chartData,
      alerts,
      user: user
        ? {
            student_name: user.student_name,
            room_number:  user.room_number,
            daily_limit_kwh: user.daily_limit_kwh,
          }
        : null,
    });
  } catch (error) {
    console.error('[Dashboard] Error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
};

// ─── PATCH /api/alerts/:id/acknowledge ───────────────────────────────────────
const acknowledgeAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json({ message: 'Alert acknowledged', alert });
  } catch (error) {
    res.status(500).json({ message: 'Failed to acknowledge alert' });
  }
};

module.exports = { saveReading, getDashboard, acknowledgeAlert };
