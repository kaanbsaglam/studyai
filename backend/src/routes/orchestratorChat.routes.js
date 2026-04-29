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

// NOTE: this router is mounted at '/' in index.js, so any router-level
// middleware (`router.use(...)`) would run for EVERY request entering the
// API — including unrelated paths like /account/usage — and a FREE user
// would get 403'd before the request could fall through to the matching
// router. Apply the auth + premium gates per-route instead.
const guards = [authenticate, requirePremium];

router.get(
  '/classrooms/:classroomId/orchestrator-chat/sessions',
  guards,
  listOrchestratorSessions,
);
router.get(
  '/classrooms/:classroomId/orchestrator-chat/sessions/:sessionId',
  guards,
  getOrchestratorSession,
);
router.delete(
  '/classrooms/:classroomId/orchestrator-chat/sessions/:sessionId',
  guards,
  deleteOrchestratorSession,
);

router.post(
  '/classrooms/:classroomId/orchestrator-chat/messages/stream',
  guards,
  sendOrchestratorMessageStream,
);

module.exports = router;
