/**
 * models/Alert.js
 * Stores AI-generated anomaly alerts for a specific ESP32 device.
 */

const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema(
  {
    esp_id: {
      type: String,
      required: true,
      index: true,
    },
    // 'anomaly' | 'info' | 'critical'
    severity: {
      type: String,
      enum: ['info', 'anomaly', 'critical'],
      default: 'anomaly',
    },
    message: {
      type: String,
      required: true,
    },
    // The Gemini AI response that triggered this alert
    ai_response: {
      type: String,
    },
    // Average power (W) over the analysed window
    avg_power: {
      type: Number,
    },
    // Whether the hostel admin has acknowledged this alert
    acknowledged: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt = alert detection time
  }
);

AlertSchema.index({ esp_id: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', AlertSchema);
