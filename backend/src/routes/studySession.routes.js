/**
 * Study Session Routes
 *
 * Routes for study time tracking and statistics.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const studySessionController = require('../controllers/studySession.controller');

// All routes require authentication
router.use(authenticate);

// Session management
router.post('/study-sessions/start', studySessionController.startSession);
router.patch('/study-sessions/:id/heartbeat', studySessionController.heartbeat);
router.patch('/study-sessions/:id/end', studySessionController.endSession);

// Stats endpoints
router.get('/study-stats', studySessionController.getStats);
router.get('/study-stats/day/:date', studySessionController.getDayStats);

// Classroom-specific stats (mounted under /classrooms/:id in index.js)
router.get('/classrooms/:id/study-stats', studySessionController.getClassroomStats);

module.exports = router;
