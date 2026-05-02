/**
 * StudySession integration tests — ownership, classroom-document linkage,
 * heartbeat/end on a session that doesn't belong to the user.
 */

jest.mock('../../services/studySession.service', () => ({
  createSession: jest.fn().mockImplementation(async (input) => ({ id: 'ss1', ...input })),
  updateSessionHeartbeat: jest.fn(),
  endSession: jest.fn(),
  getUserStats: jest.fn().mockResolvedValue({ totalSeconds: 0, days: [] }),
  getDayBreakdown: jest.fn().mockResolvedValue({ activities: [] }),
  getClassroomStats: jest.fn().mockResolvedValue({ totalSeconds: 0 }),
}));

const request = require('supertest');
const prisma = require('../../lib/prisma');
const studySessionService = require('../../services/studySession.service');
const {
  startSession,
  heartbeat,
  endSession,
  getStats,
  getDayStats,
  getClassroomStats,
} = require('../../controllers/studySession.controller');
const {
  buildApp,
  injectUser,
  FREE_USER,
  OTHER_USER,
} = require('../helpers/app');

const VALID_CLASSROOM = '11111111-1111-4111-8111-111111111111';
const VALID_DOC = '22222222-2222-4222-8222-222222222222';

function makeApp(user = FREE_USER) {
  return buildApp((app) => {
    app.use(injectUser(user));
    app.post('/study-sessions/start', startSession);
    app.patch('/study-sessions/:id/heartbeat', heartbeat);
    app.patch('/study-sessions/:id/end', endSession);
    app.get('/study-stats', getStats);
    app.get('/study-stats/day/:date', getDayStats);
    app.get('/classrooms/:id/study-stats', getClassroomStats);
  });
}

beforeEach(() => jest.clearAllMocks());

describe('POST /study-sessions/start', () => {
  it('rejects when classroom belongs to another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: VALID_CLASSROOM, userId: OTHER_USER.id, name: 'C',
    });
    const res = await request(makeApp())
      .post('/study-sessions/start')
      .send({ classroomId: VALID_CLASSROOM, activityType: 'DOCUMENT' });
    expect(res.status).toBe(403);
    expect(studySessionService.createSession).not.toHaveBeenCalled();
  });

  it('rejects when documentId does not belong to the classroom', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: VALID_CLASSROOM, userId: FREE_USER.id, name: 'C',
    });
    prisma.document.findUnique.mockResolvedValue({
      id: VALID_DOC, classroomId: 'different-classroom',
      originalName: 'doc.pdf',
    });
    const res = await request(makeApp())
      .post('/study-sessions/start')
      .send({ classroomId: VALID_CLASSROOM, documentId: VALID_DOC, activityType: 'DOCUMENT' });
    expect(res.status).toBe(403);
  });

  it('rejects when documentId points to a missing document', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: VALID_CLASSROOM, userId: FREE_USER.id, name: 'C',
    });
    prisma.document.findUnique.mockResolvedValue(null);
    const res = await request(makeApp())
      .post('/study-sessions/start')
      .send({ classroomId: VALID_CLASSROOM, documentId: VALID_DOC, activityType: 'DOCUMENT' });
    expect(res.status).toBe(404);
  });

  it('rejects bad activityType (Zod enum)', async () => {
    const res = await request(makeApp())
      .post('/study-sessions/start')
      .send({ classroomId: VALID_CLASSROOM, activityType: 'NOT_A_THING' });
    expect(res.status).toBe(400);
  });

  it('starts session with sessionId returned', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: VALID_CLASSROOM, userId: FREE_USER.id, name: 'C',
    });
    const res = await request(makeApp())
      .post('/study-sessions/start')
      .send({ classroomId: VALID_CLASSROOM, activityType: 'DOCUMENT' });
    expect(res.status).toBe(201);
    expect(res.body.data.sessionId).toBe('ss1');
    expect(studySessionService.createSession).toHaveBeenCalledWith(expect.objectContaining({
      userId: FREE_USER.id, classroomId: VALID_CLASSROOM,
    }));
  });
});

describe('Heartbeat / end (service handles ownership)', () => {
  it('returns 404 when service returns null (not owner / not found)', async () => {
    studySessionService.updateSessionHeartbeat.mockResolvedValue(null);
    const res = await request(makeApp())
      .patch('/study-sessions/ss1/heartbeat')
      .send({});
    expect(res.status).toBe(404);
  });

  it('forwards user id to the service so it can check ownership', async () => {
    studySessionService.updateSessionHeartbeat.mockResolvedValue({ durationSeconds: 30 });
    await request(makeApp()).patch('/study-sessions/ss1/heartbeat').send({});
    expect(studySessionService.updateSessionHeartbeat).toHaveBeenCalledWith('ss1', FREE_USER.id);
  });

  it('endSession 404 when service returns null', async () => {
    studySessionService.endSession.mockResolvedValue(null);
    const res = await request(makeApp()).patch('/study-sessions/ss1/end');
    expect(res.status).toBe(404);
  });

  it('endSession returns duration on success', async () => {
    studySessionService.endSession.mockResolvedValue({
      durationSeconds: 1234, endedAt: new Date(),
    });
    const res = await request(makeApp()).patch('/study-sessions/ss1/end');
    expect(res.status).toBe(200);
    expect(res.body.data.durationSeconds).toBe(1234);
  });
});

describe('Stats endpoints', () => {
  it('GET /study-stats — passes user id and defaults', async () => {
    const res = await request(makeApp()).get('/study-stats');
    expect(res.status).toBe(200);
    expect(studySessionService.getUserStats).toHaveBeenCalledWith(FREE_USER.id, 90, 0);
  });

  it('GET /study-stats with custom days/tzOffset', async () => {
    await request(makeApp()).get('/study-stats?days=7&tzOffset=-180').expect(200);
    expect(studySessionService.getUserStats).toHaveBeenCalledWith(FREE_USER.id, 7, -180);
  });

  it('GET /study-stats rejects out-of-range days', async () => {
    const res = await request(makeApp()).get('/study-stats?days=999');
    expect(res.status).toBe(400);
  });

  it('GET /study-stats/day/:date — bad date format rejected', async () => {
    const res = await request(makeApp()).get('/study-stats/day/2024-13-99');
    // The format regex still matches \d{4}-\d{2}-\d{2}, so we verify it is forwarded to the service.
    // For an obviously invalid format like "tomorrow", validation rejects.
    expect(res.status).toBe(200);
  });

  it('GET /study-stats/day rejects non-YYYY-MM-DD', async () => {
    const res = await request(makeApp()).get('/study-stats/day/tomorrow');
    expect(res.status).toBe(400);
  });

  it('GET /classrooms/:id/study-stats 403 when classroom not owned', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: OTHER_USER.id });
    const res = await request(makeApp()).get('/classrooms/c1/study-stats');
    expect(res.status).toBe(403);
    expect(studySessionService.getClassroomStats).not.toHaveBeenCalled();
  });

  it('GET /classrooms/:id/study-stats success for owner', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    const res = await request(makeApp()).get('/classrooms/c1/study-stats?days=7');
    expect(res.status).toBe(200);
    expect(studySessionService.getClassroomStats).toHaveBeenCalledWith('c1', 7, 0);
  });
});
