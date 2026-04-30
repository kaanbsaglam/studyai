/**
 * Orchestrator Chat Controller
 *
 * PREMIUM-only chat backed by a LangGraph orchestrator. Endpoints mirror
 * the standard chat controller's shape (sessions, messages, streaming) but
 * hit the OrchestratorSession / OrchestratorMessage tables and run the
 * planner-retriever-synthesis graph defined in orchestratorChat.service.
 */

const prisma = require('../lib/prisma');
const {
  runOrchestratorGraph,
  buildSynthesisPrompt,
  getSynthesisScenario,
  buildSources,
  deleteThread: deleteCheckpointerThread,
} = require('../services/orchestratorChat.service');
const { generateStreamWithFallback, generateText } = require('../services/llm.service');
const {
  sendOrchestratorMessageSchema,
} = require('../validators/orchestratorChat.validator');
const {
  NotFoundError,
  AuthorizationError,
  asyncHandler,
} = require('../middleware/errorHandler');
const { canUseChat, recordTokenUsage } = require('../services/tier.service');
const llmConfig = require('../config/llm.config');
const logger = require('../config/logger');
const { loadPrompt } = require('../prompts/loader');

// ─── Helpers ───────────────────────────────────────────────────────────

async function verifyClassroomAccess(classroomId, userId) {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });
  if (!classroom) throw new NotFoundError('Classroom');
  if (classroom.userId !== userId) {
    throw new AuthorizationError('You do not have access to this classroom');
  }
  return classroom;
}

async function verifySessionAccess(sessionId, classroomId, userId) {
  const session = await prisma.orchestratorSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) throw new NotFoundError('Orchestrator session');
  if (session.userId !== userId || session.classroomId !== classroomId) {
    throw new AuthorizationError('You do not have access to this session');
  }
  return session;
}

async function generateSessionTitle(sessionId, question, answer, tier) {
  try {
    const model = llmConfig.tiers[tier].chatTitle.primary;
    const prompt = loadPrompt('chat/titleGeneration', {
      question,
      answerPreview: answer.slice(0, 500),
    });
    const { text } = await generateText(prompt, {
      model,
      tag: 'orchestrator',
      event: 'title_call_completed',
      extra: { node: 'title' },
    });
    const title = text.trim().replace(/^["']|["']$/g, '').slice(0, 100);
    await prisma.orchestratorSession.update({
      where: { id: sessionId },
      data: { title },
    });
    logger.logEvent('info', {
      tag: 'orchestrator',
      event: 'session_title_generated',
      sessionId,
      title,
    });
    return title;
  } catch (err) {
    logger.logEvent('error', {
      tag: 'orchestrator',
      event: 'session_title_generation_failed',
      sessionId,
      error: err.message,
    });
    return null;
  }
}

function sseWrite(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

// ─── Endpoints ─────────────────────────────────────────────────────────

/**
 * POST /api/v1/classrooms/:classroomId/orchestrator-chat/messages/stream
 * SSE stream with staged events:
 *   { type: 'planning' }
 *   { type: 'planning_done', tasks, directResponse, plannerTokens }
 *   { type: 'retriever_done', query, documentIds, resultExcerpt, tokens }
 *   { type: 'synthesizing' }
 *   { type: 'chunk', text }           (token-level from synthesis)
 *   { type: 'done', sessionId, sessionTitle, sources, tokensUsed, tokensRemaining }
 *   { type: 'error', message }
 */
const sendOrchestratorMessageStream = async (req, res) => {
  const turnStartMs = Date.now();
  try {
    const { classroomId } = req.params;
    const data = sendOrchestratorMessageSchema.parse(req.body);

    await verifyClassroomAccess(classroomId, req.user.id);

    logger.logEvent('info', {
      tag: 'orchestrator',
      event: 'orchestrator_turn_started',
      userId: req.user.id,
      classroomId,
      sessionId: data.sessionId || null,
      questionLength: data.question?.length || 0,
    });

    const tierCheck = await canUseChat(req.user.id, req.user.tier);
    if (!tierCheck.allowed) {
      return res
        .status(429)
        .json({ success: false, error: { message: tierCheck.reason } });
    }

    let session;
    let conversationHistory = [];
    const isNewSession = !data.sessionId;

    if (data.sessionId) {
      session = await prisma.orchestratorSession.findUnique({
        where: { id: data.sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            select: { role: true, content: true },
          },
        },
      });
      if (!session) {
        return res
          .status(404)
          .json({ success: false, error: { message: 'Orchestrator session not found' } });
      }
      if (session.userId !== req.user.id || session.classroomId !== classroomId) {
        return res
          .status(403)
          .json({ success: false, error: { message: 'You do not have access to this session' } });
      }

      conversationHistory = session.messages.map((m) => ({
        role: m.role === 'USER' ? 'user' : 'assistant',
        content: m.content,
      }));
    } else {
      session = await prisma.orchestratorSession.create({
        data: {
          userId: req.user.id,
          classroomId,
        },
      });
    }

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    sseWrite(res, { type: 'planning' });

    // Run the graph and forward its events to the client
    let planningDone = null;
    const retrieverEvents = [];
    let graphDone = null;

    const graphEvents = runOrchestratorGraph({
      sessionId: session.id,
      question: data.question,
      classroomId,
      chatHistory: conversationHistory,
    });

    for await (const evt of graphEvents) {
      if (clientDisconnected) break;
      if (evt.type === 'planning_done') {
        planningDone = evt;
        sseWrite(res, {
          type: 'planning_done',
          taskCount: evt.tasks.length,
          tasks: evt.tasks,
          hasDirectResponse: !!evt.directResponse,
        });
      } else if (evt.type === 'retriever_done') {
        retrieverEvents.push(evt);
        sseWrite(res, {
          type: 'retriever_done',
          query: evt.query,
          documentIds: evt.documentIds,
          resultExcerpt: evt.resultExcerpt,
        });
      } else if (evt.type === 'graph_done') {
        graphDone = evt;
      }
    }

    if (clientDisconnected || !graphDone) {
      logger.logEvent('warn', {
        tag: 'orchestrator',
        event: 'orchestrator_turn_aborted',
        sessionId: session.id,
        reason: clientDisconnected ? 'client_disconnected' : 'graph_incomplete',
      });
      return;
    }

    const { state: finalState, documentSummaries } = graphDone;

    // ── Synthesis ─────────────────────────────────────────────────────
    //
    // Two paths:
    //   (a) Direct response: planner answered without retrieval. Emit it
    //       as a single chunk (no LLM call — synth tokens = 0).
    //   (b) Retrieval path: stream synthesis tokens using the existing
    //       provider stream API.

    let fullText = '';
    let synthTokensUsed = 0;
    let synthWeightedTokens = 0;

    if (
      finalState.tasks.length === 0 &&
      finalState.directResponse &&
      finalState.directResponse.length > 0
    ) {
      fullText = finalState.directResponse;
      sseWrite(res, { type: 'chunk', text: fullText });
    } else {
      sseWrite(res, { type: 'synthesizing' });

      const synthPrompt = buildSynthesisPrompt({
        question: data.question,
        chatHistory: conversationHistory,
        retrievedContexts: finalState.retrievedContexts,
      });

      let synthStats = { tokensUsed: 0, weightedTokens: 0 };
      const stream = generateStreamWithFallback(
        synthPrompt,
        getSynthesisScenario(),
        (stats) => {
          synthStats = stats;
        },
        {
          tag: 'orchestrator',
          event: 'synthesis_call_completed',
          extra: { node: 'synthesis' },
        },
      );

      for await (const { chunk } of stream) {
        if (clientDisconnected) break;
        fullText += chunk;
        sseWrite(res, { type: 'chunk', text: chunk });
      }
      synthTokensUsed = synthStats.tokensUsed || 0;
      synthWeightedTokens = synthStats.weightedTokens || 0;
    }

    if (clientDisconnected) return;

    // ── Persist & account ─────────────────────────────────────────────

    const sources = buildSources(finalState.tasks, documentSummaries);

    const totalTokensUsed =
      synthTokensUsed +
      // The graph records weighted tokens in state; we don't have raw token
      // breakdowns per stage (each generateWithFallback returns both). For
      // a user-facing total we use weighted consistently.
      0;

    const totalWeightedTokens =
      (finalState.plannerTokens || 0) +
      (finalState.retrieverTokens || 0) +
      synthWeightedTokens;

    await prisma.orchestratorMessage.create({
      data: {
        sessionId: session.id,
        role: 'USER',
        content: data.question,
      },
    });
    await prisma.orchestratorMessage.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: fullText,
        sources: sources.length > 0 ? sources : undefined,
        planningTrace: {
          tasks: finalState.tasks,
          directResponse: finalState.directResponse,
        },
        stageTokens: {
          planner: finalState.plannerTokens || 0,
          retrievers: finalState.retrieverTokens || 0,
          synthesis: synthWeightedTokens,
        },
      },
    });

    await prisma.orchestratorSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    if (totalWeightedTokens > 0) {
      await recordTokenUsage(req.user.id, totalTokensUsed || totalWeightedTokens, totalWeightedTokens);
    }

    let sessionTitle = null;
    if (isNewSession && fullText) {
      sessionTitle = await generateSessionTitle(
        session.id,
        data.question,
        fullText,
        req.user.tier,
      );
    }

    sseWrite(res, {
      type: 'done',
      sessionId: session.id,
      sessionTitle,
      sources,
      tokensUsed: totalWeightedTokens,
      tokensRemaining: Math.max(0, tierCheck.remaining - totalWeightedTokens),
    });

    logger.logEvent('info', {
      tag: 'orchestrator',
      event: 'orchestrator_turn_completed',
      sessionId: session.id,
      taskCount: finalState.tasks.length,
      hasDirectResponse: !!finalState.directResponse,
      plannerWeightedTokens: finalState.plannerTokens || 0,
      retrieverWeightedTokens: finalState.retrieverTokens || 0,
      synthesisWeightedTokens: synthWeightedTokens,
      totalWeightedTokens,
      durationMs: Date.now() - turnStartMs,
    });

    res.end();
  } catch (error) {
    logger.logEvent('error', {
      tag: 'orchestrator',
      event: 'orchestrator_turn_failed',
      error: error.message,
      stack: error.stack,
      durationMs: Date.now() - turnStartMs,
    });

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: { message: error.message || 'Streaming failed' },
      });
    }
    sseWrite(res, { type: 'error', message: error.message || 'Streaming failed' });
    res.end();
  }
};

/**
 * GET /api/v1/classrooms/:classroomId/orchestrator-chat/sessions
 */
const listOrchestratorSessions = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;
  await verifyClassroomAccess(classroomId, req.user.id);

  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const cursor = req.query.cursor;

  const sessions = await prisma.orchestratorSession.findMany({
    where: { classroomId, userId: req.user.id },
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: {
      _count: { select: { messages: { where: { role: 'USER' } } } },
    },
  });

  const hasMore = sessions.length > limit;
  const items = hasMore ? sessions.slice(0, limit) : sessions;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  res.json({ success: true, data: { sessions: items, nextCursor } });
});

/**
 * GET /api/v1/classrooms/:classroomId/orchestrator-chat/sessions/:sessionId
 */
const getOrchestratorSession = asyncHandler(async (req, res) => {
  const { classroomId, sessionId } = req.params;
  await verifyClassroomAccess(classroomId, req.user.id);

  const session = await prisma.orchestratorSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!session) throw new NotFoundError('Orchestrator session');
  if (session.userId !== req.user.id || session.classroomId !== classroomId) {
    throw new AuthorizationError('You do not have access to this session');
  }

  res.json({ success: true, data: { session } });
});

/**
 * DELETE /api/v1/classrooms/:classroomId/orchestrator-chat/sessions/:sessionId
 * Deletes the session row AND its checkpointer thread.
 */
const deleteOrchestratorSession = asyncHandler(async (req, res) => {
  const { classroomId, sessionId } = req.params;
  await verifySessionAccess(sessionId, classroomId, req.user.id);

  await prisma.orchestratorSession.delete({ where: { id: sessionId } });
  // Fire-and-forget; checkpointer cleanup failures should not break the API.
  deleteCheckpointerThread(sessionId).catch(() => {});

  res.json({ success: true, data: { message: 'Session deleted' } });
});

module.exports = {
  sendOrchestratorMessageStream,
  listOrchestratorSessions,
  getOrchestratorSession,
  deleteOrchestratorSession,
};
