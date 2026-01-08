/**
 * Note Controller
 *
 * Route handlers for user-written notes.
 * Notes are NOT AI-generated - they are created and edited by users.
 */

const prisma = require('../lib/prisma');
const { createNoteSchema, updateNoteSchema } = require('../validators/note.validator');
const { NotFoundError, AuthorizationError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  createNote,
  updateNote,
  getNoteById,
  getNotesByClassroom,
  deleteNote,
} = require('../services/note.service');

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

  await deleteNote(id);

  res.json({
    success: true,
    message: 'Note deleted',
  });
});

module.exports = {
  createNoteHandler,
  updateNoteHandler,
  getClassroomNotesHandler,
  getNoteHandler,
  deleteNoteHandler,
};
