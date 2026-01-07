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

  // Check if there are any processed documents
  if (classroom.documents.length === 0) {
    throw new ValidationError(
      'No processed documents in this classroom. Upload and wait for documents to be processed before asking questions.'
    );
  }

  // Check token limits
  const tierCheck = await canUseChat(req.user.id, req.user.tier);
  if (!tierCheck.allowed) {
    throw new ValidationError(tierCheck.reason);
  }

  // Query and generate answer
  const result = await queryAndAnswer(data.question, classroomId);

  // Record token usage
  if (result.tokensUsed > 0) {
    await recordTokenUsage(req.user.id, result.tokensUsed);
    logger.info(`Recorded ${result.tokensUsed} tokens for user ${req.user.id}`);
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
