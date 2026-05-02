/**
 * OrchestratorChat integration tests.
 *
 * Like chat.test.js but for the LangGraph-backed orchestrator. Covers the
 * non-streaming list/get/delete endpoints (full ownership matrix) plus the
 * pre-stream validation paths of sendOrchestratorMessageStream (token quota,
 * session ownership, classroom ownership) and a basic SSE-forwarding happy
 * path with the graph mocked as an async generator.
 */

jest.mock('../../services/orchestratorChat.service', () => ({
  runOrchestratorGraph: jest.fn(),
  buildSynthesisPrompt: jest.fn().mockReturnValue('synth prompt'),
  getSynthesisScenario: jest.fn().mockReturnValue('scenario'),
  buildSources: jest.fn().mockReturnValue([]),
  deleteThread: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/llm.service', () => ({
  generateText: jest.fn().mockResolvedValue({ text: 'Title', tokensUsed: 1 }),
  generateStreamWithFallback: jest.fn(),
  generateWithFallback: jest.fn(),
}));

const request = require('supertest');
const prisma = require('../../lib/prisma');
const orchestratorService = require('../../services/orchestratorChat.service');
const orch = require('../../controllers/orchestratorChat.controller');
const {
  buildApp,
  injectUser,
  FREE_USER,
  OTHER_USER,
} = require('../helpers/app');

const VALID_SESSION = '11111111-1111-4111-8111-111111111111';

function makeApp(user = FREE_USER) {
  return buildApp((app) => {
    app.use(injectUser(user));
    app.post('/classrooms/:classroomId/orchestrator-chat/messages/stream', orch.sendOrchestratorMessageStream);
    app.get('/classrooms/:classroomId/orchestrator-chat/sessions', orch.listOrchestratorSessions);
    app.get('/classrooms/:classroomId/orchestrator-chat/sessions/:sessionId', orch.getOrchestratorSession);
    app.delete('/classrooms/:classroomId/orchestrator-chat/sessions/:sessionId', orch.deleteOrchestratorSession);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.dailyUsage.findUnique.mockResolvedValue(null);
  prisma.classroom.count.mockResolvedValue(0);
  prisma.document.aggregate.mockResolvedValue({ _sum: { size: 0 } });
});

// ─── List / Get / Delete ──────────────────────────────────────────────

describe('GET /orchestrator-chat/sessions', () => {
  it('403 when classroom not owned', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: OTHER_USER.id });
    expect((await request(makeApp()).get('/classrooms/c1/orchestrator-chat/sessions')).status).toBe(403);
  });

  it('scopes findMany by user + classroom', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    prisma.orchestratorSession.findMany.mockResolvedValue([]);
    await request(makeApp()).get('/classrooms/c1/orchestrator-chat/sessions').expect(200);
    expect(prisma.orchestratorSession.findMany.mock.calls[0][0].where).toEqual({
      classroomId: 'c1', userId: FREE_USER.id,
    });
  });

  it('caps limit at 50 (clamps query.limit)', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    prisma.orchestratorSession.findMany.mockResolvedValue([]);
    await request(makeApp())
      .get('/classrooms/c1/orchestrator-chat/sessions?limit=999')
      .expect(200);
    // take = limit + 1, so 50 + 1
    expect(prisma.orchestratorSession.findMany.mock.calls[0][0].take).toBe(51);
  });
});

describe('GET /orchestrator-chat/sessions/:sessionId', () => {
  it('404 when session does not exist', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    prisma.orchestratorSession.findUnique.mockResolvedValue(null);
    expect((await request(makeApp()).get('/classrooms/c1/orchestrator-chat/sessions/s1')).status).toBe(404);
  });

  it('403 when session belongs to another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    prisma.orchestratorSession.findUnique.mockResolvedValue({
      id: 's1', userId: OTHER_USER.id, classroomId: 'c1', messages: [],
    });
    expect((await request(makeApp()).get('/classrooms/c1/orchestrator-chat/sessions/s1')).status).toBe(403);
  });

  it('403 when session belongs to a different classroom', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    prisma.orchestratorSession.findUnique.mockResolvedValue({
      id: 's1', userId: FREE_USER.id, classroomId: 'c-other', messages: [],
    });
    expect((await request(makeApp()).get('/classrooms/c1/orchestrator-chat/sessions/s1')).status).toBe(403);
  });

  it('200 for owner', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    prisma.orchestratorSession.findUnique.mockResolvedValue({
      id: 's1', userId: FREE_USER.id, classroomId: 'c1', messages: [],
    });
    const res = await request(makeApp()).get('/classrooms/c1/orchestrator-chat/sessions/s1');
    expect(res.status).toBe(200);
    expect(res.body.data.session.id).toBe('s1');
  });
});

describe('DELETE /orchestrator-chat/sessions/:sessionId', () => {
  it('403 when not owner — does NOT delete row or checkpointer', async () => {
    prisma.orchestratorSession.findUnique.mockResolvedValue({
      id: 's1', userId: OTHER_USER.id, classroomId: 'c1',
    });
    await request(makeApp()).delete('/classrooms/c1/orchestrator-chat/sessions/s1').expect(403);
    expect(prisma.orchestratorSession.delete).not.toHaveBeenCalled();
    expect(orchestratorService.deleteThread).not.toHaveBeenCalled();
  });

  it('owner success: deletes row and fires-and-forgets checkpointer cleanup', async () => {
    prisma.orchestratorSession.findUnique.mockResolvedValue({
      id: 's1', userId: FREE_USER.id, classroomId: 'c1',
    });
    prisma.orchestratorSession.delete.mockResolvedValue({});
    const res = await request(makeApp()).delete('/classrooms/c1/orchestrator-chat/sessions/s1');
    expect(res.status).toBe(200);
    expect(prisma.orchestratorSession.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    expect(orchestratorService.deleteThread).toHaveBeenCalledWith('s1');
  });

  it('still returns 200 if checkpointer cleanup throws (fire-and-forget)', async () => {
    prisma.orchestratorSession.findUnique.mockResolvedValue({
      id: 's1', userId: FREE_USER.id, classroomId: 'c1',
    });
    prisma.orchestratorSession.delete.mockResolvedValue({});
    orchestratorService.deleteThread.mockRejectedValueOnce(new Error('checkpoint down'));
    const res = await request(makeApp()).delete('/classrooms/c1/orchestrator-chat/sessions/s1');
    expect(res.status).toBe(200);
  });
});

// ─── Streaming pre-flight validation ───────────────────────────────────

describe('POST /orchestrator-chat/messages/stream — pre-stream validation', () => {
  it('returns 429 JSON when token quota exhausted (no graph run)', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    prisma.dailyUsage.findUnique.mockResolvedValue({ tokensUsed: 99_999_999 });
    const res = await request(makeApp())
      .post('/classrooms/c1/orchestrator-chat/messages/stream')
      .send({ question: 'hi' });
    expect(res.status).toBe(429);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(orchestratorService.runOrchestratorGraph).not.toHaveBeenCalled();
  });

  it('blocks request when classroom not owned (no graph run)', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: OTHER_USER.id });
    const res = await request(makeApp())
      .post('/classrooms/c1/orchestrator-chat/messages/stream')
      .send({ question: 'hi' });
    // Streaming controller's try/catch converts thrown AuthorizationError into
    // a JSON error response before headers are sent. The important security
    // invariant is that the graph never runs.
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(orchestratorService.runOrchestratorGraph).not.toHaveBeenCalled();
  });

  it('404 JSON when sessionId not found', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    prisma.orchestratorSession.findUnique.mockResolvedValue(null);
    const res = await request(makeApp())
      .post('/classrooms/c1/orchestrator-chat/messages/stream')
      .send({ question: 'hi', sessionId: VALID_SESSION });
    expect(res.status).toBe(404);
  });

  it('403 JSON when session owned by another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    prisma.orchestratorSession.findUnique.mockResolvedValue({
      id: VALID_SESSION, userId: OTHER_USER.id, classroomId: 'c1', messages: [],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/orchestrator-chat/messages/stream')
      .send({ question: 'hi', sessionId: VALID_SESSION });
    expect(res.status).toBe(403);
  });

  it('returns an error response (not SSE) on invalid input', async () => {
    // The streaming controller wraps everything in try/catch and returns
    // a JSON error before headers are sent — Zod errors surface as 500
    // in this path (no errorHandler middleware in the chain).
    const res = await request(makeApp())
      .post('/classrooms/c1/orchestrator-chat/messages/stream')
      .send({ question: '' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(orchestratorService.runOrchestratorGraph).not.toHaveBeenCalled();
  });
});

// ─── Streaming happy path (graph events forwarded as SSE) ──────────────

describe('POST /orchestrator-chat/messages/stream — SSE forwarding', () => {
  it('writes SSE for each graph event and ends (direct-response path)', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    prisma.orchestratorSession.create.mockResolvedValue({ id: 'sess-new' });
    prisma.orchestratorMessage.create.mockResolvedValue({});
    prisma.orchestratorSession.update.mockResolvedValue({});

    // graph_done with directResponse + zero tasks: controller emits the
    // direct response as a chunk and skips the synthesis stream entirely.
    orchestratorService.runOrchestratorGraph.mockReturnValue((async function* () {
      yield {
        type: 'graph_done',
        state: {
          tasks: [],
          retrievedContexts: [],
          directResponse: 'hello from planner',
          plannerTokens: 7,
          retrieverTokens: 0,
        },
        documentSummaries: [],
      };
    })());

    const res = await request(makeApp())
      .post('/classrooms/c1/orchestrator-chat/messages/stream')
      .send({ question: 'plan this' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/event-stream/);
    expect(res.text).toContain('"chunk"');
    expect(res.text).toContain('hello from planner');
    expect(orchestratorService.runOrchestratorGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess-new',
        question: 'plan this',
        classroomId: 'c1',
      }),
    );
    // USER + ASSISTANT messages persisted
    const roles = prisma.orchestratorMessage.create.mock.calls.map((c) => c[0].data.role);
    expect(roles).toEqual(['USER', 'ASSISTANT']);
  });
});
