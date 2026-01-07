/**
 * Chat Routes
 *
 * POST /api/v1/classrooms/:classroomId/chat - Ask a question about documents
 */

const express = require('express');
const { askQuestion } = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Chat endpoint
router.post('/classrooms/:classroomId/chat', askQuestion);

module.exports = router;
