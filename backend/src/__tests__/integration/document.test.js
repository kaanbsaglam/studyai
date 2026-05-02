/**
 * Document integration tests.
 *
 * Covers ownership, tier limits, upload validation, S3/Pinecone interaction,
 * download URL, reprocess gating, and PREMIUM-only upgrade.
 *
 * Mocks: s3.service, embedding.service, queue, search.service, documentUpgrade.service.
 */

jest.mock('../../services/s3.service', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  getPresignedUrl: jest.fn().mockResolvedValue('https://signed.example/x'),
}));
jest.mock('../../services/embedding.service', () => ({
  deleteVectorsByDocument: jest.fn().mockResolvedValue(undefined),
  deleteVectorsByIds: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../lib/queue', () => ({
  addDocumentProcessingJob: jest.fn().mockResolvedValue(undefined),
  documentQueue: {
    getJob: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock('../../services/search.service', () => ({
  searchDocuments: jest.fn().mockResolvedValue([{ documentId: 'd1', score: 0.9 }]),
}));
jest.mock('../../services/documentUpgrade.service', () => {
  const real = jest.requireActual('../../services/documentUpgrade.service');
  return {
    ...real,
    performUpgrade: jest.fn().mockResolvedValue(undefined),
  };
});

const request = require('supertest');
const prisma = require('../../lib/prisma');
const {
  uploadDocument,
  getDocuments,
  getDocument,
  getDownloadUrl,
  deleteDocument,
  reprocessDocument,
  upgradeDocument,
  searchDocumentsInClassroom,
} = require('../../controllers/document.controller');
const { uploadFile, deleteFile, getPresignedUrl } = require('../../services/s3.service');
const { addDocumentProcessingJob } = require('../../lib/queue');
const { performUpgrade } = require('../../services/documentUpgrade.service');
const { searchDocuments } = require('../../services/search.service');
const {
  buildApp,
  injectUser,
  FREE_USER,
  PREMIUM_USER,
  OTHER_USER,
} = require('../helpers/app');

// Build a fake "multer" middleware that takes a JSON-encoded file from a header
// so we don't need actual multipart handling in tests.
function fakeMulter() {
  return (req, res, next) => {
    if (req.headers['x-test-file']) {
      const { name, type, size, content } = JSON.parse(req.headers['x-test-file']);
      req.file = {
        originalname: name,
        mimetype: type,
        size,
        buffer: Buffer.from(content || 'hello world'),
      };
    }
    next();
  };
}

function makeApp(user = FREE_USER) {
  return buildApp((app) => {
    app.use(injectUser(user));
    app.post('/classrooms/:classroomId/documents', fakeMulter(), uploadDocument);
    app.get('/classrooms/:classroomId/documents', getDocuments);
    app.get('/classrooms/:classroomId/documents/search', searchDocumentsInClassroom);
    app.get('/documents/:id', getDocument);
    app.get('/documents/:id/download', getDownloadUrl);
    app.delete('/documents/:id', deleteDocument);
    app.post('/documents/:id/reprocess', reprocessDocument);
    app.post('/documents/:id/upgrade', upgradeDocument);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.classroom.count.mockResolvedValue(0);
  prisma.document.aggregate.mockResolvedValue({ _sum: { size: 0 } });
  prisma.dailyUsage.findUnique.mockResolvedValue(null);
});

const PDF = (overrides = {}) =>
  JSON.stringify({
    name: 'doc.pdf',
    type: 'application/pdf',
    size: 1024,
    content: 'pdf-content',
    ...overrides,
  });

describe('POST /classrooms/:classroomId/documents — upload', () => {
  it('rejects when no file', async () => {
    const res = await request(makeApp())
      .post('/classrooms/c1/documents');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/No file/);
  });

  it('rejects unsupported MIME type', async () => {
    const res = await request(makeApp())
      .post('/classrooms/c1/documents')
      .set('x-test-file', JSON.stringify({
        name: 'a.exe', type: 'application/x-msdownload', size: 100, content: 'x',
      }));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Invalid file type/);
  });

  it('rejects file exceeding 50MB', async () => {
    const res = await request(makeApp())
      .post('/classrooms/c1/documents')
      .set('x-test-file', PDF({ size: 51 * 1024 * 1024 }));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/too large/);
  });

  it('rejects audio upload from FREE user (PREMIUM-only)', async () => {
    const res = await request(makeApp())
      .post('/classrooms/c1/documents')
      .set('x-test-file', JSON.stringify({
        name: 'song.mp3', type: 'audio/mpeg', size: 1024, content: 'x',
      }));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/premium/i);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('allows audio upload from PREMIUM user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: PREMIUM_USER.id });
    uploadFile.mockResolvedValue({ key: 'k1', filename: 'song.mp3' });
    prisma.document.create.mockResolvedValue({ id: 'd1' });

    const res = await request(makeApp(PREMIUM_USER))
      .post('/classrooms/c1/documents')
      .set('x-test-file', JSON.stringify({
        name: 'song.mp3', type: 'audio/mpeg', size: 1024, content: 'x',
      }));
    expect(res.status).toBe(201);
    expect(uploadFile).toHaveBeenCalled();
    expect(addDocumentProcessingJob).toHaveBeenCalledWith('d1');
  });

  it('rejects when storage limit reached', async () => {
    prisma.document.aggregate.mockResolvedValue({
      _sum: { size: 100 * 1024 * 1024 - 100 }, // FREE limit minus 100B
    });
    const res = await request(makeApp())
      .post('/classrooms/c1/documents')
      .set('x-test-file', PDF({ size: 200 }));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Storage limit/);
  });

  it('returns 404 when classroom not found', async () => {
    prisma.classroom.findUnique.mockResolvedValue(null);
    const res = await request(makeApp())
      .post('/classrooms/c1/documents')
      .set('x-test-file', PDF());
    expect(res.status).toBe(404);
  });

  it('returns 403 when classroom belongs to another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: OTHER_USER.id });
    const res = await request(makeApp())
      .post('/classrooms/c1/documents')
      .set('x-test-file', PDF());
    expect(res.status).toBe(403);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('uploads to S3 and queues job on success', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    uploadFile.mockResolvedValue({ key: 'k1', filename: 'doc.pdf' });
    prisma.document.create.mockResolvedValue({ id: 'd1', filename: 'doc.pdf' });

    const res = await request(makeApp())
      .post('/classrooms/c1/documents')
      .set('x-test-file', PDF());

    expect(res.status).toBe(201);
    expect(uploadFile).toHaveBeenCalled();
    const createArg = prisma.document.create.mock.calls[0][0];
    expect(createArg.data.userId).toBe(FREE_USER.id);
    expect(createArg.data.classroomId).toBe('c1');
    expect(createArg.data.status).toBe('PENDING');
    expect(addDocumentProcessingJob).toHaveBeenCalledWith('d1');
  });
});

describe('GET /documents/:id', () => {
  it('returns 404 when not found', async () => {
    prisma.document.findUnique.mockResolvedValue(null);
    const res = await request(makeApp()).get('/documents/d1');
    expect(res.status).toBe(404);
  });

  it('returns 403 when document owned by another user', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'd1', userId: OTHER_USER.id, classroom: {}, chunks: [],
    });
    const res = await request(makeApp()).get('/documents/d1');
    expect(res.status).toBe(403);
  });

  it('returns the document with isUpgradeable for owner', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'd1', userId: FREE_USER.id, mimeType: 'application/pdf',
      status: 'READY', extractionMethod: 'TEXT_ONLY', topicMetadata: null,
      classroom: {}, chunks: [],
    });
    const res = await request(makeApp()).get('/documents/d1');
    expect(res.status).toBe(200);
    expect(res.body.data.document).toHaveProperty('isUpgradeable', false);
  });
});

describe('GET /documents/:id/download', () => {
  it('returns 403 if not owner — never signs URL', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'd1', userId: OTHER_USER.id });
    const res = await request(makeApp()).get('/documents/d1/download');
    expect(res.status).toBe(403);
    expect(getPresignedUrl).not.toHaveBeenCalled();
  });

  it('returns presigned URL for owner', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'd1', userId: FREE_USER.id, s3Key: 'k1',
    });
    const res = await request(makeApp()).get('/documents/d1/download');
    expect(res.status).toBe(200);
    expect(res.body.data.url).toBe('https://signed.example/x');
    expect(getPresignedUrl).toHaveBeenCalledWith('k1');
  });
});

describe('DELETE /documents/:id', () => {
  it('returns 403 when not owner — does NOT delete', async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 'd1', userId: OTHER_USER.id });
    const res = await request(makeApp()).delete('/documents/d1');
    expect(res.status).toBe(403);
    expect(deleteFile).not.toHaveBeenCalled();
    expect(prisma.document.delete).not.toHaveBeenCalled();
  });

  it('deletes from S3 + Pinecone + DB on success', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'd1', userId: FREE_USER.id, s3Key: 'k1',
    });
    prisma.document.delete.mockResolvedValue({});

    const res = await request(makeApp()).delete('/documents/d1');
    expect(res.status).toBe(200);
    expect(deleteFile).toHaveBeenCalledWith('k1');
    expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
  });

  it('proceeds with DB delete even if S3 fails', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'd1', userId: FREE_USER.id, s3Key: 'k1',
    });
    deleteFile.mockRejectedValueOnce(new Error('s3 fail'));
    prisma.document.delete.mockResolvedValue({});

    const res = await request(makeApp()).delete('/documents/d1');
    expect(res.status).toBe(200);
    expect(prisma.document.delete).toHaveBeenCalled();
  });
});

describe('POST /documents/:id/reprocess', () => {
  it('rejects when document is not in FAILED state', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'd1', userId: FREE_USER.id, status: 'READY',
    });
    const res = await request(makeApp()).post('/documents/d1/reprocess');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/failed/i);
    expect(addDocumentProcessingJob).not.toHaveBeenCalled();
  });

  it('rejects when document not owned', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'd1', userId: OTHER_USER.id, status: 'FAILED',
    });
    const res = await request(makeApp()).post('/documents/d1/reprocess');
    expect(res.status).toBe(403);
  });

  it('clears partial state and re-queues for owner', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'd1', userId: FREE_USER.id, status: 'FAILED',
    });
    prisma.documentChunk.findMany.mockResolvedValue([{ pineconeId: 'p1' }]);
    prisma.document.update.mockResolvedValue({});

    const res = await request(makeApp()).post('/documents/d1/reprocess');
    expect(res.status).toBe(200);
    expect(prisma.documentChunk.deleteMany).toHaveBeenCalledWith({ where: { documentId: 'd1' } });
    expect(addDocumentProcessingJob).toHaveBeenCalledWith('d1');
  });
});

describe('POST /documents/:id/upgrade', () => {
  it('returns 403 for FREE user', async () => {
    const res = await request(makeApp(FREE_USER)).post('/documents/d1/upgrade');
    expect(res.status).toBe(403);
    expect(performUpgrade).not.toHaveBeenCalled();
  });

  it('returns 404 if document not found (PREMIUM)', async () => {
    prisma.document.findUnique.mockResolvedValue(null);
    const res = await request(makeApp(PREMIUM_USER)).post('/documents/d1/upgrade');
    expect(res.status).toBe(404);
  });

  it('returns 403 if document owned by another user', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'd1', userId: OTHER_USER.id, status: 'READY',
      mimeType: 'application/pdf', extractionMethod: 'TEXT_ONLY', topicMetadata: null,
    });
    const res = await request(makeApp(PREMIUM_USER)).post('/documents/d1/upgrade');
    expect(res.status).toBe(403);
    expect(performUpgrade).not.toHaveBeenCalled();
  });

  it('rejects when an upgrade is already in progress', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'd1', userId: PREMIUM_USER.id, status: 'READY',
      mimeType: 'application/pdf', extractionMethod: 'TEXT_ONLY', topicMetadata: null,
      reprocessingAt: new Date(),
    });
    const res = await request(makeApp(PREMIUM_USER)).post('/documents/d1/upgrade');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/in progress/);
  });

  it('rejects when document is not eligible for upgrade', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'd1', userId: PREMIUM_USER.id, status: 'READY',
      mimeType: 'application/pdf', extractionMethod: 'VISION',
      topicMetadata: { topics: ['x'] }, // already upgraded
    });
    const res = await request(makeApp(PREMIUM_USER)).post('/documents/d1/upgrade');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/not eligible/i);
  });

  it('queues the upgrade with 202 for eligible PREMIUM doc', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'd1', userId: PREMIUM_USER.id, status: 'READY',
      mimeType: 'application/pdf', extractionMethod: 'TEXT_ONLY', topicMetadata: null,
    });
    const res = await request(makeApp(PREMIUM_USER)).post('/documents/d1/upgrade');
    expect(res.status).toBe(202);
    expect(performUpgrade).toHaveBeenCalledWith('d1');
  });
});

describe('GET /classrooms/:classroomId/documents/search', () => {
  it('returns empty array for queries shorter than 2 chars', async () => {
    const res = await request(makeApp()).get('/classrooms/c1/documents/search?q=a');
    expect(res.status).toBe(200);
    expect(res.body.data.results).toEqual([]);
    expect(searchDocuments).not.toHaveBeenCalled();
  });

  it('rejects search when classroom belongs to another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: OTHER_USER.id });
    const res = await request(makeApp()).get('/classrooms/c1/documents/search?q=hello');
    expect(res.status).toBe(403);
    expect(searchDocuments).not.toHaveBeenCalled();
  });

  it('returns ranked results for owner', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    const res = await request(makeApp()).get('/classrooms/c1/documents/search?q=hello world');
    expect(res.status).toBe(200);
    expect(res.body.data.results).toEqual([{ documentId: 'd1', score: 0.9 }]);
    expect(searchDocuments).toHaveBeenCalledWith('hello world', 'c1');
  });
});
