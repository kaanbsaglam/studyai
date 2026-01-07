/**
 * Flashcard Controller
 *
 * Route handlers for flashcard set generation and management.
 */

const prisma = require('../lib/prisma');
const { createFlashcardSetSchema } = require('../validators/flashcard.validator');
const { NotFoundError, AuthorizationError, ValidationError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { canUseChat, recordTokenUsage } = require('../services/tier.service');
const {
  gatherClassroomContent,
  generateFlashcards,
  createFlashcardSet,
  getFlashcardSetById,
  getFlashcardSetsByClassroom,
  deleteFlashcardSet,
} = require('../services/flashcard.service');
const logger = require('../config/logger');

/**
 * Generate a new flashcard set
 * POST /api/v1/classrooms/:classroomId/flashcard-sets
 */
const createFlashcardSetHandler = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;
  const data = createFlashcardSetSchema.parse(req.body);

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

  // Check if there are any processed documents
  if (classroom.documents.length === 0) {
    throw new ValidationError(
      'No processed documents in this classroom. Upload and wait for documents to be processed before generating flashcards.'
    );
  }

  // Check token limits
  const tierCheck = await canUseChat(req.user.id, req.user.tier);
  if (!tierCheck.allowed) {
    throw new ValidationError(tierCheck.reason);
  }

  // Gather content from classroom documents
  const { content, truncated, documentCount } = await gatherClassroomContent(classroomId);

  if (!content) {
    throw new ValidationError('No content found in classroom documents.');
  }

  logger.info(`Gathered content from ${documentCount} documents${truncated ? ' (truncated)' : ''}`);

  // Generate flashcards
  const { cards, tokensUsed } = await generateFlashcards({
    content,
    focusTopic: data.focusTopic,
    count: data.count,
  });

  // Record token usage
  if (tokensUsed > 0) {
    await recordTokenUsage(req.user.id, tokensUsed);
    logger.info(`Recorded ${tokensUsed} tokens for user ${req.user.id}`);
  }

  // Save to database
  const flashcardSet = await createFlashcardSet({
    title: data.title,
    focusTopic: data.focusTopic,
    classroomId,
    userId: req.user.id,
    cards,
  });

  res.status(201).json({
    success: true,
    data: {
      flashcardSet,
      tokensUsed,
      tokensRemaining: tierCheck.remaining - tokensUsed,
      contentTruncated: truncated,
    },
  });
});

/**
 * Get all flashcard sets in a classroom
 * GET /api/v1/classrooms/:classroomId/flashcard-sets
 */
const getClassroomFlashcardSets = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;

  // Check classroom exists and belongs to user
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom) {
    throw new NotFoundError('Classroom');
  }

  if (classroom.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this classroom');
  }

  const flashcardSets = await getFlashcardSetsByClassroom(classroomId);

  res.json({
    success: true,
    data: { flashcardSets },
  });
});

/**
 * Get a single flashcard set by ID
 * GET /api/v1/flashcard-sets/:id
 */
const getFlashcardSetHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const flashcardSet = await getFlashcardSetById(id);

  if (!flashcardSet) {
    throw new NotFoundError('Flashcard set');
  }

  if (flashcardSet.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this flashcard set');
  }

  res.json({
    success: true,
    data: { flashcardSet },
  });
});

/**
 * Delete a flashcard set
 * DELETE /api/v1/flashcard-sets/:id
 */
const deleteFlashcardSetHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const flashcardSet = await getFlashcardSetById(id);

  if (!flashcardSet) {
    throw new NotFoundError('Flashcard set');
  }

  if (flashcardSet.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this flashcard set');
  }

  await deleteFlashcardSet(id);

  res.json({
    success: true,
    message: 'Flashcard set deleted',
  });
});

module.exports = {
  createFlashcardSetHandler,
  getClassroomFlashcardSets,
  getFlashcardSetHandler,
  deleteFlashcardSetHandler,
};
