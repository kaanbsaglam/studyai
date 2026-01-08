/**
 * Note Routes
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const {
  createNoteHandler,
  updateNoteHandler,
  getClassroomNotesHandler,
  getNoteHandler,
  deleteNoteHandler,
} = require('../controllers/note.controller');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Classroom-scoped routes
router.post('/classrooms/:classroomId/notes', createNoteHandler);
router.get('/classrooms/:classroomId/notes', getClassroomNotesHandler);

// Note routes
router.get('/notes/:id', getNoteHandler);
router.patch('/notes/:id', updateNoteHandler);
router.delete('/notes/:id', deleteNoteHandler);

module.exports = router;
