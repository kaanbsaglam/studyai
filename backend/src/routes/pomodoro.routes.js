/**
 * Pomodoro Timer Routes
 *
 * Routes for pomodoro timer settings.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const pomodoroController = require('../controllers/pomodoro.controller');

// All routes require authentication
router.use(authenticate);

// Settings endpoints
router.get('/pomodoro/settings', pomodoroController.getSettings);
router.patch('/pomodoro/settings', pomodoroController.updateSettings);

module.exports = router;
