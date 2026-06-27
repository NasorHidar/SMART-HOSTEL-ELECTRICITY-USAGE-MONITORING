/**
 * services/geminiService.js
 *
 * AI Anomaly Detection — runs every 5 minutes via node-cron.
 *
 * For each active ESP device:
 *   1. Fetch power readings from the last 5 minutes
 *   2. Send them to Gemini Flash with a structured prompt
 *   3. If Gemini replies YES → create an Alert document
 */

const cron    = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Reading = require('../models/Reading');
const Alert   = require('../models/Alert');
const User    = require('../models/User');

// Initialise the Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * Analyse a power data array for a single ESP device.
 * @param {string}   esp_id
 * @param {number[]} powerArray  — array of power values (W) over last 5 min
 * @param {number}   avgPower
 */
const analyseWithGemini = async (esp_id, powerArray, avgPower) => {
  const prompt = `
You are an energy anomaly detector for a student hostel.
Analyze this power data array (in Watts) recorded over the last 5 minutes from device ${esp_id}:
${JSON.stringify(powerArray)}

The average power over this window is ${avgPower.toFixed(1)} W.

Rules for anomaly detection:
- A sustained load above 800W likely indicates a prohibited high-wattage appliance (electric kettle, rice cooker, hair dryer, space heater).
- Sudden spikes above 1500W are critical anomalies.
- Normal loads for a hostel room: phone charger (5-20W), laptop (30-80W), fan (40-80W), LED lights (5-15W).

Is there an anomaly indicating a high-load resistive heater or prohibited appliance?
Reply with EXACTLY this format:
RESULT: YES or NO
REASON: One sentence explaining your finding.
SEVERITY: info, anomaly, or critical
`.trim();

  const result   = await model.generateContent(prompt);
  const response = result.response.text();

  console.log(`[Gemini] ${esp_id} response:\n${response}`);
  return response;
};

/**
 * Parse the structured Gemini response.
 * Returns { detected: bool, reason: string, severity: string }
 */
const parseGeminiResponse = (text) => {
  const resultMatch   = text.match(/RESULT:\s*(YES|NO)/i);
  const reasonMatch   = text.match(/REASON:\s*(.+)/i);
  const severityMatch = text.match(/SEVERITY:\s*(info|anomaly|critical)/i);

  return {
    detected: resultMatch ? resultMatch[1].toUpperCase() === 'YES' : false,
    reason:   reasonMatch ? reasonMatch[1].trim() : text.substring(0, 200),
    severity: severityMatch ? severityMatch[1].toLowerCase() : 'anomaly',
  };
};

/**
 * Main detection job — called by the cron and also exported for manual triggers.
 */
const runAnomalyDetection = async () => {
  console.log('[Gemini] Running anomaly detection scan…');

  try {
    // Find all unique ESP IDs that have reported in the last 10 minutes
    const since10m = new Date(Date.now() - 10 * 60 * 1000);
    const activeDevices = await Reading.distinct('esp_id', {
      timestamp: { $gte: since10m },
    });

    if (activeDevices.length === 0) {
      console.log('[Gemini] No active devices found.');
      return;
    }

    console.log(`[Gemini] Scanning ${activeDevices.length} device(s): ${activeDevices.join(', ')}`);

    const since5m = new Date(Date.now() - 5 * 60 * 1000);

    for (const esp_id of activeDevices) {
      // Fetch last 5 minutes of power readings
      const readings = await Reading.find({
        esp_id,
        timestamp: { $gte: since5m },
      })
        .sort({ timestamp: 1 })
        .select('power -_id')
        .lean();

      if (readings.length < 3) {
        console.log(`[Gemini] ${esp_id}: Not enough data points (${readings.length}), skipping.`);
        continue;
      }

      const powerArray = readings.map((r) => parseFloat(r.power.toFixed(2)));
      const avgPower   = powerArray.reduce((a, b) => a + b, 0) / powerArray.length;

      // Quick pre-filter: skip Gemini call if average is clearly in the normal range
      const threshold = parseFloat(process.env.ANOMALY_POWER_THRESHOLD || '1000');
      if (avgPower < threshold * 0.5) {
        console.log(`[Gemini] ${esp_id}: avgPower=${avgPower.toFixed(1)}W — below threshold, skipping.`);
        continue;
      }

      // Call Gemini
      let aiText;
      try {
        aiText = await analyseWithGemini(esp_id, powerArray, avgPower);
      } catch (geminiError) {
        console.error(`[Gemini] API error for ${esp_id}:`, geminiError.message);
        continue;
      }

      const { detected, reason, severity } = parseGeminiResponse(aiText);

      if (detected) {
        // Prevent duplicate alerts within the last 10 minutes
        const recentAlert = await Alert.findOne({
          esp_id,
          createdAt: { $gte: since10m },
        });

        if (recentAlert) {
          console.log(`[Gemini] ${esp_id}: Anomaly already logged recently, skipping duplicate.`);
          continue;
        }

        const alert = await Alert.create({
          esp_id,
          severity,
          message:     `⚠️ ${reason}`,
          ai_response: aiText,
          avg_power:   parseFloat(avgPower.toFixed(2)),
        });

        console.log(`[Gemini] 🚨 ALERT created for ${esp_id}: ${alert.message}`);

        try {
          const { sendAlert } = require('./socketService');
          sendAlert(esp_id, alert);
        } catch (socketErr) {
          console.error('[Gemini] Failed to send real-time alert via socket:', socketErr.message);
        }
      } else {
        console.log(`[Gemini] ${esp_id}: No anomaly detected (avgPower=${avgPower.toFixed(1)}W).`);
      }
    }
  } catch (error) {
    console.error('[Gemini] Anomaly detection error:', error);
  }
};

/**
 * Start the cron job (every 5 minutes).
 * Call this once during server startup.
 */
const startAnomalyDetectionCron = () => {
  console.log('[Gemini] Anomaly detection cron started (every 5 minutes)');

  // '*/5 * * * *' = every 5 minutes
  cron.schedule('*/5 * * * *', runAnomalyDetection);
};

module.exports = { startAnomalyDetectionCron, runAnomalyDetection };
