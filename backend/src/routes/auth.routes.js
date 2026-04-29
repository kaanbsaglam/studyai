/**
 * Auth Routes
 *
 * POST /api/v1/auth/register         - Register new user
 * POST /api/v1/auth/login            - Login user
 * GET  /api/v1/auth/me               - Get current user (requires auth)
 * POST /api/v1/auth/forgot-password  - Request a password reset email
 * POST /api/v1/auth/reset-password   - Reset password using emailed token
 * POST /api/v1/auth/change-password  - Change password (requires auth)
 * POST /api/v1/auth/google           - Login or register via Google ID token
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  googleAuth,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Stricter limiters for sensitive endpoints (mitigate enumeration / brute force)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests. Please try again later.',
    },
  },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts. Please try again later.',
    },
  },
});

const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);
router.post('/google', googleAuthLimiter, googleAuth);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
