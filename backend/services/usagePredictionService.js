const Reading = require('../models/Reading');

/**
 * usagePredictionService.js
 * Usage prediction algorithms for Smart Meter ESP32 devices.
 *
 * Provides daily and monthly energy usage predictions based on historical data
 * and current behavior patterns. Algorithms are optimized for MongoDB time-series
 * collections to ensure efficient querying.
 */

// ─── Daily Usage Prediction ─────────────────────────────────────────────────────

/**
 * Predicts total expected energy usage for the current day.
 *
 * Algorithm combines weighted historical patterns with current day behavior:
 * 1. Past 7 days weighted average (70% weight)
 *    - Days decay exponentially: day 1 (1.0), day 2 (0.8), day 3 (0.64), etc.
 * 2. Current day progress (30% weight)
 *    - Extrapolates from energy delta and elapsed time
 *    - If day complete, uses actual usage
 *
 * Weighting rationale: Historical patterns provide seasonal context
 * (70%), while real-time trend captures current conditions (30%).
 *
 * @param {string} esp_id - ESP32 device identifier
 * @returns {object} { predictedKWh: number, confidence: number }
 */
const predictDailyUsage = async (esp_id) => {
  try {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [past7DaysAvg, currentDayProgress] = await Promise.all([
      calculateWeighted7DayAverage(esp_id, sevenDaysAgo, yesterday),
      getCurrentDayUsageProgress(esp_id, todayStart, now),
    ]);

    if (currentDayProgress === 0 && past7DaysAvg === 0) {
      return { predictedKWh: 0, confidence: 0 };
    }

    const predictedKWh = Math.max(0, past7DaysAvg * 0.7 + currentDayProgress * 0.3);
    const confidence = Math.min(100, 30 + past7DaysAvg * 4);

    return {
      predictedKWh: parseFloat(predictedKWh.toFixed(3)),
      confidence: Math.max(0, Math.min(100, confidence)),
      weights: { historical: 0.7, current: 0.3 },
    };
  } catch (error) {
    console.error(`[Usage Prediction] Error predicting daily usage for ${esp_id}:`, error.message);
    return { predictedKWh: 0, confidence: 0, error: error.message };
  }
};

/**
 * Calculates weighted average of daily usage from past 7 days.
 *
 * Uses exponential decay to give more weight to recent days:
 * - Day 1 (most recent): weight 1.0
 * - Day 2: weight 0.8  (80% of previous day's importance)
 * - Day 3: weight 0.64 (64% of day 1's importance)
 * - Day n: weight 0.8^(n-1)
 *
 * This captures seasonal patterns while remaining responsive to changes.
 *
 * @param {string} esp_id - ESP32 device identifier
 * @param {Date} start - Start date (inclusive)
 * @param {Date} end - End date (inclusive)
 * @returns {number} Weighted average daily kWh
 */
const calculateWeighted7DayAverage = async (esp_id, start, end) => {
  const dailyTrends = await getDailyTrendsForPeriod(esp_id, start, end);

  if (dailyTrends.length === 0) return 0;

  const weights = dailyTrends.map((_, index) => Math.pow(0.8, index));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const weightedSum = dailyTrends.reduce(
    (sum, day, index) => sum + day.kwh * weights[index],
    0
  );

  return weightedSum / totalWeight;
};

// ─── Monthly Usage Prediction ──────────────────────────────────────────────────

/**
 * Predicts total expected energy usage for the current month.
 *
 * Algorithm combines seasonal baselines with current month trends:
 * 1. Historical monthly averages (60% weight)
 *    - Average of previous 6 months (current - 1 through -6)
 * 2. Current month rolling average (40% weight)
 *    - Projects based on days elapsed and usage rate
 *
 * Weighting rationale: Historical averages capture seasonal patterns
 * (60%), while current trends reflect actual conditions (40%).
 *
 * @param {string} esp_id - ESP32 device identifier
 * @returns {object} { predictedKWh: number, confidence: number }
 */
const predictMonthlyUsage = async (esp_id) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previous6MonthsStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const [historicalMonthlyAvg, currentMonthProgress] = await Promise.all([
      getHistoricalMonthlyAverage(esp_id, previous6MonthsStart, monthStart),
      getCurrentMonthRollingAverage(esp_id, monthStart, now),
    ]);

    if (historicalMonthlyAvg === 0 && currentMonthProgress === 0) {
      return { predictedKWh: 0, confidence: 0 };
    }

    const predictedKWh = historicalMonthlyAvg * 0.6 + currentMonthProgress * 0.4;
    const confidence = Math.min(100, 20 + historicalMonthlyAvg * 3.5);

    return {
      predictedKWh: parseFloat(predictedKWh.toFixed(3)),
      confidence: Math.max(0, Math.min(100, confidence)),
      weights: { historical: 0.6, current: 0.4 },
    };
  } catch (error) {
    console.error(`[Usage Prediction] Error predicting monthly usage for ${esp_id}:`, error.message);
    return { predictedKWh: 0, confidence: 0, error: error.message };
  }
};

/**
 * Calculates average of historical monthly cycles.
 *
 * Analyzes the same months from previous calendar cycles to establish
 * seasonal baselines. Example: June 2024, June 2023, June 2022.
 *
 * @param {string} esp_id - ESP32 device identifier
 * @param {Date} start - Start date for historical period
 * @param {Date} end - End date for historical period (month start)
 * @returns {number} Average monthly kWh from historical period
 */
const getHistoricalMonthlyAverage = async (esp_id, start, end) => {
  const monthlyTrends = await getMonthlyTrendsForPeriod(esp_id, start, end);
  if (monthlyTrends.length === 0) return 0;
  return monthlyTrends.reduce((sum, month) => sum + month.kwh, 0) / monthlyTrends.length;
};

// ─── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Retrieves daily kWh trends for a specific period using MongoDB aggregation.
 *
 * Efficiently calculates daily energy deltas by grouping by calendar date
 * and extracting first and last energy readings within each day.
 *
 * @param {string} esp_id - ESP32 device identifier
 * @param {Date} start - Start of period
 * @param {Date} end - End of period
 * @returns {Array} Array of { kwh: number } objects sorted chronologically
 */
const getDailyTrendsForPeriod = async (esp_id, start, end) => {
  const daily = await Reading.aggregate([
    {
      $match: {
        esp_id,
        timestamp: { $gte: start, $lte: end },
      },
    },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
        },
        firstEnergy: { $first: '$energy' },
        lastEnergy: { $last: '$energy' },
      },
    },
    {
      $project: {
        _id: 0,
        kwh: { $max: [0, { $subtract: ['$lastEnergy', '$firstEnergy'] }] },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return daily.map(d => ({ kwh: parseFloat(d.kwh.toFixed(3)) }));
};

/**
 * Retrieves monthly kWh trends for a specific period using MongoDB aggregation.
 *
 * Calculates monthly energy totals by grouping by year-month, enabling
 * efficient comparison of seasonal patterns across multiple cycles.
 *
 * @param {string} esp_id - ESP32 device identifier
 * @param {Date} start - Start of period
 * @param {Date} end - End of period
 * @returns {Array} Array of { kwh: number } objects sorted chronologically
 */
const getMonthlyTrendsForPeriod = async (esp_id, start, end) => {
  const monthly = await Reading.aggregate([
    {
      $match: {
        esp_id,
        timestamp: { $gte: start, $lt: end },
      },
    },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
        },
        firstEnergy: { $first: '$energy' },
        lastEnergy: { $last: '$energy' },
      },
    },
    {
      $project: {
        _id: 0,
        kwh: { $max: [0, { $subtract: ['$lastEnergy', '$firstEnergy'] }] },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return monthly.map(m => ({ kwh: parseFloat(m.kwh.toFixed(3)) }));
};

/**
 * Gets current day's accumulated usage progress and extrapolates to full day.
 *
 * Calculates energy delta for today so far, then projects total for the day
 * based on elapsed time and consistent usage pattern. Handles edge cases
 * like partial day data or complete day readings.
 *
 * @param {string} esp_id - ESP32 device identifier
 * @param {Date} dayStart - Start of today (midnight)
 * @param {Date} now - Current timestamp
 * @returns {number} Projected daily total kWh
 */
const getCurrentDayUsageProgress = async (esp_id, dayStart, now) => {
  const startTime = new Date(dayStart);
  const endTime = new Date(now);

  const [first, last] = await Promise.all([
    Reading.findOne({
      esp_id,
      timestamp: { $gte: startTime, $lte: endTime },
    })
      .sort({ timestamp: 1 })
      .select('energy -_id')
      .lean(),
    Reading.findOne({
      esp_id,
      timestamp: { $gte: startTime, $lte: endTime },
    })
      .sort({ timestamp: -1 })
      .select('energy -_id')
      .lean(),
  ]);

  if (!first || !last) return 0;

  const dayUsage = Math.max(0, last.energy - first.energy);

  const elapsedHours = endTime.getHours() + endTime.getMinutes() / 60;
  const hoursInDay = 24;

  if (elapsedHours >= hoursInDay) {
    return parseFloat(dayUsage.toFixed(3));
  }

  const hourlyRate = dayUsage / elapsedHours;
  const predictedDayTotal = hourlyRate * hoursInDay;

  return parseFloat(predictedDayTotal.toFixed(3));
};

/**
 * Gets current month's rolling average and projects monthly total.
 *
 * Calculates daily average from current month data and scales to full
 * month length. Handles variable month lengths and incomplete data
 * scenarios gracefully.
 *
 * @param {string} esp_id - ESP32 device identifier
 * @param {Date} monthStart - Start of current month
 * @param {Date} now - Current timestamp
 * @returns {number} Projected monthly total kWh
 */
const getCurrentMonthRollingAverage = async (esp_id, monthStart, now) => {
  const startTime = new Date(monthStart);
  const endTime = new Date(now);

  const [first, last] = await Promise.all([
    Reading.findOne({
      esp_id,
      timestamp: { $gte: startTime, $lte: endTime },
    })
      .sort({ timestamp: 1 })
      .select('energy -_id')
      .lean(),
    Reading.findOne({
      esp_id,
      timestamp: { $gte: startTime, $lte: endTime },
    })
      .sort({ timestamp: -1 })
      .select('energy -_id')
      .lean(),
  ]);

  if (!first || !last || first.energy === last.energy) return 0;

  const monthUsage = Math.max(0, last.energy - first.energy);

  const daysElapsed = Math.min(31, Math.max(1, now.getDate()));

  const dailyAverage = monthUsage / daysElapsed;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const projectedMonthTotal = dailyAverage * daysInMonth;

  return parseFloat(projectedMonthTotal.toFixed(3));
};

module.exports = {
  predictDailyUsage,
  predictMonthlyUsage,
};