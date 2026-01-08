/**
 * Note Service
 *
 * CRUD operations for user-written notes.
 * Unlike flashcards/quizzes/summaries, notes are NOT AI-generated.
 */

const prisma = require('../lib/prisma');

/**
 * Create a new note
 */
async function createNote({ title, content, classroomId, userId, documentId }) {
  return prisma.note.create({
    data: {
      title,
      content: content || '',
      classroomId,
      userId,
      documentId: documentId || null,
    },
    include: {
      document: {
        select: {
          id: true,
          originalName: true,
        },
      },
    },
  });
}

/**
 * Update an existing note
 */
async function updateNote(id, { title, content }) {
  const data = {};
  if (title !== undefined) data.title = title;
  if (content !== undefined) data.content = content;

  return prisma.note.update({
    where: { id },
    data,
    include: {
      document: {
        select: {
          id: true,
          originalName: true,
        },
      },
    },
  });
}

/**
 * Get a note by ID
 */
async function getNoteById(id) {
  return prisma.note.findUnique({
    where: { id },
    include: {
      document: {
        select: {
          id: true,
          originalName: true,
        },
      },
      classroom: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Get all notes in a classroom
 */
async function getNotesByClassroom(classroomId) {
  return prisma.note.findMany({
    where: { classroomId },
    orderBy: { updatedAt: 'desc' },
    include: {
      document: {
        select: {
          id: true,
          originalName: true,
        },
      },
    },
  });
}

/**
 * Get notes linked to a specific document
 */
async function getNotesByDocument(documentId) {
  return prisma.note.findMany({
    where: { documentId },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Delete a note
 */
async function deleteNote(id) {
  return prisma.note.delete({
    where: { id },
  });
}

module.exports = {
  createNote,
  updateNote,
  getNoteById,
  getNotesByClassroom,
  getNotesByDocument,
  deleteNote,
};
