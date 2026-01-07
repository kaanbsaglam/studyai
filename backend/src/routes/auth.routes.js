/**
 * Auth Routes
 *
 * POST /api/v1/auth/register - Register new user
 * POST /api/v1/auth/login    - Login user
 * GET  /api/v1/auth/me       - Get current user (requires auth)
 */

const express = require('express');
const { register, login, getMe } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getMe);

module.exports = router;
