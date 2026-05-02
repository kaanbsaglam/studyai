/**
 * Note integration tests — ownership across CRUD plus document linkage.
 */

jest.mock('../../services/note.service', () => ({
  createNote: jest.fn().mockImplementation(async (input) => ({ id: 'n1', ...input })),
  createAudioNote: jest.fn().mockImplementation(async (input) => ({ id: 'n2', ...input })),
  updateNote: jest.fn().mockImplementation(async (id, data) => ({ id, ...data })),
  getNoteById: jest.fn(),
  getNotesByClassroom: jest.fn().mockResolvedValue([]),
  deleteNote: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/s3.service', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  getPresignedUrl: jest.fn().mockResolvedValue('https://signed.x'),
}));

const request = require('supertest');
const prisma = require('../../lib/prisma');
const noteService = require('../../services/note.service');
const { deleteFile } = require('../../services/s3.service');
const {
  createNoteHandler,
  updateNoteHandler,
  getClassroomNotesHandler,
  getNoteHandler,
  deleteNoteHandler,
} = require('../../controllers/note.controller');
const {
  buildApp,
  injectUser,
  FREE_USER,
  OTHER_USER,
} = require('../helpers/app');

function makeApp(user = FREE_USER) {
  return buildApp((app) => {
    app.use(injectUser(user));
    app.post('/classrooms/:classroomId/notes', createNoteHandler);
    app.get('/classrooms/:classroomId/notes', getClassroomNotesHandler);
    app.get('/notes/:id', getNoteHandler);
    app.patch('/notes/:id', updateNoteHandler);
    app.delete('/notes/:id', deleteNoteHandler);
  });
}

beforeEach(() => jest.clearAllMocks());

describe('POST /classrooms/:id/notes', () => {
  it('returns 403 when classroom belongs to another user', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: OTHER_USER.id });
    const res = await request(makeApp())
      .post('/classrooms/c1/notes')
      .send({ title: 't', content: 'c' });
    expect(res.status).toBe(403);
    expect(noteService.createNote).not.toHaveBeenCalled();
  });

  it('returns 404 when documentId does not exist in this classroom', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    prisma.document.findFirst.mockResolvedValue(null);
    const res = await request(makeApp())
      .post('/classrooms/c1/notes')
      .send({ title: 't', content: 'c', documentId: '11111111-1111-4111-8111-111111111111' });
    expect(res.status).toBe(404);
  });

  it('creates the note for owner', async () => {
    prisma.classroom.findUnique.mockResolvedValue({ id: 'c1', userId: FREE_USER.id });
    const res = await request(makeApp())
      .post('/classrooms/c1/notes')
      .send({ title: 't', content: 'c' });
    expect(res.status).toBe(201);
    expect(noteService.createNote).toHaveBeenCalledWith(expect.objectContaining({
      classroomId: 'c1', userId: FREE_USER.id,
    }));
  });
});

describe('GET, PATCH, DELETE /notes/:id', () => {
  it('GET 404 when missing', async () => {
    noteService.getNoteById.mockResolvedValue(null);
    expect((await request(makeApp()).get('/notes/n1')).status).toBe(404);
  });

  it('GET 403 when not owner', async () => {
    noteService.getNoteById.mockResolvedValue({ id: 'n1', userId: OTHER_USER.id });
    expect((await request(makeApp()).get('/notes/n1')).status).toBe(403);
  });

  it('PATCH 403 when not owner — no update', async () => {
    noteService.getNoteById.mockResolvedValue({ id: 'n1', userId: OTHER_USER.id });
    await request(makeApp()).patch('/notes/n1').send({ title: 'x' }).expect(403);
    expect(noteService.updateNote).not.toHaveBeenCalled();
  });

  it('PATCH 200 for owner', async () => {
    noteService.getNoteById.mockResolvedValue({ id: 'n1', userId: FREE_USER.id });
    const res = await request(makeApp()).patch('/notes/n1').send({ title: 'x' });
    expect(res.status).toBe(200);
    expect(noteService.updateNote).toHaveBeenCalled();
  });

  it('DELETE 403 when not owner — no S3 / DB delete', async () => {
    noteService.getNoteById.mockResolvedValue({ id: 'n1', userId: OTHER_USER.id, s3Key: 'k' });
    await request(makeApp()).delete('/notes/n1').expect(403);
    expect(deleteFile).not.toHaveBeenCalled();
    expect(noteService.deleteNote).not.toHaveBeenCalled();
  });

  it('DELETE owner audio note: cleans S3 then DB', async () => {
    noteService.getNoteById.mockResolvedValue({ id: 'n1', userId: FREE_USER.id, s3Key: 'k' });
    const res = await request(makeApp()).delete('/notes/n1');
    expect(res.status).toBe(200);
    expect(deleteFile).toHaveBeenCalledWith('k');
    expect(noteService.deleteNote).toHaveBeenCalledWith('n1');
  });

  it('DELETE owner text note (no s3Key): skips S3', async () => {
    noteService.getNoteById.mockResolvedValue({ id: 'n1', userId: FREE_USER.id });
    const res = await request(makeApp()).delete('/notes/n1');
    expect(res.status).toBe(200);
    expect(deleteFile).not.toHaveBeenCalled();
    expect(noteService.deleteNote).toHaveBeenCalled();
  });
});
