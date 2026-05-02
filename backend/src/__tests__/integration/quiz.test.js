/**
 * Quiz integration tests — focused on ownership, validation, and tier limits.
 *
 * The AI generation path (`generateQuiz`) is mocked to keep the tests
 * focused on controller logic.
 */

jest.mock('../../services/quiz.service', () => ({
  gatherDocumentsContentStructured: jest.fn().mockResolvedValue([
    { id: 'd1', name: 'doc.pdf', content: 'hello world content here.' },
  ]),
  generateQuiz: jest.fn().mockResolvedValue({
    questions: [{ question: 'q?', correctAnswer: 'a', wrongAnswers: ['b', 'c', 'd'] }],
    tokensUsed: 100,
    weightedTokens: 50,
    warnings: [],
  }),
  createQuizSet: jest.fn().mockImplementation(async (input) => ({ id: 'qs1', ...input })),
  getQuizSetById: jest.fn(),
  getQuizSetsByClassroom: jest.fn(),
  deleteQuizSet: jest.fn().mockResolvedValue(undefined),
  recordQuizAttempt: jest.fn().mockImplementation(async (input) => ({ id: 'a1', ...input })),
  getQuizAttempts: jest.fn().mockResolvedValue([]),
  updateQuizSet: jest.fn(),
}));

const request = require('supertest');
const prisma = require('../../lib/prisma');
const quizService = require('../../services/quiz.service');
const {
  createQuizSetHandler,
  getClassroomQuizSets,
  getQuizSetHandler,
  deleteQuizSetHandler,
  recordAttemptHandler,
  createManualQuizSetHandler,
} = require('../../controllers/quiz.controller');
const {
  buildApp,
  injectUser,
  FREE_USER,
  PREMIUM_USER,
  OTHER_USER,
} = require('../helpers/app');

function makeApp(user = FREE_USER) {
  return buildApp((app) => {
    app.use(injectUser(user));
    app.post('/classrooms/:classroomId/quiz-sets', createQuizSetHandler);
    app.post('/classrooms/:classroomId/quiz-sets/manual', createManualQuizSetHandler);
    app.get('/classrooms/:classroomId/quiz-sets', getClassroomQuizSets);
    app.get('/quiz-sets/:id', getQuizSetHandler);
    app.delete('/quiz-sets/:id', deleteQuizSetHandler);
    app.post('/quiz-sets/:id/attempts', recordAttemptHandler);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.classroom.count.mockResolvedValue(0);
  prisma.document.aggregate.mockResolvedValue({ _sum: { size: 0 } });
  prisma.dailyUsage.findUnique.mockResolvedValue(null);
  prisma.dailyUsage.upsert.mockResolvedValue({});
});

const VALID_DOC_ID = '11111111-1111-4111-8111-111111111111';

describe('POST /classrooms/:classroomId/quiz-sets — generate', () => {
  it('returns 404 when classroom not found', async () => {
    prisma.classroom.findUnique.mockResolvedValue(null);
    const res = await request(makeApp())
      .post('/classrooms/c1/quiz-sets')
      .send({ title: 'Q', count: 5, focusTopic: 'biology', documentIds: [] });
    expect(res.status).toBe(404);
  });

  it('rejects when classroom belongs to another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: OTHER_USER.id, documents: [],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/quiz-sets')
      .send({ title: 'Q', count: 5, focusTopic: 'biology', documentIds: [] });
    expect(res.status).toBe(403);
    expect(quizService.generateQuiz).not.toHaveBeenCalled();
  });

  it('rejects general-knowledge generation without focusTopic', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/quiz-sets')
      .send({ title: 'Q', count: 5, documentIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Focus topic/);
  });

  it('rejects documentIds that do not belong to the classroom', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id,
      documents: [{ id: 'other-doc' }],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/quiz-sets')
      .send({ title: 'Q', count: 5, documentIds: [VALID_DOC_ID] });
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found/i);
  });

  it('rejects when daily token quota exhausted', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    prisma.dailyUsage.findUnique.mockResolvedValue({ tokensUsed: 999_999 });

    const res = await request(makeApp())
      .post('/classrooms/c1/quiz-sets')
      .send({ title: 'Q', count: 5, focusTopic: 'biology', documentIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/limit reached/i);
    expect(quizService.generateQuiz).not.toHaveBeenCalled();
  });

  it('records token usage and creates quiz set on success', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id,
      documents: [{ id: VALID_DOC_ID }],
    });

    const res = await request(makeApp())
      .post('/classrooms/c1/quiz-sets')
      .send({ title: 'Q', count: 5, documentIds: [VALID_DOC_ID] });

    expect(res.status).toBe(201);
    expect(quizService.generateQuiz).toHaveBeenCalled();
    expect(prisma.dailyUsage.upsert).toHaveBeenCalled();
    expect(quizService.createQuizSet).toHaveBeenCalledWith(expect.objectContaining({
      classroomId: 'c1',
      userId: FREE_USER.id,
    }));
  });

  it('rejects count below 5 (validation)', async () => {
    const res = await request(makeApp())
      .post('/classrooms/c1/quiz-sets')
      .send({ title: 'Q', count: 3, focusTopic: 'biology', documentIds: [] });
    expect(res.status).toBe(400);
  });

  it('rejects count above 30 (validation)', async () => {
    const res = await request(makeApp())
      .post('/classrooms/c1/quiz-sets')
      .send({ title: 'Q', count: 31, focusTopic: 'biology', documentIds: [] });
    expect(res.status).toBe(400);
  });
});

describe('POST /classrooms/:classroomId/quiz-sets/manual', () => {
  it('rejects manual creation when classroom belongs to another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: OTHER_USER.id });
    const res = await request(makeApp())
      .post('/classrooms/c1/quiz-sets/manual')
      .send({
        title: 'M',
        questions: [{ question: 'q?', correctAnswer: 'a', wrongAnswers: ['b', 'c', 'd'] }],
      });
    expect(res.status).toBe(403);
    expect(quizService.createQuizSet).not.toHaveBeenCalled();
  });

  it('creates manual quiz set for owner', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    const res = await request(makeApp())
      .post('/classrooms/c1/quiz-sets/manual')
      .send({
        title: 'M',
        questions: [{ question: 'q?', correctAnswer: 'a', wrongAnswers: ['b', 'c', 'd'] }],
      });
    expect(res.status).toBe(201);
    expect(quizService.createQuizSet).toHaveBeenCalled();
  });
});

describe('GET /quiz-sets/:id, DELETE /quiz-sets/:id', () => {
  it('GET 403 when not owner', async () => {
    quizService.getQuizSetById.mockResolvedValue({ id: 'qs1', userId: OTHER_USER.id });
    const res = await request(makeApp()).get('/quiz-sets/qs1');
    expect(res.status).toBe(403);
  });

  it('GET 404 when missing', async () => {
    quizService.getQuizSetById.mockResolvedValue(null);
    const res = await request(makeApp()).get('/quiz-sets/qs1');
    expect(res.status).toBe(404);
  });

  it('DELETE 403 when not owner — does NOT delete', async () => {
    quizService.getQuizSetById.mockResolvedValue({ id: 'qs1', userId: OTHER_USER.id });
    const res = await request(makeApp()).delete('/quiz-sets/qs1');
    expect(res.status).toBe(403);
    expect(quizService.deleteQuizSet).not.toHaveBeenCalled();
  });

  it('DELETE 200 for owner', async () => {
    quizService.getQuizSetById.mockResolvedValue({ id: 'qs1', userId: FREE_USER.id });
    const res = await request(makeApp()).delete('/quiz-sets/qs1');
    expect(res.status).toBe(200);
    expect(quizService.deleteQuizSet).toHaveBeenCalledWith('qs1');
  });
});

describe('POST /quiz-sets/:id/attempts', () => {
  it('rejects attempt for someone else’s quiz', async () => {
    quizService.getQuizSetById.mockResolvedValue({ id: 'qs1', userId: OTHER_USER.id });
    const res = await request(makeApp())
      .post('/quiz-sets/qs1/attempts')
      .send({ score: 5, totalQuestions: 5 });
    expect(res.status).toBe(403);
  });

  it('rejects score > totalQuestions', async () => {
    quizService.getQuizSetById.mockResolvedValue({ id: 'qs1', userId: FREE_USER.id });
    const res = await request(makeApp())
      .post('/quiz-sets/qs1/attempts')
      .send({ score: 10, totalQuestions: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/cannot exceed/);
  });

  it('records valid attempt', async () => {
    quizService.getQuizSetById.mockResolvedValue({ id: 'qs1', userId: FREE_USER.id });
    const res = await request(makeApp())
      .post('/quiz-sets/qs1/attempts')
      .send({ score: 3, totalQuestions: 5 });
    expect(res.status).toBe(201);
    expect(quizService.recordQuizAttempt).toHaveBeenCalledWith({
      quizSetId: 'qs1', score: 3, totalQuestions: 5,
    });
  });
});
