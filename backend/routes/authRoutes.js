/**
 * routes/authRoutes.js
 */

const express = require('express');
const router  = express.Router();
const { login, register } = require('../controllers/authController');

// POST /api/login    — Student logs in with their esp_id
router.post('/login', login);

// POST /api/register — Admin seeds a new user/device pair
router.post('/register', register);

module.exports = router;
