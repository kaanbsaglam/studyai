/**
 * Flashcard integration tests — ownership across CRUD + progress
 * (save / reset / cross-set tampering).
 */

jest.mock('../../services/flashcard.service', () => ({
  gatherDocumentsContentStructured: jest.fn().mockResolvedValue([
    { id: 'd1', name: 'doc.pdf', content: 'content content content' },
  ]),
  generateFlashcards: jest.fn().mockResolvedValue({
    cards: [{ front: 'q', back: 'a' }],
    tokensUsed: 100, weightedTokens: 50, warnings: [],
  }),
  createFlashcardSet: jest.fn().mockImplementation(async (input) => ({ id: 'fs1', ...input })),
  getFlashcardSetById: jest.fn(),
  getFlashcardSetsByClassroom: jest.fn().mockResolvedValue([]),
  deleteFlashcardSet: jest.fn().mockResolvedValue(undefined),
  updateFlashcardSet: jest.fn().mockImplementation(async (id, data) => ({ id, ...data })),
  getFlashcardSetProgress: jest.fn().mockResolvedValue([]),
  saveCardProgress: jest.fn().mockImplementation(async (input) => ({ id: 'p1', ...input })),
  resetFlashcardSetProgress: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const prisma = require('../../lib/prisma');
const flashcardService = require('../../services/flashcard.service');
const {
  createFlashcardSetHandler,
  getFlashcardSetHandler,
  deleteFlashcardSetHandler,
  createManualFlashcardSetHandler,
  updateFlashcardSetHandler,
  getFlashcardSetProgressHandler,
  saveCardProgressHandler,
  resetFlashcardSetProgressHandler,
} = require('../../controllers/flashcard.controller');
const {
  buildApp,
  injectUser,
  FREE_USER,
  OTHER_USER,
} = require('../helpers/app');

const VALID_DOC = '11111111-1111-4111-8111-111111111111';
const VALID_CARD = '22222222-2222-4222-8222-222222222222';
const OTHER_CARD = '33333333-3333-4333-8333-333333333333';

function makeApp(user = FREE_USER) {
  return buildApp((app) => {
    app.use(injectUser(user));
    app.post('/classrooms/:classroomId/flashcard-sets', createFlashcardSetHandler);
    app.post('/classrooms/:classroomId/flashcard-sets/manual', createManualFlashcardSetHandler);
    app.get('/flashcard-sets/:id', getFlashcardSetHandler);
    app.put('/flashcard-sets/:id', updateFlashcardSetHandler);
    app.delete('/flashcard-sets/:id', deleteFlashcardSetHandler);
    app.get('/flashcard-sets/:id/progress', getFlashcardSetProgressHandler);
    app.post('/flashcard-sets/:id/progress', saveCardProgressHandler);
    app.delete('/flashcard-sets/:id/progress', resetFlashcardSetProgressHandler);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.classroom.count.mockResolvedValue(0);
  prisma.document.aggregate.mockResolvedValue({ _sum: { size: 0 } });
  prisma.dailyUsage.findUnique.mockResolvedValue(null);
  prisma.dailyUsage.upsert.mockResolvedValue({});
});

describe('Generate flashcard set', () => {
  it('rejects when classroom not owned', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: OTHER_USER.id, documents: [],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/flashcard-sets')
      .send({ title: 'F', count: 5, focusTopic: 'x', documentIds: [] });
    expect(res.status).toBe(403);
    expect(flashcardService.generateFlashcards).not.toHaveBeenCalled();
  });

  it('rejects general-knowledge without focusTopic', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/flashcard-sets')
      .send({ title: 'F', count: 5, documentIds: [] });
    expect(res.status).toBe(400);
  });

  it('count<5 fails validation', async () => {
    const res = await request(makeApp())
      .post('/classrooms/c1/flashcard-sets')
      .send({ title: 'F', count: 1, focusTopic: 'x', documentIds: [] });
    expect(res.status).toBe(400);
  });

  it('count>50 fails validation', async () => {
    const res = await request(makeApp())
      .post('/classrooms/c1/flashcard-sets')
      .send({ title: 'F', count: 51, focusTopic: 'x', documentIds: [] });
    expect(res.status).toBe(400);
  });

  it('rejects when daily token quota exhausted', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    prisma.dailyUsage.findUnique.mockResolvedValue({ tokensUsed: 99_999_999 });
    const res = await request(makeApp())
      .post('/classrooms/c1/flashcard-sets')
      .send({ title: 'F', count: 5, focusTopic: 'x', documentIds: [] });
    expect(res.status).toBe(400);
  });

  it('creates and records tokens on success', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [{ id: VALID_DOC }],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/flashcard-sets')
      .send({ title: 'F', count: 5, documentIds: [VALID_DOC] });
    expect(res.status).toBe(201);
    expect(flashcardService.createFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
      userId: FREE_USER.id, classroomId: 'c1',
    }));
    expect(prisma.dailyUsage.upsert).toHaveBeenCalled();
  });
});

describe('Manual create / GET / PUT / DELETE', () => {
  it('manual create rejected for non-owner', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: OTHER_USER.id });
    const res = await request(makeApp())
      .post('/classrooms/c1/flashcard-sets/manual')
      .send({ title: 'F', cards: [{ front: 'q', back: 'a' }] });
    expect(res.status).toBe(403);
    expect(flashcardService.createFlashcardSet).not.toHaveBeenCalled();
  });

  it('GET 403 when not owner', async () => {
    flashcardService.getFlashcardSetById.mockResolvedValue({ id: 'fs1', userId: OTHER_USER.id, cards: [] });
    expect((await request(makeApp()).get('/flashcard-sets/fs1')).status).toBe(403);
  });

  it('PUT 403 when not owner — no update', async () => {
    flashcardService.getFlashcardSetById.mockResolvedValue({ id: 'fs1', userId: OTHER_USER.id, cards: [] });
    await request(makeApp()).put('/flashcard-sets/fs1').send({ title: 'x' }).expect(403);
    expect(flashcardService.updateFlashcardSet).not.toHaveBeenCalled();
  });

  it('DELETE 403 when not owner — no delete', async () => {
    flashcardService.getFlashcardSetById.mockResolvedValue({ id: 'fs1', userId: OTHER_USER.id, cards: [] });
    await request(makeApp()).delete('/flashcard-sets/fs1').expect(403);
    expect(flashcardService.deleteFlashcardSet).not.toHaveBeenCalled();
  });

  it('DELETE owner success', async () => {
    flashcardService.getFlashcardSetById.mockResolvedValue({ id: 'fs1', userId: FREE_USER.id, cards: [] });
    await request(makeApp()).delete('/flashcard-sets/fs1').expect(200);
    expect(flashcardService.deleteFlashcardSet).toHaveBeenCalledWith('fs1');
  });
});

describe('Card progress endpoints', () => {
  it('GET progress 403 when not owner', async () => {
    flashcardService.getFlashcardSetById.mockResolvedValue({ id: 'fs1', userId: OTHER_USER.id, cards: [] });
    expect((await request(makeApp()).get('/flashcard-sets/fs1/progress')).status).toBe(403);
  });

  it('POST progress 403 when not owner', async () => {
    flashcardService.getFlashcardSetById.mockResolvedValue({ id: 'fs1', userId: OTHER_USER.id, cards: [] });
    await request(makeApp())
      .post('/flashcard-sets/fs1/progress')
      .send({ flashcardId: VALID_CARD, correct: true })
      .expect(403);
    expect(flashcardService.saveCardProgress).not.toHaveBeenCalled();
  });

  it('POST progress 400 when card does not belong to this set', async () => {
    flashcardService.getFlashcardSetById.mockResolvedValue({
      id: 'fs1', userId: FREE_USER.id, cards: [{ id: VALID_CARD }],
    });
    const res = await request(makeApp())
      .post('/flashcard-sets/fs1/progress')
      .send({ flashcardId: OTHER_CARD, correct: true });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/does not belong/);
  });

  it('POST progress 200 when card belongs to set', async () => {
    flashcardService.getFlashcardSetById.mockResolvedValue({
      id: 'fs1', userId: FREE_USER.id, cards: [{ id: VALID_CARD }],
    });
    const res = await request(makeApp())
      .post('/flashcard-sets/fs1/progress')
      .send({ flashcardId: VALID_CARD, correct: true });
    expect(res.status).toBe(200);
    expect(flashcardService.saveCardProgress).toHaveBeenCalledWith(expect.objectContaining({
      flashcardId: VALID_CARD,
      flashcardSetId: 'fs1',
      userId: FREE_USER.id,
    }));
  });

  it('DELETE progress 403 when not owner — no reset', async () => {
    flashcardService.getFlashcardSetById.mockResolvedValue({ id: 'fs1', userId: OTHER_USER.id, cards: [] });
    await request(makeApp()).delete('/flashcard-sets/fs1/progress').expect(403);
    expect(flashcardService.resetFlashcardSetProgress).not.toHaveBeenCalled();
  });

  it('DELETE progress owner success', async () => {
    flashcardService.getFlashcardSetById.mockResolvedValue({ id: 'fs1', userId: FREE_USER.id, cards: [] });
    await request(makeApp()).delete('/flashcard-sets/fs1/progress').expect(200);
    expect(flashcardService.resetFlashcardSetProgress).toHaveBeenCalledWith('fs1', FREE_USER.id);
  });
});
