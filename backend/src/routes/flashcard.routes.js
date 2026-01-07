/**
 * Flashcard Routes
 *
 * POST   /api/v1/classrooms/:classroomId/flashcard-sets - Generate new flashcard set
 * GET    /api/v1/classrooms/:classroomId/flashcard-sets - List flashcard sets in classroom
 * GET    /api/v1/flashcard-sets/:id                     - Get flashcard set with cards
 * DELETE /api/v1/flashcard-sets/:id                     - Delete flashcard set
 */

const express = require('express');
const {
  createFlashcardSetHandler,
  getClassroomFlashcardSets,
  getFlashcardSetHandler,
  deleteFlashcardSetHandler,
} = require('../controllers/flashcard.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Classroom-scoped routes
router.post('/classrooms/:classroomId/flashcard-sets', createFlashcardSetHandler);
router.get('/classrooms/:classroomId/flashcard-sets', getClassroomFlashcardSets);

// Direct flashcard set routes
router.get('/flashcard-sets/:id', getFlashcardSetHandler);
router.delete('/flashcard-sets/:id', deleteFlashcardSetHandler);

module.exports = router;
