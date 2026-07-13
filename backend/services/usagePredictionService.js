/**
 * services/usagePredictionService.js
 *
 * Energy Usage Prediction Engine for Smart Hostel Monitoring System.
 *
 * ─── Data Model Context ────────────────────────────────────────────────────────
 * The Reading collection stores cumulative energy (kWh) like an odometer —
 * the meter never resets unless the ESP32 reboots. To compute consumption for
 * any window, we always calculate a DELTA:
 *
 *   kWh_consumed = reading_at_end_of_window.energy
 *                - reading_at_start_of_window.energy
 *
 * ─── Algorithm Summary ────────────────────────────────────────────────────────
 *
 * DAILY PREDICTION  (predictDailyUsage)
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Component A — Exponentially-Weighted 7-Day Historical Average (70%)    │
 * │    Gives recent days more influence via decay factor r = 0.85:           │
 * │    yesterday=1.0, 2d ago=0.85, 3d ago=0.72, …, 7d ago=0.32              │
 * │                                                                          │
 * │  Component B — Current-Day Live Extrapolation (30%)                     │
 * │    Records today's kWh so far, divides by elapsed fractional hours,      │
 * │    multiplies by 24 to project full-day total.                           │
 * │    Capped at 3× the historical average to suppress outlier spikes.       │
 * │                                                                          │
 * │  Blend = 0.70 × A  +  0.30 × B                                          │
 * │                                                                          │
 * │  Rationale: 70/30 leans on stable historical behaviour while letting     │
 * │  today's live reading adjust for unusual activity (e.g., appliance left  │
 * │  on). The cap prevents a 5-minute spike from inflating the daily total.  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * MONTHLY PREDICTION  (predictMonthlyUsage)
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Component A — Prior Months Weighted Average (60%)                       │
 * │    Averages up to 6 full calendar months before the current one.         │
 * │    Uses linear decay (month_n weight = 1 / n) so the most recent         │
 * │    prior month contributes the most.                                     │
 * │                                                                          │
 * │  Component B — Current-Month Rolling Projection (40%)                   │
 * │    Actual kWh consumed since the 1st of this month, divided by           │
 * │    completed hours elapsed, extrapolated to the end of the month.        │
 * │    Uses hours (not days) for precision early in the month.               │
 * │                                                                          │
 * │  Blend = 0.60 × A  +  0.40 × B                                          │
 * │                                                                          │
 * │  Rationale: 60/40 gives historical months the majority say to handle     │
 * │  the first few days of a month when live data is thin, while current-    │
 * │  month data takes increasing influence as the month progresses.          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * CONFIDENCE SCORE
 *   0–100 integer. Driven by: number of historical days/months available,
 *   hours elapsed today, and whether live data is present. A device with
 *   7 full days of data and 12+ hours today scores ~85–95.
 */

'use strict';

const Reading = require('../models/Reading');
const User    = require('../models/User');

// ─── Constants ────────────────────────────────────────────────────────────────

// Exponential decay factor for daily historical weighting.
// 0.85 → yesterday counts 100%, 7 days ago counts ~32%.
const DAILY_DECAY = 0.85;

// Max historical days to analyse for the daily prediction.
const DAILY_HISTORY_DAYS = 7;

// Max historical months to analyse for the monthly prediction.
const MONTHLY_HISTORY_MONTHS = 6;

// Safety cap: today's live extrapolation is capped at this multiple of the
// historical average to prevent a short spike from exploding the forecast.
const LIVE_EXTRAPOLATION_CAP_MULTIPLIER = 3;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Predict total energy usage for the current day.
 *
 * @param {string} esp_id - ESP32 device identifier (uppercase)
 * @returns {Promise<{
 *   predictedKWh: number,
 *   confidence:   number,
 *   breakdown: {
 *     historicalAvgKWh: number,
 *     liveExtrapolatedKWh: number,
 *     historicalDaysUsed: number,
 *     elapsedHours: number,
 *     kwhSoFar: number,
 *   },
 *   weights: { historical: number, live: number },
 *   dailyLimitKWh: number | null,
 * }>}
 */
const predictDailyUsage = async (esp_id) => {
  try {
    const now        = new Date();
    const todayStart = _startOfDay(now);

    // Run both DB queries in parallel — single round-trip to Mongo.
    const [historicalDays, liveResult, user] = await Promise.all([
      _getHistoricalDailyData(esp_id, DAILY_HISTORY_DAYS),
      _getLiveDayProgress(esp_id, todayStart, now),
      User.findOne({ esp_id }).select('daily_limit_kwh').lean(),
    ]);

    const { kwhSoFar, elapsedHours } = liveResult;
    const historicalDaysUsed = historicalDays.length;

    // ── Component A: Exponentially-weighted historical average ─────────────
    // Weight assignment: yesterdayIndex=0 → weight 1.0
    //                    index=1           → weight 0.85
    //                    index=n           → weight 0.85^n
    // Array comes back newest-first from the aggregation (sorted desc).
    const historicalAvgKWh = _exponentialWeightedAverage(
      historicalDays.map(d => d.kwh),
      DAILY_DECAY
    );

    // ── Component B: Live extrapolation ────────────────────────────────────
    // Guard: need at least 30 minutes of data for a meaningful rate.
    let liveExtrapolatedKWh = 0;
    if (elapsedHours >= 0.5 && kwhSoFar > 0) {
      const hourlyRate = kwhSoFar / elapsedHours;
      const rawProjection = hourlyRate * 24;

      // Cap at 3× historical avg to suppress anomalous spikes.
      // If no historical data exists, cap at a reasonable hostel maximum (10 kWh/day).
      const cap = historicalAvgKWh > 0
        ? historicalAvgKWh * LIVE_EXTRAPOLATION_CAP_MULTIPLIER
        : 10;

      liveExtrapolatedKWh = Math.min(rawProjection, cap);
    }

    // ── No data at all ─────────────────────────────────────────────────────
    if (historicalAvgKWh === 0 && liveExtrapolatedKWh === 0) {
      return _emptyResult('day');
    }

    // ── Blend A + B ────────────────────────────────────────────────────────
    // If we have no historical data (new device), fall back to live only.
    // If we have no live data (midnight query), fall back to historical only.
    let predictedKWh;
    let weights;

    if (historicalDaysUsed === 0) {
      // New device: 100% live
      predictedKWh = liveExtrapolatedKWh;
      weights = { historical: 0, live: 1.0 };
    } else if (kwhSoFar === 0 || elapsedHours < 0.5) {
      // No live data yet today (e.g. queried right at midnight): 100% historical
      predictedKWh = historicalAvgKWh;
      weights = { historical: 1.0, live: 0 };
    } else {
      // Standard blend: 70% historical + 30% live
      predictedKWh = historicalAvgKWh * 0.70 + liveExtrapolatedKWh * 0.30;
      weights = { historical: 0.70, live: 0.30 };
    }

    predictedKWh = Math.max(0, predictedKWh);

    // ── Confidence score ───────────────────────────────────────────────────
    // Starts at 0. Grows with:
    //   • Number of historical days available (max 50 pts, 7+ days = full)
    //   • Hours elapsed today (max 30 pts, 12h = full)
    //   • Live data present (+20 pts)
    const historyPoints = Math.min(50, (historicalDaysUsed / DAILY_HISTORY_DAYS) * 50);
    const livePoints    = Math.min(30, (elapsedHours / 12) * 30);
    const liveBonus     = kwhSoFar > 0 ? 20 : 0;
    const confidence    = Math.round(Math.min(100, historyPoints + livePoints + liveBonus));

    return {
      predictedKWh:   parseFloat(predictedKWh.toFixed(3)),
      confidence,
      breakdown: {
        historicalAvgKWh:     parseFloat(historicalAvgKWh.toFixed(3)),
        liveExtrapolatedKWh:  parseFloat(liveExtrapolatedKWh.toFixed(3)),
        historicalDaysUsed,
        elapsedHours:         parseFloat(elapsedHours.toFixed(2)),
        kwhSoFar:             parseFloat(kwhSoFar.toFixed(3)),
      },
      weights,
      dailyLimitKWh: user?.daily_limit_kwh ?? null,
    };

  } catch (err) {
    console.error(`[Prediction] predictDailyUsage error for ${esp_id}:`, err.message);
    return _emptyResult('day');
  }
};

/**
 * Predict total energy usage for the current calendar month.
 *
 * @param {string} esp_id - ESP32 device identifier (uppercase)
 * @returns {Promise<{
 *   predictedKWh: number,
 *   confidence:   number,
 *   breakdown: {
 *     historicalAvgKWh: number,
 *     currentMonthProjectedKWh: number,
 *     historicalMonthsUsed: number,
 *     daysElapsed: number,
 *     daysInMonth: number,
 *     kwhThisMonth: number,
 *   },
 *   weights: { historical: number, current: number },
 * }>}
 */
const predictMonthlyUsage = async (esp_id) => {
  try {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start of the window for historical months: 6 months before this month.
    const historyStart = new Date(now.getFullYear(), now.getMonth() - MONTHLY_HISTORY_MONTHS, 1);

    // Run DB queries in parallel.
    const [historicalMonths, currentMonthResult] = await Promise.all([
      _getHistoricalMonthlyData(esp_id, historyStart, monthStart),
      _getCurrentMonthProgress(esp_id, monthStart, now),
    ]);

    const historicalMonthsUsed = historicalMonths.length;
    const { kwhThisMonth, hoursElapsed } = currentMonthResult;

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsed = Math.max(1, now.getDate() - 1 + (now.getHours() / 24));

    // ── Component A: Prior months linearly-weighted average ────────────────
    // Weights: month[0] (most recent prior month) = 1/1 = 1.0
    //          month[1] (2 months ago)             = 1/2 = 0.5
    //          month[n]                            = 1/(n+1)
    // Linear decay (not exponential) because monthly patterns drift more
    // slowly than daily patterns — we want all prior months to count.
    const historicalAvgKWh = _linearWeightedAverage(
      historicalMonths.map(m => m.kwh)   // already sorted newest-first
    );

    // ── Component B: Current month extrapolation ────────────────────────────
    // Uses hours elapsed for precision in the first few days.
    // hoursElapsed = hours since midnight of the 1st.
    let currentMonthProjectedKWh = 0;
    if (hoursElapsed >= 1 && kwhThisMonth > 0) {
      const totalHoursInMonth = daysInMonth * 24;
      const hourlyRate = kwhThisMonth / hoursElapsed;
      currentMonthProjectedKWh = hourlyRate * totalHoursInMonth;

      // Cap at 3× historical monthly avg to suppress outliers.
      if (historicalAvgKWh > 0) {
        currentMonthProjectedKWh = Math.min(
          currentMonthProjectedKWh,
          historicalAvgKWh * LIVE_EXTRAPOLATION_CAP_MULTIPLIER
        );
      }
    }

    // ── No data at all ─────────────────────────────────────────────────────
    if (historicalAvgKWh === 0 && currentMonthProjectedKWh === 0) {
      return _emptyResult('month');
    }

    // ── Blend A + B ────────────────────────────────────────────────────────
    let predictedKWh;
    let weights;

    // Dynamically shift weight toward current-month data as the month
    // progresses. At day 1: 85/15. At day 15: 50/50. At day 28+: 30/70.
    // Formula: currentWeight = clamp(daysElapsed / daysInMonth, 0.15, 0.70)
    const progressRatio = Math.min(0.70, Math.max(0.15, daysElapsed / daysInMonth));

    if (historicalMonthsUsed === 0) {
      // New device, no prior months: 100% current month projection
      predictedKWh = currentMonthProjectedKWh;
      weights = { historical: 0, current: 1.0 };
    } else if (kwhThisMonth === 0 || hoursElapsed < 1) {
      // No current month data: 100% historical
      predictedKWh = historicalAvgKWh;
      weights = { historical: 1.0, current: 0 };
    } else {
      // Standard blend with dynamic weights
      const histWeight = parseFloat((1 - progressRatio).toFixed(2));
      const currWeight = parseFloat(progressRatio.toFixed(2));
      predictedKWh = historicalAvgKWh * histWeight + currentMonthProjectedKWh * currWeight;
      weights = { historical: histWeight, current: currWeight };
    }

    predictedKWh = Math.max(0, predictedKWh);

    // ── Confidence score ────────────────────────────────────────────────────
    // • Historical months available (max 50 pts)
    // • Days elapsed in current month (max 30 pts, ≥15d = full)
    // • Current month data present (+20 pts)
    const historyPoints   = Math.min(50, (historicalMonthsUsed / MONTHLY_HISTORY_MONTHS) * 50);
    const progressPoints  = Math.min(30, (daysElapsed / 15) * 30);
    const currentBonus    = kwhThisMonth > 0 ? 20 : 0;
    const confidence      = Math.round(Math.min(100, historyPoints + progressPoints + currentBonus));

    return {
      predictedKWh: parseFloat(predictedKWh.toFixed(3)),
      confidence,
      breakdown: {
        historicalAvgKWh:           parseFloat(historicalAvgKWh.toFixed(3)),
        currentMonthProjectedKWh:   parseFloat(currentMonthProjectedKWh.toFixed(3)),
        historicalMonthsUsed,
        daysElapsed:                parseFloat(daysElapsed.toFixed(1)),
        daysInMonth,
        kwhThisMonth:               parseFloat(kwhThisMonth.toFixed(3)),
      },
      weights,
    };

  } catch (err) {
    console.error(`[Prediction] predictMonthlyUsage error for ${esp_id}:`, err.message);
    return _emptyResult('month');
  }
};

// ─── Private DB Helpers ───────────────────────────────────────────────────────

/**
 * Single aggregation pipeline: returns daily kWh for the past N complete days,
 * sorted newest-first (yesterday = index 0).
 *
 * Pipeline design:
 *   1. $match — filter by esp_id and timestamp window (avoids full collection scan)
 *   2. $sort  — ensures $first/$last within each $group are chronologically correct
 *              (MongoDB time-series collections do NOT guarantee insert order)
 *   3. $group — bucket by calendar day; grab first and last cumulative energy
 *   4. $project — compute kWh delta = max(0, lastEnergy − firstEnergy)
 *                 also emit a sortable `date` field
 *   5. $sort  — chronological desc so caller gets newest-first array
 *
 * @param {string} esp_id
 * @param {number} days - Number of complete past days to fetch
 * @returns {Promise<Array<{ date: Date, kwh: number }>>}
 */
const _getHistoricalDailyData = async (esp_id, days) => {
  const now   = new Date();
  const start = _startOfDay(new Date(now));
  start.setDate(start.getDate() - days); // midnight N days ago

  // End = start of today (excludes today — only complete days)
  const end = _startOfDay(now);

  const results = await Reading.aggregate([
    {
      $match: {
        esp_id,
        timestamp: { $gte: start, $lt: end },
      },
    },
    // Sort is required before $group so $first/$last are chronological.
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: {
          year:  { $year:         '$timestamp' },
          month: { $month:        '$timestamp' },
          day:   { $dayOfMonth:   '$timestamp' },
        },
        // Cumulative energy at the very start and end of this calendar day.
        firstEnergy: { $first: '$energy' },
        lastEnergy:  { $last:  '$energy' },
        // Keep a sortable date representative for this bucket.
        date: { $min: '$timestamp' },
      },
    },
    {
      $project: {
        _id: 0,
        date: 1,
        // Delta: energy consumed during this day (never negative).
        kwh: { $max: [0, { $subtract: ['$lastEnergy', '$firstEnergy'] }] },
      },
    },
    // Newest-first so the weighting loop treats index 0 as yesterday.
    { $sort: { date: -1 } },
  ]);

  return results.map(r => ({
    date: r.date,
    kwh:  parseFloat(r.kwh.toFixed(4)),
  }));
};

/**
 * Single aggregation pipeline: returns monthly kWh for up to N complete
 * calendar months before the current one, sorted newest-first.
 *
 * Same pipeline structure as the daily version but groups by year-month.
 *
 * @param {string} esp_id
 * @param {Date}   start - Beginning of historical window (e.g. 6 months ago)
 * @param {Date}   end   - End of historical window (start of current month)
 * @returns {Promise<Array<{ date: Date, kwh: number }>>}
 */
const _getHistoricalMonthlyData = async (esp_id, start, end) => {
  const results = await Reading.aggregate([
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
          year:  { $year:   '$timestamp' },
          month: { $month:  '$timestamp' },
        },
        firstEnergy: { $first: '$energy' },
        lastEnergy:  { $last:  '$energy' },
        date: { $min: '$timestamp' },
      },
    },
    {
      $project: {
        _id: 0,
        date: 1,
        kwh: { $max: [0, { $subtract: ['$lastEnergy', '$firstEnergy'] }] },
      },
    },
    // Newest prior month = index 0 for the weighting loop.
    { $sort: { date: -1 } },
  ]);

  return results.map(r => ({
    date: r.date,
    kwh:  parseFloat(r.kwh.toFixed(4)),
  }));
};

/**
 * Fetch today's live usage progress using a single aggregation.
 * Returns the kWh consumed since midnight and how many hours have elapsed.
 *
 * Using aggregation (not two findOne calls) avoids a second round-trip.
 *
 * @param {string} esp_id
 * @param {Date}   dayStart - Midnight today
 * @param {Date}   now
 * @returns {Promise<{ kwhSoFar: number, elapsedHours: number }>}
 */
const _getLiveDayProgress = async (esp_id, dayStart, now) => {
  const results = await Reading.aggregate([
    {
      $match: {
        esp_id,
        timestamp: { $gte: dayStart, $lte: now },
      },
    },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id:         null,
        firstEnergy: { $first: '$energy' },
        lastEnergy:  { $last:  '$energy' },
      },
    },
    {
      $project: {
        _id: 0,
        kwhSoFar: { $max: [0, { $subtract: ['$lastEnergy', '$firstEnergy'] }] },
      },
    },
  ]);

  if (!results.length) {
    return { kwhSoFar: 0, elapsedHours: _elapsedHoursToday(now) };
  }

  return {
    kwhSoFar:     parseFloat((results[0].kwhSoFar ?? 0).toFixed(4)),
    elapsedHours: _elapsedHoursToday(now),
  };
};

/**
 * Fetch current month's accumulated kWh and hours elapsed using aggregation.
 *
 * @param {string} esp_id
 * @param {Date}   monthStart - Midnight on the 1st of this month
 * @param {Date}   now
 * @returns {Promise<{ kwhThisMonth: number, hoursElapsed: number }>}
 */
const _getCurrentMonthProgress = async (esp_id, monthStart, now) => {
  const results = await Reading.aggregate([
    {
      $match: {
        esp_id,
        timestamp: { $gte: monthStart, $lte: now },
      },
    },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id:         null,
        firstEnergy: { $first: '$energy' },
        lastEnergy:  { $last:  '$energy' },
      },
    },
    {
      $project: {
        _id: 0,
        kwhThisMonth: { $max: [0, { $subtract: ['$lastEnergy', '$firstEnergy'] }] },
      },
    },
  ]);

  if (!results.length) {
    return { kwhThisMonth: 0, hoursElapsed: _elapsedHoursSinceMonthStart(now) };
  }

  return {
    kwhThisMonth: parseFloat((results[0].kwhThisMonth ?? 0).toFixed(4)),
    hoursElapsed: _elapsedHoursSinceMonthStart(now),
  };
};

// ─── Private Maths Helpers ────────────────────────────────────────────────────

/**
 * Exponentially-weighted average.
 * values[0] = most recent item (highest weight).
 * weight_i = decay^i, so: w0=1.0, w1=decay, w2=decay², …
 *
 * @param {number[]} values - Array, newest item first
 * @param {number}   decay  - Decay factor (0 < decay < 1)
 * @returns {number}
 */
const _exponentialWeightedAverage = (values, decay) => {
  if (!values.length) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  values.forEach((v, i) => {
    const w = Math.pow(decay, i);
    weightedSum += v * w;
    totalWeight += w;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
};

/**
 * Linearly-weighted average.
 * values[0] = most recent item.
 * weight_i = 1 / (i + 1), so: w0=1.0, w1=0.5, w2=0.33, …
 *
 * @param {number[]} values - Array, newest item first
 * @returns {number}
 */
const _linearWeightedAverage = (values) => {
  if (!values.length) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  values.forEach((v, i) => {
    const w = 1 / (i + 1);
    weightedSum += v * w;
    totalWeight += w;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
};

// ─── Private Date Helpers ─────────────────────────────────────────────────────

/** Returns a new Date set to midnight (00:00:00.000) of the given date. */
const _startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Fractional hours elapsed since midnight of the given date.
 * Used to calculate the live hourly rate.
 */
const _elapsedHoursToday = (now) => {
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
};

/**
 * Fractional hours elapsed since the start of the current calendar month.
 */
const _elapsedHoursSinceMonthStart = (now) => {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return (now - monthStart) / (1000 * 60 * 60); // ms → hours
};

// ─── Private Result Helpers ───────────────────────────────────────────────────

/**
 * Returns a zero-value result when no data is available.
 * @param {'day' | 'month'} period
 */
const _emptyResult = (period) => {
  const base = { predictedKWh: 0, confidence: 0 };
  if (period === 'day') {
    return {
      ...base,
      breakdown: {
        historicalAvgKWh: 0,
        liveExtrapolatedKWh: 0,
        historicalDaysUsed: 0,
        elapsedHours: 0,
        kwhSoFar: 0,
      },
      weights: { historical: 0, live: 0 },
      dailyLimitKWh: null,
    };
  }
  return {
    ...base,
    breakdown: {
      historicalAvgKWh: 0,
      currentMonthProjectedKWh: 0,
      historicalMonthsUsed: 0,
      daysElapsed: 0,
      daysInMonth: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
      kwhThisMonth: 0,
    },
    weights: { historical: 0, current: 0 },
  };
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  predictDailyUsage,
  predictMonthlyUsage,
};