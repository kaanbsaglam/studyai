/**
 * Orchestrator Chat Service
 *
 * LangGraph-based orchestrator-worker chat (PREMIUM-only).
 *
 *   planner → (conditional) → N parallel retrievers → END
 *   planner → (direct response path)                 → END
 *
 * Synthesis is performed OUTSIDE the graph so the controller can stream
 * tokens via the existing provider abstraction. The graph captures the
 * interesting reasoning trace (planner decision, per-retriever extractions)
 * in the Postgres checkpointer, keyed by OrchestratorSession.id.
 */

const { StateGraph, Annotation, Send, START, END } = require('@langchain/langgraph');
const { generateWithFallback } = require('./llm.service');
const { generateEmbedding, querySimilar } = require('./embedding.service');
const prisma = require('../lib/prisma');
const llmConfig = require('../config/llm.config');
const logger = require('../config/logger');
const { loadPrompt } = require('../prompts/loader');
const { getCheckpointer, ensureSetup, deleteThread } = require('../lib/orchestratorCheckpointer');

// ─── Constants ─────────────────────────────────────────────────────────

const MAX_TASKS = 10;
const RETRIEVER_CHUNK_TOP_K = 15;
const RETRIEVER_SIMILARITY_THRESHOLD = 0.4;
const MAX_HISTORY_MESSAGES = 20;
// Hard cap on concatenated full-doc content per retriever task. Exceeding
// this triggers a transparent fallback to chunks mode so the retriever LLM
// stays well inside its context window and PREMIUM quotas don't burn.
const MAX_FULL_MODE_CHARS = 200000;

const PLANNER_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          documentIds: {
            type: 'array',
            items: { type: 'string' },
          },
          mode: { type: 'string', enum: ['chunks', 'full'] },
        },
        required: ['query', 'documentIds', 'mode'],
      },
    },
    directResponse: { type: 'string' },
  },
  required: ['tasks', 'directResponse'],
};

// ─── State ─────────────────────────────────────────────────────────────

const concatReducer = (a, b) => (a || []).concat(b || []);
const sumReducer = (a, b) => (a || 0) + (b || 0);

const OrchestratorState = Annotation.Root({
  question: Annotation(),
  classroomId: Annotation(),
  chatHistory: Annotation({ default: () => [] }),
  documentSummaries: Annotation({ default: () => [] }),

  tasks: Annotation({ default: () => [] }),
  directResponse: Annotation({ default: () => '' }),

  retrievedContexts: Annotation({
    reducer: concatReducer,
    default: () => [],
  }),

  plannerTokens: Annotation({ default: () => 0 }),
  retrieverTokens: Annotation({
    reducer: sumReducer,
    default: () => 0,
  }),
});

// ─── Helpers ───────────────────────────────────────────────────────────

function formatSummaries(summaries) {
  if (!summaries || summaries.length === 0) return '';
  return summaries
    .map((s) => {
      const topics = s.topics && s.topics.length > 0 ? s.topics.join(', ') : '—';
      const summary =
        s.summary && s.summary.trim().length > 0
          ? s.summary
          : '(no summary available — use the filename as a weak signal)';
      const sizeHint =
        typeof s.chunkCount === 'number' ? ` [${s.chunkCount} chunks]` : '';
      return `- "${s.name}" (id: ${s.docId})${sizeHint}\n  Summary: ${summary}\n  Topics: ${topics}`;
    })
    .join('\n');
}

function formatHistory(history) {
  if (!history || history.length === 0) return '';
  return history
    .map((m) => `${m.role === 'user' || m.role === 'USER' ? 'Student' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
}

function formatRetrievedContexts(contexts) {
  if (!contexts || contexts.length === 0) return '(no information retrieved)';
  return contexts
    .map((c) => `[Query: "${c.query}"]\n${c.result}`)
    .join('\n\n---\n\n');
}

// ─── Nodes ─────────────────────────────────────────────────────────────

async function plannerNode(state) {
  const scenario = llmConfig.tiers.PREMIUM.orchestrator.planner;

  const prompt = loadPrompt('orchestrator/planner', {
    question: state.question,
    documentSummaries: formatSummaries(state.documentSummaries),
    chatHistory: formatHistory(state.chatHistory),
    maxTasks: String(MAX_TASKS),
  });

  const { text, tokensUsed, weightedTokens } = await generateWithFallback(prompt, scenario, {
    schema: PLANNER_SCHEMA,
    tag: 'orchestrator',
    event: 'planner_call_completed',
    extra: { node: 'planner' },
  });

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    logger.logEvent('error', {
      tag: 'orchestrator',
      event: 'planner_parse_failed',
      error: err.message,
      textPreview: text.slice(0, 300),
    });
    return {
      tasks: [],
      directResponse:
        "I ran into a problem planning my response. Could you try rephrasing your question?",
      plannerTokens: weightedTokens,
    };
  }

  // Defensive: only accept docIds that actually belong to this session's summaries.
  const validDocIds = new Set(state.documentSummaries.map((d) => d.docId));

  const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks.slice(0, MAX_TASKS) : [];
  const tasks = rawTasks
    .map((t) => ({
      query: typeof t.query === 'string' ? t.query.trim() : '',
      documentIds: Array.isArray(t.documentIds)
        ? [...new Set(t.documentIds.filter((id) => validDocIds.has(id)))]
        : [],
      mode: t.mode === 'full' ? 'full' : 'chunks',
    }))
    .filter((t) => t.query.length > 0 && t.documentIds.length > 0);

  const directResponse =
    typeof parsed.directResponse === 'string' ? parsed.directResponse.trim() : '';

  logger.logEvent('info', {
    tag: 'orchestrator',
    event: 'planner_decided',
    taskCount: tasks.length,
    hasDirectResponse: !!directResponse,
    tokensUsed,
    weightedTokens,
  });

  return {
    tasks,
    directResponse,
    plannerTokens: weightedTokens,
  };
}

async function retrieverNode(state) {
  const scenario = llmConfig.tiers.PREMIUM.orchestrator.retriever;
  const { query, documentIds, mode } = state;
  // Mode is set by the planner per task. We re-default defensively here in
  // case the planner output bypassed sanitization (or a future caller).
  let effectiveMode = mode === 'full' ? 'full' : 'chunks';

  if (!query || !Array.isArray(documentIds) || documentIds.length === 0) {
    return {
      retrievedContexts: [
        {
          query: query || '',
          result: 'NO RELEVANT INFORMATION FOUND',
          documentIds: documentIds || [],
          mode: effectiveMode,
        },
      ],
      retrieverTokens: 0,
    };
  }

  let chunks = [];

  if (effectiveMode === 'full') {
    // Full-doc mode: load every chunk for the assigned docs, ordered by
    // (documentId, position) so concatenation reconstructs each doc in
    // reading order. If the result busts the size cap, transparently fall
    // back to chunks mode — the LLM context window and PREMIUM cost both
    // benefit from the bound.
    try {
      const allChunks = await prisma.documentChunk.findMany({
        where: { documentId: { in: documentIds } },
        orderBy: [{ documentId: 'asc' }, { position: 'asc' }],
        include: { document: { select: { id: true, originalName: true } } },
      });
      const totalChars = allChunks.reduce((s, c) => s + (c.content?.length || 0), 0);
      if (totalChars > MAX_FULL_MODE_CHARS) {
        logger.logEvent('warn', {
          tag: 'orchestrator',
          event: 'retriever_full_mode_oversized_fallback',
          query,
          documentIds,
          totalChars,
          cap: MAX_FULL_MODE_CHARS,
        });
        effectiveMode = 'chunks';
      } else {
        chunks = allChunks;
      }
    } catch (err) {
      logger.logEvent('error', {
        tag: 'orchestrator',
        event: 'retriever_full_mode_load_failed',
        error: err.message,
        query,
        documentIds,
      });
      effectiveMode = 'chunks';
    }
  }

  if (effectiveMode === 'chunks') {
    // Chunk-level retrieval: embed the sub-query, filter Pinecone to this
    // retriever's assigned documents, take top-K relevant chunks.
    try {
      const queryEmbedding = await generateEmbedding(query);
      const matches = await querySimilar(queryEmbedding, {
        topK: RETRIEVER_CHUNK_TOP_K,
        documentIds,
      });
      const relevant = matches.filter((m) => m.score >= RETRIEVER_SIMILARITY_THRESHOLD);

      if (relevant.length > 0) {
        const chunkRows = await prisma.documentChunk.findMany({
          where: { pineconeId: { in: relevant.map((m) => m.id) } },
          include: { document: { select: { id: true, originalName: true } } },
        });
        const rowMap = new Map(chunkRows.map((c) => [c.pineconeId, c]));
        chunks = relevant
          .map((m) => rowMap.get(m.id))
          .filter(Boolean);
      }
    } catch (err) {
      logger.logEvent('error', {
        tag: 'orchestrator',
        event: 'retriever_failed',
        error: err.message,
        query,
      });
    }
  }

  if (chunks.length === 0) {
    logger.logEvent('info', {
      tag: 'orchestrator',
      event: 'retriever_no_chunks',
      query,
      documentIds,
      mode: effectiveMode,
    });
    return {
      retrievedContexts: [
        { query, result: 'NO RELEVANT INFORMATION FOUND', documentIds, mode: effectiveMode },
      ],
      retrieverTokens: 0,
    };
  }

  const chunksText = chunks
    .map((c) => `[${c.document.originalName}]: ${c.content}`)
    .join('\n\n');

  const prompt = loadPrompt('orchestrator/retriever', {
    query,
    documentChunks: chunksText,
  });

  const { text, tokensUsed, weightedTokens } = await generateWithFallback(prompt, scenario, {
    tag: 'orchestrator',
    event: 'retriever_call_completed',
    extra: { node: 'retriever', mode: effectiveMode },
  });

  logger.logEvent('info', {
    tag: 'orchestrator',
    event: 'retriever_completed',
    query,
    docCount: documentIds.length,
    chunkCount: chunks.length,
    mode: effectiveMode,
    tokensUsed,
    weightedTokens,
  });

  return {
    retrievedContexts: [
      {
        query,
        result: text.trim(),
        documentIds,
        mode: effectiveMode,
      },
    ],
    retrieverTokens: weightedTokens,
  };
}

// ─── Routing ───────────────────────────────────────────────────────────

function routeAfterPlanner(state) {
  if (!state.tasks || state.tasks.length === 0) {
    return END;
  }
  return state.tasks.map(
    (task) =>
      new Send('retriever', {
        query: task.query,
        documentIds: task.documentIds,
        mode: task.mode,
      }),
  );
}

// ─── Graph Factory ─────────────────────────────────────────────────────

let compiledGraph = null;

function getGraph() {
  if (compiledGraph) return compiledGraph;
  const checkpointer = getCheckpointer();
  compiledGraph = new StateGraph(OrchestratorState)
    .addNode('planner', plannerNode)
    .addNode('retriever', retrieverNode)
    .addEdge(START, 'planner')
    .addConditionalEdges('planner', routeAfterPlanner, ['retriever', END])
    .addEdge('retriever', END)
    .compile({ checkpointer });
  logger.logEvent('info', {
    tag: 'orchestrator',
    event: 'orchestrator_graph_compiled',
  });
  return compiledGraph;
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Gather { docId, name, summary, topics } for every READY document in the
 * classroom. The orchestrator pattern delegates document selection to the
 * planner, so we always expose the full classroom surface.
 * Documents currently being upgraded are skipped (reprocessingAt != null).
 * Docs without topicMetadata get empty summary/topics — the planner prompt
 * handles filename fallback.
 */
async function buildClassroomDocumentSummaries(classroomId) {
  if (!classroomId) return [];
  const docs = await prisma.document.findMany({
    where: {
      classroomId,
      status: 'READY',
      reprocessingAt: null,
    },
    select: {
      id: true,
      originalName: true,
      topicMetadata: true,
      _count: { select: { chunks: true } },
    },
  });
  return docs.map((d) => ({
    docId: d.id,
    name: d.originalName,
    summary: d.topicMetadata?.summary || '',
    topics: d.topicMetadata?.topics || [],
    chunkCount: d._count?.chunks ?? 0,
  }));
}

/**
 * Run the orchestrator graph as an async generator of structured events.
 *
 * Yields:
 *   { type: 'planning_done', tasks, directResponse, plannerTokens }
 *   { type: 'retriever_done', query, resultExcerpt, documentIds, tokens }
 *   { type: 'graph_done', state: { tasks, directResponse, retrievedContexts,
 *       plannerTokens, retrieverTokens }, documentSummaries }
 */
async function* runOrchestratorGraph({
  sessionId,
  question,
  classroomId,
  chatHistory,
}) {
  await ensureSetup();
  const graph = getGraph();

  const documentSummaries = await buildClassroomDocumentSummaries(classroomId);
  const trimmedHistory = (chatHistory || []).slice(-MAX_HISTORY_MESSAGES);

  const input = {
    question,
    classroomId,
    chatHistory: trimmedHistory,
    documentSummaries,
  };

  const config = {
    configurable: { thread_id: sessionId },
    streamMode: 'updates',
  };

  const stream = await graph.stream(input, config);

  for await (const chunk of stream) {
    // `chunk` is a map: { nodeName: partialState }
    for (const [nodeName, update] of Object.entries(chunk || {})) {
      if (nodeName === 'planner') {
        yield {
          type: 'planning_done',
          tasks: update.tasks || [],
          directResponse: update.directResponse || '',
          plannerTokens: update.plannerTokens || 0,
        };
      } else if (nodeName === 'retriever') {
        const ctx = (update.retrievedContexts || [])[0];
        if (ctx) {
          yield {
            type: 'retriever_done',
            query: ctx.query,
            resultExcerpt: (ctx.result || '').slice(0, 200),
            documentIds: ctx.documentIds,
            mode: ctx.mode,
            tokens: update.retrieverTokens || 0,
          };
        }
      }
    }
  }

  // Fetch final consolidated state from the checkpointer
  const snapshot = await graph.getState({ configurable: { thread_id: sessionId } });
  const finalValues = snapshot?.values || {};

  yield {
    type: 'graph_done',
    state: {
      tasks: finalValues.tasks || [],
      directResponse: finalValues.directResponse || '',
      retrievedContexts: finalValues.retrievedContexts || [],
      plannerTokens: finalValues.plannerTokens || 0,
      retrieverTokens: finalValues.retrieverTokens || 0,
    },
    documentSummaries,
  };
}

/**
 * Build the synthesis prompt. The controller calls the provider stream
 * with this prompt to generate the user-facing answer token-by-token.
 */
function buildSynthesisPrompt({ question, chatHistory, retrievedContexts }) {
  return loadPrompt('orchestrator/synthesis', {
    question,
    chatHistory: formatHistory((chatHistory || []).slice(-MAX_HISTORY_MESSAGES)),
    retrievedContexts: formatRetrievedContexts(retrievedContexts),
  });
}

function getSynthesisScenario() {
  return llmConfig.tiers.PREMIUM.orchestrator.synthesis;
}

/**
 * Sources = every document the orchestrator investigated across all tasks.
 * (Design choice: coarse but consistent with how the standard RAG chat
 * presents sources.)
 */
function buildSources(tasks, documentSummaries) {
  const docIds = new Set();
  for (const task of tasks || []) {
    for (const id of task.documentIds || []) docIds.add(id);
  }
  const sumMap = new Map(documentSummaries.map((s) => [s.docId, s.name]));
  return [...docIds].map((id) => ({
    documentId: id,
    filename: sumMap.get(id) || 'Unknown',
  }));
}

module.exports = {
  runOrchestratorGraph,
  buildSynthesisPrompt,
  getSynthesisScenario,
  buildSources,
  deleteThread,
  MAX_TASKS,
};
