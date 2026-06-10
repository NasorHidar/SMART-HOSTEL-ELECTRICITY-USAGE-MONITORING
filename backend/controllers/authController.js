/**
 * controllers/authController.js
 *
 * POST /api/login
 * Simple login: user provides only their esp_id.
 * If a User document with that esp_id exists, a JWT is issued.
 * No password required (as specified).
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate a signed JWT for a given MongoDB user _id.
 */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * POST /api/login
 * Body: { "esp_id": "ESP-2049" }
 * Returns: { token, user: { esp_id, student_name, room_number } }
 */
const login = async (req, res) => {
  try {
    const { esp_id } = req.body;

    if (!esp_id) {
      return res.status(400).json({ message: 'esp_id is required' });
    }

    // Find user by ESP ID (case-insensitive)
    const user = await User.findOne({ esp_id: esp_id.trim().toUpperCase() });

    if (!user) {
      return res.status(404).json({
        message: `No account found for device ID "${esp_id}". Contact your hostel admin.`,
      });
    }

    const token = signToken(user._id);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        esp_id:       user.esp_id,
        student_name: user.student_name,
        room_number:  user.room_number,
        daily_limit_kwh: user.daily_limit_kwh,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

/**
 * POST /api/register  (Admin use — seed initial users)
 * Body: { "esp_id": "ESP-2049", "student_name": "Alice", "room_number": "101" }
 */
const register = async (req, res) => {
  try {
    const { esp_id, student_name, room_number, daily_limit_kwh } = req.body;

    if (!esp_id || !student_name || !room_number) {
      return res.status(400).json({ message: 'esp_id, student_name, and room_number are required' });
    }

    const existing = await User.findOne({ esp_id: esp_id.trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({ message: `Device "${esp_id}" is already registered` });
    }

    const user = await User.create({
      esp_id: esp_id.trim().toUpperCase(),
      student_name: student_name.trim(),
      room_number: room_number.trim(),
      daily_limit_kwh: daily_limit_kwh || 5.0,
    });

    const token = signToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        esp_id:       user.esp_id,
        student_name: user.student_name,
        room_number:  user.room_number,
        daily_limit_kwh: user.daily_limit_kwh,
      },
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

module.exports = { login, register };
