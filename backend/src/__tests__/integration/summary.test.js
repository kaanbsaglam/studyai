/**
 * Summary integration tests — ownership and tier gating across CRUD.
 */

jest.mock('../../services/summary.service', () => ({
  gatherDocumentsContentStructured: jest.fn().mockResolvedValue([
    { id: 'd1', name: 'doc.pdf', content: 'content content content' },
  ]),
  generateSummary: jest.fn().mockResolvedValue({
    summary: 'tl;dr',
    tokensUsed: 200,
    weightedTokens: 100,
    warnings: [],
  }),
  createSummary: jest.fn().mockImplementation(async (input) => ({ id: 's1', ...input })),
  getSummaryById: jest.fn(),
  getSummariesByClassroom: jest.fn().mockResolvedValue([]),
  deleteSummary: jest.fn().mockResolvedValue(undefined),
  updateSummary: jest.fn().mockImplementation(async (id, data) => ({ id, ...data })),
}));

const request = require('supertest');
const prisma = require('../../lib/prisma');
const summaryService = require('../../services/summary.service');
const {
  createSummaryHandler,
  getClassroomSummaries,
  getSummaryHandler,
  deleteSummaryHandler,
  createManualSummaryHandler,
  updateSummaryHandler,
} = require('../../controllers/summary.controller');
const {
  buildApp,
  injectUser,
  FREE_USER,
  OTHER_USER,
} = require('../helpers/app');

function makeApp(user = FREE_USER) {
  return buildApp((app) => {
    app.use(injectUser(user));
    app.post('/classrooms/:classroomId/summaries', createSummaryHandler);
    app.post('/classrooms/:classroomId/summaries/manual', createManualSummaryHandler);
    app.get('/classrooms/:classroomId/summaries', getClassroomSummaries);
    app.get('/summaries/:id', getSummaryHandler);
    app.delete('/summaries/:id', deleteSummaryHandler);
    app.put('/summaries/:id', updateSummaryHandler);
  });
}

const VALID_DOC_ID = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  jest.clearAllMocks();
  prisma.classroom.count.mockResolvedValue(0);
  prisma.document.aggregate.mockResolvedValue({ _sum: { size: 0 } });
  prisma.dailyUsage.findUnique.mockResolvedValue(null);
  prisma.dailyUsage.upsert.mockResolvedValue({});
});

describe('POST /classrooms/:id/summaries', () => {
  it('returns 403 when classroom belongs to another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: OTHER_USER.id, documents: [],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/summaries')
      .send({ title: 'T', length: 'short', focusTopic: 'x', documentIds: [] });
    expect(res.status).toBe(403);
    expect(summaryService.generateSummary).not.toHaveBeenCalled();
  });

  it('rejects general-knowledge without focusTopic', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/summaries')
      .send({ title: 'T', length: 'short', documentIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Focus topic/);
  });

  it('rejects when daily token quota exhausted', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [],
    });
    prisma.dailyUsage.findUnique.mockResolvedValue({ tokensUsed: 99_999_999 });
    const res = await request(makeApp())
      .post('/classrooms/c1/summaries')
      .send({ title: 'T', length: 'short', focusTopic: 'x', documentIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/limit reached/i);
  });

  it('rejects documentIds that are not in the classroom', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [{ id: 'd-other' }],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/summaries')
      .send({ title: 'T', length: 'short', documentIds: [VALID_DOC_ID] });
    expect(res.status).toBe(404);
  });

  it('creates summary and records token usage on success', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: FREE_USER.id, documents: [{ id: VALID_DOC_ID }],
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/summaries')
      .send({ title: 'T', length: 'short', documentIds: [VALID_DOC_ID] });
    expect(res.status).toBe(201);
    expect(summaryService.createSummary).toHaveBeenCalledWith(expect.objectContaining({
      userId: FREE_USER.id, classroomId: 'c1',
    }));
    expect(prisma.dailyUsage.upsert).toHaveBeenCalled();
  });
});

describe('Manual / GET / PUT / DELETE summary ownership', () => {
  it('manual create rejected for non-owner classroom', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: OTHER_USER.id });
    const res = await request(makeApp())
      .post('/classrooms/c1/summaries/manual')
      .send({ title: 'T', length: 'short', content: 'hi' });
    expect(res.status).toBe(403);
    expect(summaryService.createSummary).not.toHaveBeenCalled();
  });

  it('GET 403 when not owner', async () => {
    summaryService.getSummaryById.mockResolvedValue({ id: 's1', userId: OTHER_USER.id });
    expect((await request(makeApp()).get('/summaries/s1')).status).toBe(403);
  });

  it('PUT 403 when not owner — no update', async () => {
    summaryService.getSummaryById.mockResolvedValue({ id: 's1', userId: OTHER_USER.id });
    await request(makeApp()).put('/summaries/s1').send({ title: 'x' }).expect(403);
    expect(summaryService.updateSummary).not.toHaveBeenCalled();
  });

  it('DELETE 403 when not owner — no delete', async () => {
    summaryService.getSummaryById.mockResolvedValue({ id: 's1', userId: OTHER_USER.id });
    await request(makeApp()).delete('/summaries/s1').expect(403);
    expect(summaryService.deleteSummary).not.toHaveBeenCalled();
  });

  it('DELETE owner: deletes successfully', async () => {
    summaryService.getSummaryById.mockResolvedValue({ id: 's1', userId: FREE_USER.id });
    await request(makeApp()).delete('/summaries/s1').expect(200);
    expect(summaryService.deleteSummary).toHaveBeenCalledWith('s1');
  });

  it('classroom-list 403 when classroom belongs to another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: OTHER_USER.id });
    expect((await request(makeApp()).get('/classrooms/c1/summaries')).status).toBe(403);
  });
});
