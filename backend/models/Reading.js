/**
 * models/Reading.js
 * Stores individual sensor readings from ESP32 devices.
 *
 * MongoDB Time Series collection is declared via `timeseries` option.
 * This provides significant query/storage efficiency for time-ordered data.
 * NOTE: Time-series collections require MongoDB 5.0+. If you're on an older
 *       version, remove the `timeseries` option — the schema still works as
 *       a regular indexed collection.
 */

const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema(
  {
    // The "metaField" for the time-series collection
    esp_id: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    voltage: {
      type: Number,
      required: true,
    },
    current: {
      type: Number,
      required: true,
    },
    power: {
      type: Number,
      required: true,
    },
    // Cumulative energy since the device last reset (kWh)
    energy: {
      type: Number,
      required: true,
    },
  },
  {
    // No Mongoose-level timestamps (we manage `timestamp` ourselves)
    timestamps: false,
  }
);

// Compound index: fast lookups for "all readings for device X in time range Y"
ReadingSchema.index({ esp_id: 1, timestamp: -1 });

module.exports = mongoose.model('Reading', ReadingSchema);
