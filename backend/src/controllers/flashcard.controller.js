/**
 * Flashcard Controller
 *
 * Route handlers for flashcard set generation and management.
 */

const prisma = require('../lib/prisma');
const { createFlashcardSetSchema, manualFlashcardSetSchema, updateFlashcardSetSchema } = require('../validators/flashcard.validator');
const { NotFoundError, AuthorizationError, ValidationError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { canUseChat, recordTokenUsage } = require('../services/tier.service');
const {
  gatherDocumentsContentStructured,
  generateFlashcards,
  createFlashcardSet,
  getFlashcardSetById,
  getFlashcardSetsByClassroom,
  deleteFlashcardSet,
  updateFlashcardSet,
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

  let documents = [];
  let documentCount = 0;

  // Gather content from selected documents (if any)
  if (!isGeneralKnowledge) {
    documents = await gatherDocumentsContentStructured(data.documentIds);
    documentCount = documents.length;

    if (documents.length === 0) {
      throw new ValidationError('No content found in selected documents.');
    }

    logger.info(`Gathered content from ${documentCount} documents`);
  }

  // Generate flashcards
  const { cards, tokensUsed, weightedTokens, warnings } = await generateFlashcards({
    documents: isGeneralKnowledge ? null : documents,
    focusTopic: data.focusTopic,
    count: data.count,
    isGeneralKnowledge,
    tier: req.user.tier,
  });

  // Record token usage (weighted tokens for daily budget)
  if (tokensUsed > 0) {
    await recordTokenUsage(req.user.id, tokensUsed, weightedTokens);
    logger.info(`Recorded ${weightedTokens ?? tokensUsed} weighted tokens for user ${req.user.id}`);
  }

  // Save to database
  const flashcardSet = await createFlashcardSet({
    title: data.title,
    focusTopic: data.focusTopic,
    classroomId,
    userId: req.user.id,
    isGeneralKnowledge,
    cards,
  });

  res.status(201).json({
    success: true,
    data: {
      flashcardSet,
      tokensUsed,
      tokensRemaining: tierCheck.remaining - tokensUsed,
      isGeneralKnowledge,
      warnings,
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

/**
 * Create a manual flashcard set (no AI generation)
 * POST /api/v1/classrooms/:classroomId/flashcard-sets/manual
 */
const createManualFlashcardSetHandler = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;
  const data = manualFlashcardSetSchema.parse(req.body);

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

  // Save to database
  const flashcardSet = await createFlashcardSet({
    title: data.title,
    focusTopic: data.focusTopic,
    classroomId,
    userId: req.user.id,
    isGeneralKnowledge: false,
    cards: data.cards,
  });

  res.status(201).json({
    success: true,
    data: { flashcardSet },
  });
});

/**
 * Update a flashcard set
 * PUT /api/v1/flashcard-sets/:id
 */
const updateFlashcardSetHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = updateFlashcardSetSchema.parse(req.body);

  const flashcardSet = await getFlashcardSetById(id);

  if (!flashcardSet) {
    throw new NotFoundError('Flashcard set');
  }

  if (flashcardSet.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this flashcard set');
  }

  const updated = await updateFlashcardSet(id, data);

  res.json({
    success: true,
    data: { flashcardSet: updated },
  });
});

module.exports = {
  createFlashcardSetHandler,
  getClassroomFlashcardSets,
  getFlashcardSetHandler,
  deleteFlashcardSetHandler,
  createManualFlashcardSetHandler,
  updateFlashcardSetHandler,
};
