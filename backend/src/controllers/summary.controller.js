/**
 * Summary Controller
 *
 * Route handlers for summary generation and management.
 */

const prisma = require('../lib/prisma');
const { createSummarySchema } = require('../validators/summary.validator');
const { NotFoundError, AuthorizationError, ValidationError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { canUseChat, recordTokenUsage } = require('../services/tier.service');
const {
  gatherDocumentsContentStructured,
  generateSummary,
  createSummary,
  getSummaryById,
  getSummariesByClassroom,
  deleteSummary,
} = require('../services/summary.service');
const logger = require('../config/logger');

/**
 * Generate a new summary
 * POST /api/v1/classrooms/:classroomId/summaries
 */
const createSummaryHandler = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;
  const data = createSummarySchema.parse(req.body);

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

  // Generate summary
  const { summary: generatedContent, tokensUsed, weightedTokens, warnings } = await generateSummary({
    documents: isGeneralKnowledge ? null : documents,
    focusTopic: data.focusTopic,
    length: data.length,
    isGeneralKnowledge,
    tier: req.user.tier,
  });

  // Record token usage (weighted tokens for daily budget)
  if (tokensUsed > 0) {
    await recordTokenUsage(req.user.id, tokensUsed, weightedTokens);
    logger.info(`Recorded ${weightedTokens ?? tokensUsed} weighted tokens for user ${req.user.id}`);
  }

  // Save to database
  const summary = await createSummary({
    title: data.title,
    focusTopic: data.focusTopic,
    content: generatedContent,
    length: data.length,
    classroomId,
    userId: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: {
      summary,
      tokensUsed,
      tokensRemaining: tierCheck.remaining - tokensUsed,
      isGeneralKnowledge,
      warnings,
    },
  });
});

/**
 * Get all summaries in a classroom
 * GET /api/v1/classrooms/:classroomId/summaries
 */
const getClassroomSummaries = asyncHandler(async (req, res) => {
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

  const summaries = await getSummariesByClassroom(classroomId);

  res.json({
    success: true,
    data: { summaries },
  });
});

/**
 * Get a single summary by ID
 * GET /api/v1/summaries/:id
 */
const getSummaryHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const summary = await getSummaryById(id);

  if (!summary) {
    throw new NotFoundError('Summary');
  }

  if (summary.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this summary');
  }

  res.json({
    success: true,
    data: { summary },
  });
});

/**
 * Delete a summary
 * DELETE /api/v1/summaries/:id
 */
const deleteSummaryHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const summary = await getSummaryById(id);

  if (!summary) {
    throw new NotFoundError('Summary');
  }

  if (summary.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this summary');
  }

  await deleteSummary(id);

  res.json({
    success: true,
    message: 'Summary deleted',
  });
});

module.exports = {
  createSummaryHandler,
  getClassroomSummaries,
  getSummaryHandler,
  deleteSummaryHandler,
};
