/**
 * Note Routes
 */

const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth.middleware');
const {
  createNoteHandler,
  uploadAudioNoteHandler,
  getNoteStreamUrlHandler,
  updateNoteHandler,
  getClassroomNotesHandler,
  getNoteHandler,
  deleteNoteHandler,
} = require('../controllers/note.controller');
const { MAX_AUDIO_NOTE_SIZE } = require('../validators/note.validator');

const router = express.Router();

// Multer: memory storage for audio note uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_NOTE_SIZE },
});

// All routes require authentication
router.use(authenticate);

// Classroom-scoped routes
router.post(
  '/classrooms/:classroomId/notes/audio',
  upload.single('file'),
  uploadAudioNoteHandler
);
router.post('/classrooms/:classroomId/notes', createNoteHandler);
router.get('/classrooms/:classroomId/notes', getClassroomNotesHandler);

// Note routes
router.get('/notes/:id/stream', getNoteStreamUrlHandler);
router.get('/notes/:id', getNoteHandler);
router.patch('/notes/:id', updateNoteHandler);
router.delete('/notes/:id', deleteNoteHandler);

module.exports = router;
