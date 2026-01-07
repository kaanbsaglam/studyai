/**
 * Quiz Controller
 *
 * Route handlers for quiz generation and management.
 */

const prisma = require('../lib/prisma');
const { createQuizSetSchema, recordAttemptSchema } = require('../validators/quiz.validator');
const { NotFoundError, AuthorizationError, ValidationError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { canUseChat, recordTokenUsage } = require('../services/tier.service');
const {
  gatherDocumentsContent,
  generateQuiz,
  createQuizSet,
  getQuizSetById,
  getQuizSetsByClassroom,
  deleteQuizSet,
  recordQuizAttempt,
  getQuizAttempts,
} = require('../services/quiz.service');
const logger = require('../config/logger');

/**
 * Generate a new quiz
 * POST /api/v1/classrooms/:classroomId/quiz-sets
 */
const createQuizSetHandler = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;
  const data = createQuizSetSchema.parse(req.body);

  // Check classroom exists and belongs to user
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    include: {
      documents: {
        where: { status: 'READY' },
        select: { id: true },
      },
    },
  });

  if (!classroom) {
    throw new NotFoundError('Classroom');
  }

  if (classroom.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this classroom');
  }

  // Verify all provided documentIds exist in this classroom
  if (data.documentIds.length > 0) {
    const classroomDocIds = new Set(classroom.documents.map((d) => d.id));
    for (const docId of data.documentIds) {
      if (!classroomDocIds.has(docId)) {
        throw new NotFoundError(`Document ${docId} not found in this classroom`);
      }
    }
  }

  // Determine if this is a general knowledge request
  const isGeneralKnowledge = data.documentIds.length === 0;

  // For general knowledge, focus topic is required
  if (isGeneralKnowledge && !data.focusTopic) {
    throw new ValidationError('Focus topic is required when no documents are selected');
  }

  // Check token limits
  const tierCheck = await canUseChat(req.user.id, req.user.tier);
  if (!tierCheck.allowed) {
    throw new ValidationError(tierCheck.reason);
  }

  let content = '';
  let truncated = false;
  let documentCount = 0;

  // Gather content from selected documents (if any)
  if (!isGeneralKnowledge) {
    const gathered = await gatherDocumentsContent(data.documentIds);
    content = gathered.content;
    truncated = gathered.truncated;
    documentCount = gathered.documentCount;

    if (!content) {
      throw new ValidationError('No content found in selected documents.');
    }

    logger.info(`Gathered content from ${documentCount} documents${truncated ? ' (truncated)' : ''}`);
  }

  // Generate quiz
  const { questions, tokensUsed } = await generateQuiz({
    content: isGeneralKnowledge ? null : content,
    focusTopic: data.focusTopic,
    count: data.count,
    isGeneralKnowledge,
  });

  // Record token usage
  if (tokensUsed > 0) {
    await recordTokenUsage(req.user.id, tokensUsed);
    logger.info(`Recorded ${tokensUsed} tokens for user ${req.user.id}`);
  }

  // Save to database
  const quizSet = await createQuizSet({
    title: data.title,
    focusTopic: data.focusTopic,
    classroomId,
    userId: req.user.id,
    questions,
  });

  res.status(201).json({
    success: true,
    data: {
      quizSet,
      tokensUsed,
      tokensRemaining: tierCheck.remaining - tokensUsed,
      contentTruncated: truncated,
      isGeneralKnowledge,
    },
  });
});

/**
 * Get all quiz sets in a classroom
 * GET /api/v1/classrooms/:classroomId/quiz-sets
 */
const getClassroomQuizSets = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom) {
    throw new NotFoundError('Classroom');
  }

  if (classroom.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this classroom');
  }

  const quizSets = await getQuizSetsByClassroom(classroomId);

  res.json({
    success: true,
    data: { quizSets },
  });
});

/**
 * Get a single quiz set by ID
 * GET /api/v1/quiz-sets/:id
 */
const getQuizSetHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const quizSet = await getQuizSetById(id);

  if (!quizSet) {
    throw new NotFoundError('Quiz set');
  }

  if (quizSet.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this quiz');
  }

  res.json({
    success: true,
    data: { quizSet },
  });
});

/**
 * Delete a quiz set
 * DELETE /api/v1/quiz-sets/:id
 */
const deleteQuizSetHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const quizSet = await getQuizSetById(id);

  if (!quizSet) {
    throw new NotFoundError('Quiz set');
  }

  if (quizSet.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this quiz');
  }

  await deleteQuizSet(id);

  res.json({
    success: true,
    message: 'Quiz deleted',
  });
});

/**
 * Record a quiz attempt
 * POST /api/v1/quiz-sets/:id/attempts
 */
const recordAttemptHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = recordAttemptSchema.parse(req.body);

  const quizSet = await getQuizSetById(id);

  if (!quizSet) {
    throw new NotFoundError('Quiz set');
  }

  if (quizSet.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this quiz');
  }

  // Validate that score doesn't exceed total questions
  if (data.score > data.totalQuestions) {
    throw new ValidationError('Score cannot exceed total questions');
  }

  const attempt = await recordQuizAttempt({
    quizSetId: id,
    score: data.score,
    totalQuestions: data.totalQuestions,
  });

  res.status(201).json({
    success: true,
    data: { attempt },
  });
});

/**
 * Get quiz attempts for a quiz set
 * GET /api/v1/quiz-sets/:id/attempts
 */
const getAttemptsHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const quizSet = await getQuizSetById(id);

  if (!quizSet) {
    throw new NotFoundError('Quiz set');
  }

  if (quizSet.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this quiz');
  }

  const attempts = await getQuizAttempts(id);

  res.json({
    success: true,
    data: { attempts },
  });
});

module.exports = {
  createQuizSetHandler,
  getClassroomQuizSets,
  getQuizSetHandler,
  deleteQuizSetHandler,
  recordAttemptHandler,
  getAttemptsHandler,
};
