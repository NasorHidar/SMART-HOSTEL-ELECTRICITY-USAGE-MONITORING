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
    // Password for login authentication
    password: {
      type: String,
      required: [true, 'password is required'],
    },
  },
  {
    timestamps: true, // adds createdAt / updatedAt
  }
);

// Hash password before saving
const bcrypt = require('bcryptjs');

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

