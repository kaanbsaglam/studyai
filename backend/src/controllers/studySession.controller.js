/**
 * Study Session Controller
 *
 * Route handlers for study time tracking and statistics.
 */

const prisma = require('../lib/prisma');
const { asyncHandler, NotFoundError, AuthorizationError } = require('../middleware/errorHandler');
const {
  startSessionSchema,
  heartbeatSchema,
  getStatsQuerySchema,
  getDayStatsSchema,
  getClassroomStatsQuerySchema,
} = require('../validators/studySession.validator');
const studySessionService = require('../services/studySession.service');

/**
 * Start a new study session
 * POST /api/v1/study-sessions/start
 */
const startSession = asyncHandler(async (req, res) => {
  const data = startSessionSchema.parse(req.body);

  // Verify classroom exists and belongs to user
  const classroom = await prisma.classroom.findUnique({
    where: { id: data.classroomId },
  });

  if (!classroom) {
    throw new NotFoundError('Classroom');
  }

  if (classroom.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this classroom');
  }

  // If documentId provided, verify it exists and belongs to classroom
  let document = null;
  if (data.documentId) {
    document = await prisma.document.findUnique({
      where: { id: data.documentId },
    });

    if (!document) {
      throw new NotFoundError('Document');
    }

    if (document.classroomId !== data.classroomId) {
      throw new AuthorizationError('Document does not belong to this classroom');
    }
  }

  // Create the session
  const session = await studySessionService.createSession({
    userId: req.user.id,
    classroomId: data.classroomId,
    documentId: data.documentId || null,
    classroomName: classroom.name,
    documentName: document?.originalName || null,
    activityType: data.activityType,
  });

  res.status(201).json({
    success: true,
    data: {
      sessionId: session.id,
    },
  });
});

/**
 * Update session via heartbeat
 * PATCH /api/v1/study-sessions/:id/heartbeat
 */
const heartbeat = asyncHandler(async (req, res) => {
  const { id } = req.params;
  heartbeatSchema.parse(req.body);

  const session = await studySessionService.updateSessionHeartbeat(id, req.user.id);

  if (!session) {
    throw new NotFoundError('Study session');
  }

  res.json({
    success: true,
    data: {
      durationSeconds: session.durationSeconds,
    },
  });
});

/**
 * End a study session
 * PATCH /api/v1/study-sessions/:id/end
 */
const endSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await studySessionService.endSession(id, req.user.id);

  if (!session) {
    throw new NotFoundError('Study session');
  }

  res.json({
    success: true,
    data: {
      durationSeconds: session.durationSeconds,
      endedAt: session.endedAt,
    },
  });
});

/**
 * Get user's overall study statistics
 * GET /api/v1/study-stats
 */
const getStats = asyncHandler(async (req, res) => {
  const { days, tzOffset } = getStatsQuerySchema.parse(req.query);

  const stats = await studySessionService.getUserStats(req.user.id, days, tzOffset);

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * Get breakdown for a specific day
 * GET /api/v1/study-stats/day/:date
 */
const getDayStats = asyncHandler(async (req, res) => {
  const { date } = getDayStatsSchema.parse(req.params);
  const { tzOffset } = getStatsQuerySchema.parse(req.query);

  const breakdown = await studySessionService.getDayBreakdown(req.user.id, date, tzOffset);

  res.json({
    success: true,
    data: breakdown,
  });
});

/**
 * Get classroom-specific study statistics
 * GET /api/v1/classrooms/:id/study-stats
 */
const getClassroomStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { days, tzOffset } = getClassroomStatsQuerySchema.parse(req.query);

  // Verify classroom exists and belongs to user
  const classroom = await prisma.classroom.findUnique({
    where: { id },
  });

  if (!classroom) {
    throw new NotFoundError('Classroom');
  }

  if (classroom.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this classroom');
  }

  const stats = await studySessionService.getClassroomStats(id, days, tzOffset);

  res.json({
    success: true,
    data: stats,
  });
});

module.exports = {
  startSession,
  heartbeat,
  endSession,
  getStats,
  getDayStats,
  getClassroomStats,
};
