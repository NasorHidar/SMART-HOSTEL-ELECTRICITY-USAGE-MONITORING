const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { predictDailyUsage, predictMonthlyUsage } = require('../services/usagePredictionService');

// POST /api/predictions/predict-usage — Protected endpoint for usage prediction
router.post('/predictions/predict-usage', protect, async (req, res) => {
  try {
    const esp_id = req.body.esp_id;
    if (!esp_id) {
      return res.status(400).json({ message: 'Missing required field: esp_id' });
    }

    const predictions = await Promise.all([
      predictDailyUsage(esp_id.trim().toUpperCase()),
      predictMonthlyUsage(esp_id.trim().toUpperCase()),
    ]);

    res.json({
      dailyPrediction: predictions[0],
      monthlyPrediction: predictions[1],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Usage Prediction] Route error:', error);
    res.status(500).json({ message: 'Failed to generate predictions' });
  }
});

module.exports = router;