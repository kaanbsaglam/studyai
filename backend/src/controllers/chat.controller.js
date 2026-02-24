/**
 * Chat Controller
 *
 * Handles RAG-based chat queries for classrooms.
 */

const prisma = require('../lib/prisma');
const { queryAndAnswer } = require('../services/rag.service');
const { chatQuerySchema } = require('../validators/chat.validator');
const { NotFoundError, AuthorizationError, ValidationError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { canUseChat, recordTokenUsage } = require('../services/tier.service');
const logger = require('../config/logger');

/**
 * Ask a question about documents in a classroom
 * POST /api/v1/classrooms/:classroomId/chat
 */
const askQuestion = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;
  const data = chatQuerySchema.parse(req.body);

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

  // Check token limits
  const tierCheck = await canUseChat(req.user.id, req.user.tier);
  if (!tierCheck.allowed) {
    throw new ValidationError(tierCheck.reason);
  }

  // Query and generate answer
  const result = await queryAndAnswer({
    question: data.question,
    classroomId,
    documentIds: data.documentIds,
    conversationHistory: data.conversationHistory,
    tier: req.user.tier,
  });

  // Record token usage (weighted tokens for daily budget)
  if (result.tokensUsed > 0) {
    await recordTokenUsage(req.user.id, result.tokensUsed, result.weightedTokens);
    logger.info(`Recorded ${result.weightedTokens ?? result.tokensUsed} weighted tokens for user ${req.user.id}`);
  }

  res.json({
    success: true,
    data: {
      question: data.question,
      answer: result.answer,
      sources: result.sources,
      hasRelevantContext: result.hasRelevantContext,
      tokensUsed: result.tokensUsed,
      tokensRemaining: tierCheck.remaining - result.tokensUsed,
    },
  });
});

module.exports = {
  askQuestion,
};
