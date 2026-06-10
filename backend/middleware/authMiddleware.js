/**
 * middleware/authMiddleware.js
 * Verifies the JWT sent in the Authorization header.
 * Usage: router.get('/protected', protect, handler)
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorised — no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the full user document to the request (minus sensitive fields)
    req.user = await User.findById(decoded.id).select('-__v');

    if (!req.user) {
      return res.status(401).json({ message: 'User associated with this token no longer exists' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorised — invalid token' });
  }
};

module.exports = { protect };
