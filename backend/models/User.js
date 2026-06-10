/**
 * models/User.js
 * Represents a hostel resident associated with an ESP32 device.
 */

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    esp_id: {
      type: String,
      required: [true, 'esp_id is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    student_name: {
      type: String,
      required: [true, 'student_name is required'],
      trim: true,
    },
    room_number: {
      type: String,
      required: [true, 'room_number is required'],
      trim: true,
    },
    // Optional: daily energy budget in kWh before alerts escalate
    daily_limit_kwh: {
      type: Number,
      default: 5.0,
    },
  },
  {
    timestamps: true, // adds createdAt / updatedAt
  }
);

module.exports = mongoose.model('User', UserSchema);
