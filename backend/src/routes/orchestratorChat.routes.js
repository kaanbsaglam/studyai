/**
 * Orchestrator Chat Routes (PREMIUM-only)
 *
 * POST   /api/v1/classrooms/:classroomId/orchestrator-chat/messages/stream
 * GET    /api/v1/classrooms/:classroomId/orchestrator-chat/sessions
 * GET    /api/v1/classrooms/:classroomId/orchestrator-chat/sessions/:sessionId
 * DELETE /api/v1/classrooms/:classroomId/orchestrator-chat/sessions/:sessionId
 */

const express = require('express');
const {
  sendOrchestratorMessageStream,
  listOrchestratorSessions,
  getOrchestratorSession,
  deleteOrchestratorSession,
} = require('../controllers/orchestratorChat.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePremium } = require('../middleware/tier.middleware');

const router = express.Router();

router.use(authenticate);
router.use(requirePremium);

router.get('/classrooms/:classroomId/orchestrator-chat/sessions', listOrchestratorSessions);
router.get(
  '/classrooms/:classroomId/orchestrator-chat/sessions/:sessionId',
  getOrchestratorSession,
);
router.delete(
  '/classrooms/:classroomId/orchestrator-chat/sessions/:sessionId',
  deleteOrchestratorSession,
);

router.post(
  '/classrooms/:classroomId/orchestrator-chat/messages/stream',
  sendOrchestratorMessageStream,
);

module.exports = router;
