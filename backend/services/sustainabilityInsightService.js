/**
 * services/sustainabilityInsightService.js
 *
 * Daily cron job (runs at 23:55 every night) that:
 *   1. Fetches carbon data for each active device
 *   2. Sends a structured prompt to Gemini AI
 *   3. Stores the result in SustainabilityInsight collection
 *
 * Also exports `generateInsightForDevice` for manual/test triggers.
 */

const cron    = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Reading              = require('../models/Reading');
const SustainabilityInsight = require('../models/SustainabilityInsight');
const {
  getDailyEmission,
  getMonthlyEmission,
  getDailyTrend,
  getSustainabilityScore,
} = require('./carbonService');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// ─── Generate Insight for a Single Device ─────────────────────────────────────

const generateInsightForDevice = async (esp_id) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    // Prevent duplicate generation for the same day
    const existing = await SustainabilityInsight.findOne({
      esp_id,
      date: { $gte: startOfToday },
    });
    if (existing) {
      console.log(`[Sustainability] ${esp_id}: Insight already exists for today.`);
      return;
    }

    // Fetch data
    const [daily, monthly, trend] = await Promise.all([
      getDailyEmission(esp_id),
      getMonthlyEmission(esp_id),
      getDailyTrend(esp_id, 7),
    ]);

    const { score, label } = getSustainabilityScore(monthly.kwh);

    // Skip if no meaningful data
    if (daily.kwh === 0 && monthly.kwh === 0) {
      console.log(`[Sustainability] ${esp_id}: No data, skipping insight generation.`);
      return;
    }

    const trendSummary = trend
      .slice(-7)
      .map((t) => `${new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' })}: ${t.kwh.toFixed(3)} kWh (${t.co2.toFixed(3)} kg CO₂)`)
      .join('\n');

    const prompt = `
You are a sustainability advisor for a student hostel electricity monitoring system in Bangladesh.

Device: ${esp_id}
Today's energy usage: ${daily.kwh.toFixed(3)} kWh → ${daily.co2.toFixed(3)} kg CO₂
Monthly energy usage: ${monthly.kwh.toFixed(3)} kWh → ${monthly.co2.toFixed(3)} kg CO₂
Current sustainability score: ${score}/100 (${label})
Bangladesh grid emission factor: 0.67 kg CO₂/kWh

Last 7 days usage trend:
${trendSummary || 'No trend data available.'}

Generate ONE specific, actionable sustainability recommendation for this student.
Focus on practical ways to reduce electricity usage and carbon emissions in a hostel room.
Be specific with numbers (e.g., "turning off your fan 2 hours earlier saves X kg CO₂/month").
Keep it concise — 2-3 sentences maximum.
Write in a friendly, encouraging tone.
DO NOT include any headers or bullet points — just a plain paragraph.
    `.trim();

    const result   = await model.generateContent(prompt);
    const insight  = result.response.text().trim();

    await SustainabilityInsight.create({
      esp_id,
      date:               startOfToday,
      insight,
      dailyKWh:           daily.kwh,
      dailyCO2:           daily.co2,
      monthlyKWh:         monthly.kwh,
      monthlyCO2:         monthly.co2,
      sustainabilityScore: score,
    });

    console.log(`[Sustainability] ✅ Insight saved for ${esp_id}: "${insight.substring(0, 80)}..."`);
  } catch (err) {
    console.error(`[Sustainability] Error generating insight for ${esp_id}:`, err.message);
  }
};

// ─── Main Cron Job ────────────────────────────────────────────────────────────

const runSustainabilityInsightCron = async () => {
  console.log('[Sustainability] Running daily insight generation…');
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeDevices = await Reading.distinct('esp_id', {
      timestamp: { $gte: since24h },
    });

    if (activeDevices.length === 0) {
      console.log('[Sustainability] No active devices found.');
      return;
    }

    console.log(`[Sustainability] Generating insights for ${activeDevices.length} device(s)…`);
    for (const esp_id of activeDevices) {
      await generateInsightForDevice(esp_id);
    }
  } catch (err) {
    console.error('[Sustainability] Cron error:', err);
  }
};

/**
 * Start the daily sustainability insight cron (every day at 23:55).
 */
const startSustainabilityInsightCron = () => {
  console.log('[Sustainability] Daily insight cron started (runs at 23:55 daily)');
  cron.schedule('55 23 * * *', runSustainabilityInsightCron);
};

module.exports = { startSustainabilityInsightCron, generateInsightForDevice };
