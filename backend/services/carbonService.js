/**
 * services/carbonService.js
 *
 * Core carbon emission calculation engine.
 *
 * All CO₂ values are derived dynamically from existing Reading documents.
 * No redundant storage — calculations are on-demand.
 *
 * Bangladesh Grid Emission Factor: 0.67 kg CO₂ per kWh
 * Source: BPDB / IEA Bangladesh grid emission intensity
 */

const Reading = require('../models/Reading');
const User    = require('../models/User');

// ─── Emission Factor ──────────────────────────────────────────────────────────
const getEmissionFactor = () =>
  parseFloat(process.env.CARBON_EMISSION_FACTOR || '0.67');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get energy consumed (kWh delta) between two timestamps for a device.
 * Uses first and last Reading in the range.
 */
const getEnergyDelta = async (esp_id, from, to) => {
  const [first, last] = await Promise.all([
    Reading.findOne({ esp_id, timestamp: { $gte: from, $lte: to } })
      .sort({ timestamp: 1 })
      .select('energy -_id')
      .lean(),
    Reading.findOne({ esp_id, timestamp: { $gte: from, $lte: to } })
      .sort({ timestamp: -1 })
      .select('energy -_id')
      .lean(),
  ]);

  if (!first || !last) return 0;
  return Math.max(0, last.energy - first.energy);
};

/**
 * Convert kWh to kg CO₂.
 */
const kwhToCO2 = (kwh) =>
  parseFloat((kwh * getEmissionFactor()).toFixed(4));

// ─── Date Utilities ───────────────────────────────────────────────────────────

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// ─── Emission Calculations ────────────────────────────────────────────────────

/**
 * Daily CO₂ emission for a specific date.
 * @param {string} esp_id
 * @param {Date}   date  — start of the target day (UTC midnight)
 */
const getDailyEmission = async (esp_id, date = startOfToday()) => {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setHours(23, 59, 59, 999);

  const kwh = await getEnergyDelta(esp_id, from, to);
  return { kwh: parseFloat(kwh.toFixed(4)), co2: kwhToCO2(kwh) };
};

/**
 * Weekly CO₂ emission (last 7 calendar days).
 */
const getWeeklyEmission = async (esp_id) => {
  const from = daysAgo(7);
  const to   = new Date();
  const kwh  = await getEnergyDelta(esp_id, from, to);
  return { kwh: parseFloat(kwh.toFixed(4)), co2: kwhToCO2(kwh) };
};

/**
 * Monthly CO₂ emission (current calendar month).
 */
const getMonthlyEmission = async (esp_id) => {
  const from = startOfMonth();
  const to   = new Date();
  const kwh  = await getEnergyDelta(esp_id, from, to);
  return { kwh: parseFloat(kwh.toFixed(4)), co2: kwhToCO2(kwh) };
};

/**
 * Lifetime CO₂ emission (all-time cumulative energy).
 * Uses the very first and the very last Reading for the device.
 */
const getLifetimeEmission = async (esp_id) => {
  const [first, last] = await Promise.all([
    Reading.findOne({ esp_id }).sort({ timestamp: 1 }).select('energy -_id').lean(),
    Reading.findOne({ esp_id }).sort({ timestamp: -1 }).select('energy -_id').lean(),
  ]);

  if (!first || !last) return { kwh: 0, co2: 0 };
  const kwh = Math.max(0, last.energy - first.energy);
  return { kwh: parseFloat(kwh.toFixed(4)), co2: kwhToCO2(kwh) };
};

/**
 * Previous week emission (7–14 days ago).
 */
const getPreviousWeekEmission = async (esp_id) => {
  const from = daysAgo(14);
  const to   = daysAgo(7);
  const kwh  = await getEnergyDelta(esp_id, from, to);
  return { kwh: parseFloat(kwh.toFixed(4)), co2: kwhToCO2(kwh) };
};

/**
 * Previous month emission (last calendar month).
 */
const getPreviousMonthEmission = async (esp_id) => {
  const now  = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const to   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const kwh  = await getEnergyDelta(esp_id, from, to);
  return { kwh: parseFloat(kwh.toFixed(4)), co2: kwhToCO2(kwh) };
};

// ─── Sustainability Score ─────────────────────────────────────────────────────

/**
 * Eco-score based on monthly kWh.
 * Thresholds calibrated for a single hostel room:
 *   Excellent  (<= 30 kWh/month)
 *   Good       (<= 60 kWh/month)
 *   Moderate   (<= 100 kWh/month)
 *   High       (> 100 kWh/month)
 */
const getSustainabilityScore = (monthlyKWh) => {
  let score, label, tier;
  if (monthlyKWh <= 30) {
    score = Math.round(90 + (10 * (1 - monthlyKWh / 30)));
    score = Math.min(100, score);
    label = 'Excellent';
    tier  = 'excellent';
  } else if (monthlyKWh <= 60) {
    score = Math.round(70 + (19 * (1 - (monthlyKWh - 30) / 30)));
    label = 'Good';
    tier  = 'good';
  } else if (monthlyKWh <= 100) {
    score = Math.round(50 + (19 * (1 - (monthlyKWh - 60) / 40)));
    label = 'Moderate';
    tier  = 'moderate';
  } else {
    score = Math.max(0, Math.round(49 * (1 - (monthlyKWh - 100) / 200)));
    label = 'High Consumption';
    tier  = 'high';
  }
  return { score: Math.max(0, Math.min(100, score)), label, tier };
};

// ─── Carbon Savings ───────────────────────────────────────────────────────────

/**
 * Compare current vs previous period emissions.
 * Returns absolute saved amounts and percentage change.
 */
const getCarbonSavings = async (esp_id) => {
  const [currWeek, prevWeek, currMonth, prevMonth] = await Promise.all([
    getWeeklyEmission(esp_id),
    getPreviousWeekEmission(esp_id),
    getMonthlyEmission(esp_id),
    getPreviousMonthEmission(esp_id),
  ]);

  const weekSavedCO2 = parseFloat((prevWeek.co2 - currWeek.co2).toFixed(4));
  const monthSavedCO2 = parseFloat((prevMonth.co2 - currMonth.co2).toFixed(4));

  const weekPct =
    prevWeek.co2 > 0
      ? parseFloat(((weekSavedCO2 / prevWeek.co2) * 100).toFixed(1))
      : 0;
  const monthPct =
    prevMonth.co2 > 0
      ? parseFloat(((monthSavedCO2 / prevMonth.co2) * 100).toFixed(1))
      : 0;

  return {
    week: {
      current:   currWeek.co2,
      previous:  prevWeek.co2,
      saved:     weekSavedCO2,
      percent:   weekPct,
      improved:  weekSavedCO2 > 0,
    },
    month: {
      current:   currMonth.co2,
      previous:  prevMonth.co2,
      saved:     monthSavedCO2,
      percent:   monthPct,
      improved:  monthSavedCO2 > 0,
    },
  };
};

// ─── 30-Day Trend ─────────────────────────────────────────────────────────────

/**
 * Build an array of daily { date, kwh, co2 } for the last N days.
 * Uses a per-day MongoDB aggregation to get first/last energy readings.
 */
const getDailyTrend = async (esp_id, days = 30) => {
  const from = daysAgo(days);

  const results = await Reading.aggregate([
    {
      $match: {
        esp_id,
        timestamp: { $gte: from },
      },
    },
    // H4 FIX: $first/$last only give correct results when the input is sorted.
    // Without this, they return arbitrary values — producing wrong kWh deltas.
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: {
          year:  { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day:   { $dayOfMonth: '$timestamp' },
        },
        firstEnergy: { $first: '$energy' },
        lastEnergy:  { $last: '$energy' },
        date:        { $min: '$timestamp' },
      },
    },
    {
      $project: {
        _id:  0,
        date: 1,
        kwh: {
          $round: [
            { $max: [0, { $subtract: ['$lastEnergy', '$firstEnergy'] }] },
            4,
          ],
        },
      },
    },
    { $sort: { date: 1 } },
  ]);

  const factor = getEmissionFactor();
  return results.map((r) => ({
    date: r.date,
    kwh:  r.kwh,
    co2:  parseFloat((r.kwh * factor).toFixed(4)),
  }));
};

// ─── Hostel Leaderboard ───────────────────────────────────────────────────────

/**
 * H3 FIX: Replaced N+1 query pattern with a single aggregation pipeline.
 *
 * Old approach: For each user, called getEnergyDelta() (2 queries each) = 2N+1 total.
 * New approach: 1 aggregation + 1 User lookup = 2 queries total, regardless of user count.
 *
 * Get top 10 rooms ranked by lowest monthly kWh (most energy-efficient first).
 * Returns room_number, monthly kWh, monthly CO₂, and sustainability score.
 * Student names are omitted for privacy.
 */
const getLeaderboard = async () => {
  const from = startOfMonth();

  // Single aggregation: get first/last energy per device for the current month
  const results = await Reading.aggregate([
    { $match: { timestamp: { $gte: from } } },
    // Sort so $first/$last are deterministic (same fix as H4)
    { $sort: { esp_id: 1, timestamp: 1 } },
    {
      $group: {
        _id: '$esp_id',
        firstEnergy: { $first: '$energy' },
        lastEnergy:  { $last: '$energy' },
      },
    },
    {
      $project: {
        _id: 0,
        esp_id: '$_id',
        monthlyKWh: {
          $round: [
            { $max: [0, { $subtract: ['$lastEnergy', '$firstEnergy'] }] },
            4,
          ],
        },
      },
    },
    { $sort: { monthlyKWh: 1 } },
    { $limit: 10 },
  ]);

  if (results.length === 0) return [];

  // One enrichment query for room numbers (instead of N individual lookups)
  const users = await User.find({
    esp_id: { $in: results.map((r) => r.esp_id) },
  })
    .select('esp_id room_number')
    .lean();

  const userMap = Object.fromEntries(
    users.map((u) => [u.esp_id, u.room_number])
  );

  const factor = getEmissionFactor();

  return results.map((r) => {
    const co2 = kwhToCO2(r.monthlyKWh);
    const { score, label, tier } = getSustainabilityScore(r.monthlyKWh);
    return {
      esp_id:      r.esp_id,
      room_number: userMap[r.esp_id] || 'Unknown',
      monthlyKWh:  r.monthlyKWh,
      monthlyCO2:  co2,
      score,
      label,
      tier,
    };
  });
};

// ─── Environmental Equivalents ────────────────────────────────────────────────

/**
 * Convert kg CO₂ to relatable real-world equivalents.
 */
const getEnvironmentalEquivalents = (co2Kg) => {
  return {
    carKm:        parseFloat((co2Kg / 0.21).toFixed(1)),   // avg 0.21 kg CO₂/km
    gasolineLiters: parseFloat((co2Kg / 2.31).toFixed(2)), // 1L petrol ≈ 2.31 kg CO₂
    smartphones:  Math.round(co2Kg / 0.008),               // 1 charge ≈ 8g CO₂
    fanHours:     Math.round(co2Kg / 0.04),                // 60W fan × 0.67 factor ≈ 0.04 kg/h
    treesMonths:  parseFloat((co2Kg / 1.75).toFixed(2)),   // 1 tree absorbs ~21 kg/yr = 1.75/mo
    treesYear:    parseFloat((co2Kg / 21).toFixed(2)),      // 1 mature tree absorbs ~21 kg/yr
  };
};

// ─── Full Carbon Profile ──────────────────────────────────────────────────────

/**
 * Aggregate all carbon data for the dashboard endpoint.
 */
const getFullCarbonProfile = async (esp_id) => {
  const [daily, weekly, monthly, lifetime, savings] = await Promise.all([
    getDailyEmission(esp_id),
    getWeeklyEmission(esp_id),
    getMonthlyEmission(esp_id),
    getLifetimeEmission(esp_id),
    getCarbonSavings(esp_id),
  ]);

  const { score, label, tier } = getSustainabilityScore(monthly.kwh);
  const equivalents = getEnvironmentalEquivalents(monthly.co2);

  return {
    emissionFactor: getEmissionFactor(),
    daily,
    weekly,
    monthly,
    lifetime,
    savings,
    score: { score, label, tier },
    equivalents,
    treesNeeded: {
      monthly:  parseFloat((monthly.co2 / 21).toFixed(2)),
      lifetime: parseFloat((lifetime.co2 / 21).toFixed(2)),
    },
  };
};

module.exports = {
  getDailyEmission,
  getWeeklyEmission,
  getMonthlyEmission,
  getLifetimeEmission,
  getCarbonSavings,
  getDailyTrend,
  getLeaderboard,
  getSustainabilityScore,
  getEnvironmentalEquivalents,
  getFullCarbonProfile,
  kwhToCO2,
  getEmissionFactor,
};
