/**
 * Quiz Routes
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const {
  createQuizSetHandler,
  getClassroomQuizSets,
  getQuizSetHandler,
  deleteQuizSetHandler,
  recordAttemptHandler,
  getAttemptsHandler,
} = require('../controllers/quiz.controller');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Classroom-scoped routes
router.post('/classrooms/:classroomId/quiz-sets', createQuizSetHandler);
router.get('/classrooms/:classroomId/quiz-sets', getClassroomQuizSets);

// Quiz set routes
router.get('/quiz-sets/:id', getQuizSetHandler);
router.delete('/quiz-sets/:id', deleteQuizSetHandler);

// Quiz attempt routes
router.post('/quiz-sets/:id/attempts', recordAttemptHandler);
router.get('/quiz-sets/:id/attempts', getAttemptsHandler);

module.exports = router;
