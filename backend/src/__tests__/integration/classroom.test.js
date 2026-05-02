/**
 * Classroom integration tests.
 *
 * Focuses on ownership enforcement (the highest-risk surface) plus tier limits,
 * NotFound vs Forbidden ordering, and S3/Pinecone cleanup on classroom delete.
 *
 * S3, embedding, and tier services are mocked at the module level.
 */

jest.mock('../../services/s3.service', () => ({
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/embedding.service', () => ({
  deleteVectorsByDocument: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const prisma = require('../../lib/prisma');
const {
  createClassroom,
  getClassrooms,
  getClassroom,
  updateClassroom,
  deleteClassroom,
} = require('../../controllers/classroom.controller');
const { deleteFile } = require('../../services/s3.service');
const { deleteVectorsByDocument } = require('../../services/embedding.service');
const {
  buildApp,
  injectUser,
  FREE_USER,
  OTHER_USER,
} = require('../helpers/app');

function makeApp(user = FREE_USER) {
  return buildApp((app) => {
    app.use(injectUser(user));
    app.post('/classrooms', createClassroom);
    app.get('/classrooms', getClassrooms);
    app.get('/classrooms/:id', getClassroom);
    app.patch('/classrooms/:id', updateClassroom);
    app.delete('/classrooms/:id', deleteClassroom);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // canCreateClassroom depends on these via tier.service
  prisma.classroom.count.mockResolvedValue(0);
  prisma.document.aggregate.mockResolvedValue({ _sum: { size: 0 } });
  prisma.dailyUsage.findUnique.mockResolvedValue(null);
});

describe('POST /classrooms', () => {
  it('creates classroom for the calling user (201)', async () => {
    prisma.classroom.create.mockResolvedValue({
      id: 'c1', name: 'Math', description: null, userId: FREE_USER.id,
    });

    const res = await request(makeApp())
      .post('/classrooms')
      .send({ name: 'Math' });

    expect(res.status).toBe(201);
    expect(res.body.data.classroom.id).toBe('c1');
    const arg = prisma.classroom.create.mock.calls[0][0];
    expect(arg.data.userId).toBe(FREE_USER.id);
  });

  it('rejects when classroom limit reached (FREE = 5)', async () => {
    prisma.classroom.count.mockResolvedValue(5);

    const res = await request(makeApp())
      .post('/classrooms')
      .send({ name: 'Math' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toMatch(/maximum|FREE/);
    expect(prisma.classroom.create).not.toHaveBeenCalled();
  });

  it('rejects empty name', async () => {
    const res = await request(makeApp())
      .post('/classrooms')
      .send({ name: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /classrooms/:id', () => {
  it('returns 404 when classroom does not exist', async () => {
    prisma.classroom.findUnique.mockResolvedValue(null);
    const res = await request(makeApp()).get('/classrooms/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when classroom belongs to another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1',
      userId: OTHER_USER.id,
      documents: [],
      _count: {},
    });
    const res = await request(makeApp()).get('/classrooms/c1');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('returns the classroom (and isUpgradeable on each doc) for owner', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1',
      userId: FREE_USER.id,
      documents: [
        { id: 'd1', mimeType: 'application/pdf', extractionMethod: 'TEXT_ONLY', topicMetadata: null, status: 'READY' },
      ],
      _count: {},
    });

    const res = await request(makeApp()).get('/classrooms/c1');
    expect(res.status).toBe(200);
    expect(res.body.data.classroom.id).toBe('c1');
    expect(res.body.data.classroom.documents[0]).toHaveProperty('isUpgradeable');
    // FREE user cannot upgrade
    expect(res.body.data.classroom.documents[0].isUpgradeable).toBe(false);
  });
});

describe('PATCH /classrooms/:id', () => {
  it('returns 403 if classroom belongs to another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: OTHER_USER.id });
    const res = await request(makeApp())
      .patch('/classrooms/c1')
      .send({ name: 'New name' });
    expect(res.status).toBe(403);
    expect(prisma.classroom.update).not.toHaveBeenCalled();
  });

  it('updates only provided fields', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    prisma.classroom.update.mockResolvedValue({
      id: 'c1', name: 'New name', description: null, userId: FREE_USER.id,
    });

    await request(makeApp())
      .patch('/classrooms/c1')
      .send({ name: 'New name' })
      .expect(200);

    const arg = prisma.classroom.update.mock.calls[0][0];
    expect(arg.data).toEqual({ name: 'New name' });
    expect(arg.data).not.toHaveProperty('description');
  });

  it('passes null description through to clear it', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    prisma.classroom.update.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    await request(makeApp())
      .patch('/classrooms/c1')
      .send({ description: null })
      .expect(200);
    expect(prisma.classroom.update.mock.calls[0][0].data).toEqual({ description: null });
  });
});

describe('DELETE /classrooms/:id', () => {
  it('returns 403 when not owner — does NOT delete S3 / Pinecone / row', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1', userId: OTHER_USER.id, documents: [{ id: 'd1', s3Key: 'k1' }],
    });
    const res = await request(makeApp()).delete('/classrooms/c1');
    expect(res.status).toBe(403);
    expect(deleteFile).not.toHaveBeenCalled();
    expect(deleteVectorsByDocument).not.toHaveBeenCalled();
    expect(prisma.classroom.delete).not.toHaveBeenCalled();
  });

  it('cleans up every document on delete', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1',
      userId: FREE_USER.id,
      documents: [
        { id: 'd1', s3Key: 'k1' },
        { id: 'd2', s3Key: 'k2' },
      ],
    });
    prisma.classroom.delete.mockResolvedValue({});

    const res = await request(makeApp()).delete('/classrooms/c1');
    expect(res.status).toBe(200);
    expect(deleteFile).toHaveBeenCalledTimes(2);
    expect(deleteFile).toHaveBeenCalledWith('k1');
    expect(deleteFile).toHaveBeenCalledWith('k2');
    expect(deleteVectorsByDocument).toHaveBeenCalledTimes(2);
    expect(prisma.classroom.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('still deletes the classroom row even if S3 cleanup fails', async () => {
    deleteFile.mockRejectedValueOnce(new Error('s3 down'));
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1',
      userId: FREE_USER.id,
      documents: [{ id: 'd1', s3Key: 'k1' }],
    });
    prisma.classroom.delete.mockResolvedValue({});

    const res = await request(makeApp()).delete('/classrooms/c1');
    expect(res.status).toBe(200);
    expect(prisma.classroom.delete).toHaveBeenCalled();
  });

  it('still deletes the classroom row even if Pinecone cleanup fails', async () => {
    deleteVectorsByDocument.mockRejectedValueOnce(new Error('pinecone down'));
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'c1',
      userId: FREE_USER.id,
      documents: [{ id: 'd1', s3Key: 'k1' }],
    });
    prisma.classroom.delete.mockResolvedValue({});

    const res = await request(makeApp()).delete('/classrooms/c1');
    expect(res.status).toBe(200);
    expect(prisma.classroom.delete).toHaveBeenCalled();
  });
});

describe('GET /classrooms', () => {
  it('only lists classrooms owned by the calling user', async () => {
    prisma.classroom.findMany.mockResolvedValue([
      { id: 'c1', userId: FREE_USER.id, _count: { documents: 0 } },
    ]);
    await request(makeApp()).get('/classrooms').expect(200);
    expect(prisma.classroom.findMany.mock.calls[0][0].where).toEqual({ userId: FREE_USER.id });
  });
});
