/**
 * Note Controller
 *
 * Route handlers for user-written notes.
 * Notes are NOT AI-generated - they are created and edited by users.
 */

const prisma = require('../lib/prisma');
const {
  createNoteSchema,
  updateNoteSchema,
  validateAudioNoteFile,
} = require('../validators/note.validator');
const {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  createNote,
  createAudioNote,
  updateNote,
  getNoteById,
  getNotesByClassroom,
  deleteNote,
} = require('../services/note.service');
const { uploadFile, deleteFile, getPresignedUrl } = require('../services/s3.service');
const logger = require('../config/logger');

/**
 * Create a new note
 * POST /api/v1/classrooms/:classroomId/notes
 */
const createNoteHandler = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;
  const data = createNoteSchema.parse(req.body);

  // Check classroom exists and belongs to user
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom) {
    throw new NotFoundError('Classroom');
  }

  if (classroom.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this classroom');
  }

  // If documentId is provided, verify it exists in this classroom
  if (data.documentId) {
    const document = await prisma.document.findFirst({
      where: {
        id: data.documentId,
        classroomId,
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found in this classroom');
    }
  }

  const note = await createNote({
    title: data.title,
    content: data.content,
    classroomId,
    userId: req.user.id,
    documentId: data.documentId,
  });

  res.status(201).json({
    success: true,
    data: { note },
  });
});

/**
 * Upload an audio note
 * POST /api/v1/classrooms/:classroomId/notes/audio
 */
const uploadAudioNoteHandler = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;
  const file = req.file;

  const validation = validateAudioNoteFile(file);
  if (!validation.valid) {
    throw new ValidationError(validation.error);
  }

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });
  if (!classroom) throw new NotFoundError('Classroom');
  if (classroom.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this classroom');
  }

  const title = (req.body.title && req.body.title.trim()) || file.originalname;
  const documentId = req.body.documentId || null;

  if (documentId) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, classroomId },
    });
    if (!document) throw new NotFoundError('Document not found in this classroom');
  }

  const { key } = await uploadFile(
    file.buffer,
    file.originalname,
    file.mimetype,
    classroomId,
    'notes'
  );

  const note = await createAudioNote({
    title,
    classroomId,
    userId: req.user.id,
    documentId,
    mimeType: file.mimetype,
    s3Key: key,
    originalName: file.originalname,
    size: file.size,
  });

  logger.info(`Audio note uploaded: ${note.id}`, {
    classroomId,
    filename: file.originalname,
  });

  res.status(201).json({
    success: true,
    data: { note },
  });
});

/**
 * Get presigned streaming URL for an audio note
 * GET /api/v1/notes/:id/stream
 */
const getNoteStreamUrlHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const note = await getNoteById(id);

  if (!note) throw new NotFoundError('Note');
  if (note.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this note');
  }
  if (!note.s3Key || !note.mimeType || !note.mimeType.startsWith('audio/')) {
    throw new ValidationError('This note is not an audio note');
  }

  const url = await getPresignedUrl(note.s3Key);

  res.json({
    success: true,
    data: { url },
  });
});

/**
 * Update a note
 * PATCH /api/v1/notes/:id
 */
const updateNoteHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = updateNoteSchema.parse(req.body);

  const existingNote = await getNoteById(id);

  if (!existingNote) {
    throw new NotFoundError('Note');
  }

  if (existingNote.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this note');
  }

  const note = await updateNote(id, data);

  res.json({
    success: true,
    data: { note },
  });
});

/**
 * Get all notes in a classroom
 * GET /api/v1/classrooms/:classroomId/notes
 */
const getClassroomNotesHandler = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom) {
    throw new NotFoundError('Classroom');
  }

  if (classroom.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this classroom');
  }

  const notes = await getNotesByClassroom(classroomId);

  res.json({
    success: true,
    data: { notes },
  });
});

/**
 * Get a single note by ID
 * GET /api/v1/notes/:id
 */
const getNoteHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const note = await getNoteById(id);

  if (!note) {
    throw new NotFoundError('Note');
  }

  if (note.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this note');
  }

  res.json({
    success: true,
    data: { note },
  });
});

/**
 * Delete a note
 * DELETE /api/v1/notes/:id
 */
const deleteNoteHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const note = await getNoteById(id);

  if (!note) {
    throw new NotFoundError('Note');
  }

  if (note.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this note');
  }

  // If this is an audio note, clean up the S3 object
  if (note.s3Key) {
    try {
      await deleteFile(note.s3Key);
    } catch (error) {
      logger.error('Failed to delete audio note from S3', {
        error: error.message,
        key: note.s3Key,
      });
      // Continue with DB deletion even if S3 fails
    }
  }

  await deleteNote(id);

  res.json({
    success: true,
    message: 'Note deleted',
  });
});

module.exports = {
  createNoteHandler,
  uploadAudioNoteHandler,
  getNoteStreamUrlHandler,
  updateNoteHandler,
  getClassroomNotesHandler,
  getNoteHandler,
  deleteNoteHandler,
};
