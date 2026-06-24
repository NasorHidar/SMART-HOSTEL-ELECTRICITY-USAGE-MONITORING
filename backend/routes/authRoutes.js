/**
 * routes/authRoutes.js
 */

const express = require('express');
const router  = express.Router();
const { login, register, getDevUsers } = require('../controllers/authController');

// POST /api/login    — Student logs in with their esp_id
router.post('/login', login);

// POST /api/register — Admin seeds a new user/device pair
router.post('/register', register);

// GET /api/dev/users  — Dev utility to list and auto-seed users
router.get('/dev/users', getDevUsers);

module.exports = router;
