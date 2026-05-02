/**
 * Chat integration tests.
 *
 * Covers:
 *   - sendMessage (non-streaming RAG): ownership, doc-classroom linkage,
 *     token quota, session persistence (USER + ASSISTANT messages saved).
 *   - listSessions / getSession / deleteSession / addDocuments: ownership.
 *   - sendMessageStream pre-stream validation paths (429 quota, 404 missing
 *     session, 403 session not owned). Full SSE happy path is intentionally
 *     not asserted — the pre-stream guards are the security-critical surface.
 */

jest.mock('../../services/rag.service', () => ({
  queryAndAnswer: jest.fn().mockResolvedValue({
    answer: 'the answer',
    sources: [{ documentId: 'd1', filename: 'doc.pdf', score: 0.9 }],
    hasRelevantContext: true,
    tokensUsed: 100,
    weightedTokens: 50,
  }),
  queryAndStream: jest.fn(),
}));
jest.mock('../../services/llm.service', () => ({
  generateText: jest.fn().mockResolvedValue({ text: 'Generated Title', tokensUsed: 5 }),
  generateWithFallback: jest.fn(),
  generateStreamWithFallback: jest.fn(),
}));

const request = require('supertest');
const prisma = require('../../lib/prisma');
const { queryAndAnswer } = require('../../services/rag.service');
const {
  buildApp,
  injectUser,
  FREE_USER,
  OTHER_USER,
} = require('../helpers/app');

// Pull the controller AFTER mocks are set up
const chat = require('../../controllers/chat.controller');

const VALID_DOC = '11111111-1111-4111-8111-111111111111';
const OTHER_DOC = '22222222-2222-4222-8222-222222222222';
const VALID_SESSION = '33333333-3333-4333-8333-333333333333';

function makeApp(user = FREE_USER) {
  return buildApp((app) => {
    app.use(injectUser(user));
    app.post('/classrooms/:classroomId/chat/messages', chat.sendMessage);
    app.post('/classrooms/:classroomId/chat/messages/stream', chat.sendMessageStream);
    app.get('/classrooms/:classroomId/chat/sessions', chat.listSessions);
    app.get('/classrooms/:classroomId/chat/sessions/:sessionId', chat.getSession);
    app.delete('/classrooms/:classroomId/chat/sessions/:sessionId', chat.deleteSession);
    app.patch('/classrooms/:classroomId/chat/sessions/:sessionId/documents', chat.addDocuments);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.dailyUsage.findUnique.mockResolvedValue(null);
  prisma.dailyUsage.upsert.mockResolvedValue({});
  prisma.classroom.count.mockResolvedValue(0);
  prisma.document.aggregate.mockResolvedValue({ _sum: { size: 0 } });
});

// ─── sendMessage (non-streaming) ──────────────────────────────────────

describe('POST /classrooms/:id/chat/messages', () => {
  it('rejects when classroom belongs to another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: OTHER_USER.id, documents: [],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/chat/messages')
      .send({ question: 'hi', documentIds: [] });
    expect(res.status).toBe(403);
    expect(queryAndAnswer).not.toHaveBeenCalled();
  });

  it('rejects when documentId does not belong to the classroom', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [{ id: VALID_DOC }],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/chat/messages')
      .send({ question: 'hi', documentIds: [OTHER_DOC] });
    expect(res.status).toBe(404);
    expect(queryAndAnswer).not.toHaveBeenCalled();
  });

  it('rejects when daily token quota exhausted (no LLM call)', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    prisma.dailyUsage.findUnique.mockResolvedValue({ tokensUsed: 99_999_999 });
    const res = await request(makeApp())
      .post('/classrooms/c1/chat/messages')
      .send({ question: 'hi', documentIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/limit reached/i);
    expect(queryAndAnswer).not.toHaveBeenCalled();
  });

  it('rejects loading a session owned by another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    prisma.chatSession.findUnique.mockResolvedValue({
      id: VALID_SESSION,
      userId: OTHER_USER.id,
      classroomId: 'c1',
      messages: [],
      documents: [],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/chat/messages')
      .send({ question: 'hi', sessionId: VALID_SESSION, documentIds: [] });
    expect(res.status).toBe(403);
  });

  it('rejects loading a session belonging to a different classroom', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    prisma.chatSession.findUnique.mockResolvedValue({
      id: VALID_SESSION,
      userId: FREE_USER.id,
      classroomId: 'c-other',
      messages: [],
      documents: [],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/chat/messages')
      .send({ question: 'hi', sessionId: VALID_SESSION, documentIds: [] });
    expect(res.status).toBe(403);
  });

  it('creates new session, persists USER + ASSISTANT messages, records tokens', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [{ id: VALID_DOC }],
    });
    prisma.chatSession.create.mockResolvedValue({ id: 'sess-new' });
    prisma.chatMessage.create.mockResolvedValue({});
    prisma.chatSession.update.mockResolvedValue({});
    // For title generation (issued for new sessions)
    prisma.chatSession.update.mockResolvedValue({});

    const res = await request(makeApp())
      .post('/classrooms/c1/chat/messages')
      .send({ question: 'what is rag?', documentIds: [VALID_DOC] });

    expect(res.status).toBe(200);
    expect(res.body.data.sessionId).toBe('sess-new');
    expect(res.body.data.answer).toBe('the answer');
    expect(queryAndAnswer).toHaveBeenCalledWith(expect.objectContaining({
      classroomId: 'c1',
      tier: 'FREE',
    }));
    // USER and ASSISTANT messages persisted in order
    expect(prisma.chatMessage.create).toHaveBeenCalledTimes(2);
    expect(prisma.chatMessage.create.mock.calls[0][0].data.role).toBe('USER');
    expect(prisma.chatMessage.create.mock.calls[1][0].data.role).toBe('ASSISTANT');
    expect(prisma.dailyUsage.upsert).toHaveBeenCalled();
  });

  it('does not record tokens when service returns tokensUsed=0', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    prisma.chatSession.create.mockResolvedValue({ id: 'sess-new' });
    prisma.chatMessage.create.mockResolvedValue({});
    prisma.chatSession.update.mockResolvedValue({});
    queryAndAnswer.mockResolvedValueOnce({
      answer: 'cached',
      sources: [],
      hasRelevantContext: false,
      tokensUsed: 0,
      weightedTokens: 0,
    });

    await request(makeApp())
      .post('/classrooms/c1/chat/messages')
      .send({ question: 'hi', documentIds: [] })
      .expect(200);
    expect(prisma.dailyUsage.upsert).not.toHaveBeenCalled();
  });

  it('rejects empty / oversize question (Zod)', async () => {
    expect((await request(makeApp())
      .post('/classrooms/c1/chat/messages')
      .send({ question: '', documentIds: [] })).status).toBe(400);

    expect((await request(makeApp())
      .post('/classrooms/c1/chat/messages')
      .send({ question: 'x'.repeat(1001), documentIds: [] })).status).toBe(400);
  });
});

// ─── List / Get / Delete / AddDocuments ────────────────────────────────

describe('Session CRUD ownership', () => {
  it('listSessions scopes findMany by user + classroom', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    prisma.chatSession.findMany.mockResolvedValue([]);
    await request(makeApp()).get('/classrooms/c1/chat/sessions').expect(200);
    expect(prisma.chatSession.findMany.mock.calls[0][0].where).toEqual({
      classroomId: 'c1', userId: FREE_USER.id,
    });
  });

  it('listSessions 403 when classroom not owned', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: OTHER_USER.id, documents: [] });
    expect((await request(makeApp()).get('/classrooms/c1/chat/sessions')).status).toBe(403);
  });

  it('getSession 403 when session belongs to another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id, documents: [] });
    prisma.chatSession.findUnique.mockResolvedValue({
      id: 's1', userId: OTHER_USER.id, classroomId: 'c1', messages: [], documents: [],
    });
    expect((await request(makeApp()).get('/classrooms/c1/chat/sessions/s1')).status).toBe(403);
  });

  it('getSession 403 when session belongs to a different classroom', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id, documents: [] });
    prisma.chatSession.findUnique.mockResolvedValue({
      id: 's1', userId: FREE_USER.id, classroomId: 'c-other', messages: [], documents: [],
    });
    expect((await request(makeApp()).get('/classrooms/c1/chat/sessions/s1')).status).toBe(403);
  });

  it('deleteSession 403 when not owner — does NOT delete', async () => {
    prisma.chatSession.findUnique.mockResolvedValue({
      id: 's1', userId: OTHER_USER.id, classroomId: 'c1',
    });
    await request(makeApp()).delete('/classrooms/c1/chat/sessions/s1').expect(403);
    expect(prisma.chatSession.delete).not.toHaveBeenCalled();
  });

  it('deleteSession owner success', async () => {
    prisma.chatSession.findUnique.mockResolvedValue({
      id: 's1', userId: FREE_USER.id, classroomId: 'c1',
    });
    prisma.chatSession.delete.mockResolvedValue({});
    await request(makeApp()).delete('/classrooms/c1/chat/sessions/s1').expect(200);
    expect(prisma.chatSession.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });

  it('addDocuments 403 when session not owned', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [{ id: VALID_DOC }],
    });
    prisma.chatSession.findUnique.mockResolvedValue({
      id: 's1', userId: OTHER_USER.id, classroomId: 'c1',
    });
    const res = await request(makeApp())
      .patch('/classrooms/c1/chat/sessions/s1/documents')
      .send({ documentIds: [VALID_DOC] });
    expect(res.status).toBe(403);
    expect(prisma.chatSession.update).not.toHaveBeenCalled();
  });

  it('addDocuments 404 when documentId not in classroom', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [{ id: VALID_DOC }],
    });
    prisma.chatSession.findUnique.mockResolvedValue({
      id: 's1', userId: FREE_USER.id, classroomId: 'c1',
    });
    const res = await request(makeApp())
      .patch('/classrooms/c1/chat/sessions/s1/documents')
      .send({ documentIds: [OTHER_DOC] });
    expect(res.status).toBe(404);
  });

  it('addDocuments connects new docs for owner', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [{ id: VALID_DOC }],
    });
    prisma.chatSession.findUnique.mockResolvedValue({
      id: 's1', userId: FREE_USER.id, classroomId: 'c1',
    });
    prisma.chatSession.update.mockResolvedValue({ documents: [{ id: VALID_DOC, originalName: 'doc.pdf' }] });
    const res = await request(makeApp())
      .patch('/classrooms/c1/chat/sessions/s1/documents')
      .send({ documentIds: [VALID_DOC] });
    expect(res.status).toBe(200);
    expect(prisma.chatSession.update).toHaveBeenCalled();
  });
});

// ─── Streaming pre-flight validation ───────────────────────────────────

describe('POST /chat/messages/stream — pre-stream validation', () => {
  it('returns 429 JSON (not SSE) when token quota exhausted', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    prisma.dailyUsage.findUnique.mockResolvedValue({ tokensUsed: 99_999_999 });
    const res = await request(makeApp())
      .post('/classrooms/c1/chat/messages/stream')
      .send({ question: 'hi', documentIds: [] });
    expect(res.status).toBe(429);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('returns 404 JSON when sessionId not found (before stream open)', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    prisma.chatSession.findUnique.mockResolvedValue(null);
    const res = await request(makeApp())
      .post('/classrooms/c1/chat/messages/stream')
      .send({ question: 'hi', sessionId: VALID_SESSION, documentIds: [] });
    expect(res.status).toBe(404);
  });

  it('returns 403 JSON when session owned by another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    prisma.chatSession.findUnique.mockResolvedValue({
      id: VALID_SESSION, userId: OTHER_USER.id, classroomId: 'c1',
      messages: [], documents: [],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/chat/messages/stream')
      .send({ question: 'hi', sessionId: VALID_SESSION, documentIds: [] });
    expect(res.status).toBe(403);
  });

  it('returns 404 JSON when document not in classroom', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [{ id: VALID_DOC }],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/chat/messages/stream')
      .send({ question: 'hi', documentIds: [OTHER_DOC] });
    expect(res.status).toBe(404);
  });
});

// ─── Streaming happy path (basic SSE chunk forwarding) ─────────────────

describe('POST /chat/messages/stream — SSE happy path', () => {
  it('writes SSE chunk + done events and persists messages', async () => {
    const { queryAndStream } = require('../../services/rag.service');
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    prisma.chatSession.create.mockResolvedValue({ id: 'sess-new' });
    prisma.chatMessage.create.mockResolvedValue({});
    prisma.chatSession.update.mockResolvedValue({});

    queryAndStream.mockResolvedValue({
      stream: (async function* () {
        yield { chunk: 'foo' };
        yield { chunk: 'bar' };
      })(),
      sources: [],
      hasRelevantContext: false,
      getStats: () => ({ tokensUsed: 10, weightedTokens: 5 }),
    });

    const res = await request(makeApp())
      .post('/classrooms/c1/chat/messages/stream')
      .send({ question: 'hi', documentIds: [] });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/event-stream/);
    // Body contains both SSE data lines
    expect(res.text).toContain('data: ');
    expect(res.text).toContain('"chunk"');
    expect(res.text).toContain('foo');
    expect(res.text).toContain('bar');
    expect(res.text).toContain('"done"');
    // ASSISTANT content concatenates the chunks
    const assistantSave = prisma.chatMessage.create.mock.calls
      .find((c) => c[0].data.role === 'ASSISTANT');
    expect(assistantSave[0].data.content).toBe('foobar');
    expect(prisma.dailyUsage.upsert).toHaveBeenCalled();
  });
});
