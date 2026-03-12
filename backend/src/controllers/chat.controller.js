/**
 * Chat Controller
 *
 * Handles persistent chat sessions with RAG-based queries.
 */

const prisma = require('../lib/prisma');
const { queryAndAnswer } = require('../services/rag.service');
const { sendMessageSchema, addDocumentsSchema } = require('../validators/chat.validator');
const { NotFoundError, AuthorizationError, ValidationError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { canUseChat, recordTokenUsage } = require('../services/tier.service');
const { generateText } = require('../services/llm.service');
const logger = require('../config/logger');

/**
 * Verify classroom ownership and return classroom with ready documents
 */
async function verifyClassroomAccess(classroomId, userId) {
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

  if (classroom.userId !== userId) {
    throw new AuthorizationError('You do not have access to this classroom');
  }

  return classroom;
}

/**
 * Verify session ownership
 */
async function verifySessionAccess(sessionId, classroomId, userId) {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new NotFoundError('Chat session');
  }

  if (session.userId !== userId || session.classroomId !== classroomId) {
    throw new AuthorizationError('You do not have access to this session');
  }

  return session;
}

/**
 * Generate a short title for a chat session
 * Returns the generated title (or null on failure)
 */
async function generateSessionTitle(sessionId, question, answer) {
  try {
    const prompt = `Generate a very short title (max 6 words) for this conversation. Return ONLY the title, nothing else.\n\nUser: ${question}\nAssistant: ${answer.slice(0, 500)}`;
    const { text } = await generateText(prompt, { model: 'gemini-2.0-flash' });
    const title = text.trim().replace(/^["']|["']$/g, '').slice(0, 100);
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title },
    });
    logger.info(`Generated title for session ${sessionId}: "${title}"`);
    return title;
  } catch (err) {
    logger.error(`Failed to generate session title: ${err.message}`);
    return null;
  }
}

/**
 * Send a message in a chat session
 * POST /api/v1/classrooms/:classroomId/chat/messages
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;
  const data = sendMessageSchema.parse(req.body);

  const classroom = await verifyClassroomAccess(classroomId, req.user.id);
  const classroomDocIds = new Set(classroom.documents.map((d) => d.id));

  // Verify all provided documentIds exist in this classroom
  if (data.documentIds.length > 0) {
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

  let session;
  let conversationHistory = [];
  let mergedDocIds = data.documentIds;
  const isNewSession = !data.sessionId;

  if (data.sessionId) {
    // Load existing session with messages and documents
    session = await prisma.chatSession.findUnique({
      where: { id: data.sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { role: true, content: true },
        },
        documents: {
          select: { id: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Chat session');
    }
    if (session.userId !== req.user.id || session.classroomId !== classroomId) {
      throw new AuthorizationError('You do not have access to this session');
    }

    // Build conversation history from DB messages
    conversationHistory = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Merge document IDs (existing + new, deduplicated)
    const existingDocIds = new Set(session.documents.map((d) => d.id));
    const newDocIds = data.documentIds.filter((id) => !existingDocIds.has(id));
    mergedDocIds = [...existingDocIds, ...newDocIds];

    // Connect any new documents to the session
    if (newDocIds.length > 0) {
      await prisma.chatSession.update({
        where: { id: session.id },
        data: {
          documents: {
            connect: newDocIds.map((id) => ({ id })),
          },
        },
      });
    }
  } else {
    // Create new session
    session = await prisma.chatSession.create({
      data: {
        userId: req.user.id,
        classroomId,
        documents: {
          connect: data.documentIds.map((id) => ({ id })),
        },
      },
    });
  }

  // Query and generate answer
  const result = await queryAndAnswer({
    question: data.question,
    classroomId,
    documentIds: mergedDocIds,
    conversationHistory,
    tier: req.user.tier,
  });

  // Save user and assistant messages
  await prisma.chatMessage.createMany({
    data: [
      {
        sessionId: session.id,
        role: 'USER',
        content: data.question,
      },
      {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: result.answer,
        sources: result.sources?.length > 0 ? result.sources : undefined,
        hasRelevantContext: result.hasRelevantContext,
      },
    ],
  });

  // Touch updatedAt on session
  await prisma.chatSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() },
  });

  // Record token usage
  if (result.tokensUsed > 0) {
    await recordTokenUsage(req.user.id, result.tokensUsed, result.weightedTokens);
    logger.info(`Recorded ${result.weightedTokens ?? result.tokensUsed} weighted tokens for user ${req.user.id}`);
  }

  // Generate title for new sessions (awaited so frontend gets it immediately)
  let sessionTitle = null;
  if (isNewSession) {
    sessionTitle = await generateSessionTitle(session.id, data.question, result.answer);
  }

  res.json({
    success: true,
    data: {
      sessionId: session.id,
      sessionTitle,
      question: data.question,
      answer: result.answer,
      sources: result.sources,
      hasRelevantContext: result.hasRelevantContext,
      tokensUsed: result.tokensUsed,
      tokensRemaining: tierCheck.remaining - result.tokensUsed,
    },
  });
});

/**
 * List chat sessions for a classroom
 * GET /api/v1/classrooms/:classroomId/chat/sessions
 */
const listSessions = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;

  await verifyClassroomAccess(classroomId, req.user.id);

  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const cursor = req.query.cursor;

  const where = {
    classroomId,
    userId: req.user.id,
  };

  const sessions = await prisma.chatSession.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    include: {
      _count: { select: { messages: { where: { role: 'USER' } } } },
      documents: { select: { id: true, originalName: true } },
    },
  });

  const hasMore = sessions.length > limit;
  const items = hasMore ? sessions.slice(0, limit) : sessions;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  res.json({
    success: true,
    data: {
      sessions: items,
      nextCursor,
    },
  });
});

/**
 * Get a single chat session with messages
 * GET /api/v1/classrooms/:classroomId/chat/sessions/:sessionId
 */
const getSession = asyncHandler(async (req, res) => {
  const { classroomId, sessionId } = req.params;

  await verifyClassroomAccess(classroomId, req.user.id);

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      documents: {
        select: { id: true, originalName: true },
      },
    },
  });

  if (!session) {
    throw new NotFoundError('Chat session');
  }

  if (session.userId !== req.user.id || session.classroomId !== classroomId) {
    throw new AuthorizationError('You do not have access to this session');
  }

  res.json({
    success: true,
    data: { session },
  });
});

/**
 * Delete a chat session
 * DELETE /api/v1/classrooms/:classroomId/chat/sessions/:sessionId
 */
const deleteSession = asyncHandler(async (req, res) => {
  const { classroomId, sessionId } = req.params;

  await verifySessionAccess(sessionId, classroomId, req.user.id);

  await prisma.chatSession.delete({
    where: { id: sessionId },
  });

  res.json({
    success: true,
    data: { message: 'Session deleted' },
  });
});

/**
 * Add documents to a chat session
 * PATCH /api/v1/classrooms/:classroomId/chat/sessions/:sessionId/documents
 */
const addDocuments = asyncHandler(async (req, res) => {
  const { classroomId, sessionId } = req.params;
  const data = addDocumentsSchema.parse(req.body);

  const classroom = await verifyClassroomAccess(classroomId, req.user.id);
  await verifySessionAccess(sessionId, classroomId, req.user.id);

  // Verify all doc IDs belong to this classroom
  const classroomDocIds = new Set(classroom.documents.map((d) => d.id));
  for (const docId of data.documentIds) {
    if (!classroomDocIds.has(docId)) {
      throw new NotFoundError(`Document ${docId} not found in this classroom`);
    }
  }

  // Connect documents (idempotent)
  const session = await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      documents: {
        connect: data.documentIds.map((id) => ({ id })),
      },
    },
    include: {
      documents: { select: { id: true, originalName: true } },
    },
  });

  res.json({
    success: true,
    data: { documents: session.documents },
  });
});

module.exports = {
  sendMessage,
  listSessions,
  getSession,
  deleteSession,
  addDocuments,
};
