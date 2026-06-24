/**
 * controllers/authController.js
 *
 * POST /api/login
 * Simple login: user provides only their esp_id.
 * If a User document with that esp_id exists, a JWT is issued.
 * No password required.
 */

const jwt      = require('jsonwebtoken');
const mongoose = require('mongoose');
const User     = require('../models/User');

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
  const { esp_id, password } = req.body;
  console.log(`[Auth] Login request received for esp_id: "${esp_id}"`);

  // 1. Check MongoDB connection state
  if (mongoose.connection.readyState !== 1) {
    console.error('[Auth] Login failed: Database connection is offline');
    return res.status(503).json({
      message: 'Database connection error: The database server is currently offline or unreachable. Please try again later.'
    });
  }

  try {
    if (!esp_id || !password) {
      console.warn('[Auth] Login failed: esp_id or password is missing in request body');
      return res.status(400).json({ message: 'esp_id and password are required' });
    }

    const cleanEspId = esp_id.trim().toUpperCase();
    console.log(`[Auth] Querying user with sanitised esp_id: "${cleanEspId}"`);

    // 2. Find user by ESP ID (case-insensitive)
    const user = await User.findOne({ esp_id: cleanEspId });

    if (!user) {
      console.warn(`[Auth] Login failed: No user found with esp_id: "${cleanEspId}"`);
      return res.status(404).json({
        message: `No account found for device ID "${esp_id}". Contact your hostel admin.`,
      });
    }

    // 3. Verify Password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.warn(`[Auth] Login failed: Incorrect password for esp_id: "${cleanEspId}"`);
      return res.status(401).json({ message: 'Invalid device ID or password' });
    }

    console.log(`[Auth] User found: ${user.student_name} (Room ${user.room_number})`);

    // 4. Generate Token
    const token = signToken(user._id);
    console.log(`[Auth] JWT token generated successfully for user: ${user._id}`);


    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        esp_id:          user.esp_id,
        student_name:    user.student_name,
        room_number:     user.room_number,
        daily_limit_kwh: user.daily_limit_kwh,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ message: `Server error during login: ${error.message}` });
  }
};

/**
 * POST /api/register  (Admin use — seed initial users)
 * Body: { "esp_id": "ESP-2049", "student_name": "Alice", "room_number": "101" }
 */
const register = async (req, res) => {
  const { esp_id, student_name, room_number, daily_limit_kwh, password } = req.body;
  console.log(`[Auth] Register request received for esp_id: "${esp_id}"`);

  // Check MongoDB connection state
  if (mongoose.connection.readyState !== 1) {
    console.error('[Auth] Registration failed: Database is offline');
    return res.status(503).json({
      message: 'Database connection error: The database server is currently offline or unreachable.'
    });
  }

  try {
    if (!esp_id || !student_name || !room_number) {
      console.warn('[Auth] Registration failed: Missing required fields');
      return res.status(400).json({ message: 'esp_id, student_name, and room_number are required' });
    }

    const cleanEspId = esp_id.trim().toUpperCase();
    const existing = await User.findOne({ esp_id: cleanEspId });
    if (existing) {
      console.warn(`[Auth] Registration failed: Device "${cleanEspId}" already registered`);
      return res.status(409).json({ message: `Device "${esp_id}" is already registered` });
    }

    const user = await User.create({
      esp_id:          cleanEspId,
      student_name:    student_name.trim(),
      room_number:     room_number.trim(),
      password:        password || cleanEspId, // Default password is the ESP ID
      daily_limit_kwh: daily_limit_kwh || 5.0,
    });

    console.log(`[Auth] Registered new user: "${user.student_name}" with device "${user.esp_id}"`);
    const token = signToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        esp_id:          user.esp_id,
        student_name:    user.student_name,
        room_number:     user.room_number,
        daily_limit_kwh: user.daily_limit_kwh,
      },
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ message: `Server error during registration: ${error.message}` });
  }
};

/**
 * GET /api/dev/users
 * Dev utility to list and auto-seed users in development mode.
 */
const getDevUsers = async (req, res) => {
  console.log('[Dev] GET /api/dev/users utility called');

  if (process.env.NODE_ENV !== 'development') {
    console.warn('[Dev] Attempted dev utility access outside development mode');
    return res.status(403).json({ message: 'Dev utilities only available in development mode' });
  }

  if (mongoose.connection.readyState !== 1) {
    console.error('[Dev] Database connection is offline');
    return res.status(503).json({
      message: 'Database connection error: The database server is currently offline or unreachable.'
    });
  }

  try {
    let users = await User.find({});
    console.log(`[Dev] Current registered users count: ${users.length}`);

    if (users.length === 0) {
      console.log('[Dev] No users exist. Auto-seeding default resident: Alice Rahman (ESP-2049)...');
      const seedUser = await User.create({
        esp_id:          'ESP-2049',
        student_name:    'Alice Rahman',
        room_number:     '101',
        password:        'ESP-2049',
        daily_limit_kwh: 5,
      });
      users = [seedUser];
      console.log('[Dev] Auto-seeding complete.');
    }

    res.status(200).json(users);
  } catch (error) {
    console.error('[Dev] Dev utility users error:', error);
    res.status(500).json({ message: `Server error in dev utility: ${error.message}` });
  }
};

module.exports = { login, register, getDevUsers };
