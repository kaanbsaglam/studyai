/**
 * Chat Routes
 *
 * POST   /api/v1/classrooms/:classroomId/chat/messages                          - Send a message
 * GET    /api/v1/classrooms/:classroomId/chat/sessions                          - List sessions
 * GET    /api/v1/classrooms/:classroomId/chat/sessions/:sessionId               - Get session
 * DELETE /api/v1/classrooms/:classroomId/chat/sessions/:sessionId               - Delete session
 * PATCH  /api/v1/classrooms/:classroomId/chat/sessions/:sessionId/documents     - Add documents
 */

const express = require('express');
const {
  sendMessage,
  listSessions,
  getSession,
  deleteSession,
  addDocuments,
} = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Session management
router.get('/classrooms/:classroomId/chat/sessions', listSessions);
router.get('/classrooms/:classroomId/chat/sessions/:sessionId', getSession);
router.delete('/classrooms/:classroomId/chat/sessions/:sessionId', deleteSession);
router.patch('/classrooms/:classroomId/chat/sessions/:sessionId/documents', addDocuments);

// Messages
router.post('/classrooms/:classroomId/chat/messages', sendMessage);

module.exports = router;
