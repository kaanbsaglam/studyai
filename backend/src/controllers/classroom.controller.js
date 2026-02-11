/**
 * Classroom Controller
 *
 * Route handlers for classroom CRUD operations.
 */

const prisma = require('../lib/prisma');
const { createClassroomSchema, updateClassroomSchema } = require('../validators/classroom.validator');
const { NotFoundError, AuthorizationError, ValidationError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { canCreateClassroom } = require('../services/tier.service');
const { deleteFile } = require('../services/s3.service');
const { deleteVectorsByDocument } = require('../services/embedding.service');
const logger = require('../config/logger');

/**
 * Create a new classroom
 * POST /api/v1/classrooms
 */
const createClassroom = asyncHandler(async (req, res) => {
  const data = createClassroomSchema.parse(req.body);

  // Check tier limits
  const tierCheck = await canCreateClassroom(req.user.id, req.user.tier);
  if (!tierCheck.allowed) {
    throw new ValidationError(tierCheck.reason);
  }

  const classroom = await prisma.classroom.create({
    data: {
      name: data.name,
      description: data.description || null,
      userId: req.user.id,
    },
  });

  res.status(201).json({
    success: true,
    data: { classroom },
  });
});

/**
 * Get all classrooms for the current user
 * GET /api/v1/classrooms
 */
const getClassrooms = asyncHandler(async (req, res) => {
  const classrooms = await prisma.classroom.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { documents: true },
      },
    },
  });

  res.json({
    success: true,
    data: { classrooms },
  });
});

/**
 * Get a single classroom by ID
 * GET /api/v1/classrooms/:id
 */
const getClassroom = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          documents: true,
          flashcardSets: true,
          quizSets: true,
          summaries: true,
          notes: true,
          studySessions: false,
        },
      },
    },
  });

  if (!classroom) {
    throw new NotFoundError('Classroom');
  }

  // Check ownership
  if (classroom.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this classroom');
  }

  res.json({
    success: true,
    data: { classroom },
  });
});

/**
 * Update a classroom
 * PATCH /api/v1/classrooms/:id
 */
const updateClassroom = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = updateClassroomSchema.parse(req.body);

  // Check if classroom exists and belongs to user
  const existing = await prisma.classroom.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Classroom');
  }

  if (existing.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this classroom');
  }

  const classroom = await prisma.classroom.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });

  res.json({
    success: true,
    data: { classroom },
  });
});

/**
 * Delete a classroom
 * DELETE /api/v1/classrooms/:id
 */
const deleteClassroom = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if classroom exists and belongs to user, include documents for cleanup
  const existing = await prisma.classroom.findUnique({
    where: { id },
    include: {
      documents: {
        select: {
          id: true,
          s3Key: true,
        },
      },
    },
  });

  if (!existing) {
    throw new NotFoundError('Classroom');
  }

  if (existing.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this classroom');
  }

  // Clean up S3 files and Pinecone vectors for all documents
  for (const document of existing.documents) {
    // Delete from S3
    try {
      await deleteFile(document.s3Key);
    } catch (error) {
      logger.error('Failed to delete file from S3 during classroom deletion', {
        error: error.message,
        key: document.s3Key,
        classroomId: id,
      });
      // Continue with other deletions even if this fails
    }

    // Delete vectors from Pinecone
    try {
      await deleteVectorsByDocument(document.id);
    } catch (error) {
      logger.error('Failed to delete vectors from Pinecone during classroom deletion', {
        error: error.message,
        documentId: document.id,
        classroomId: id,
      });
      // Continue with other deletions even if this fails
    }
  }

  // Delete classroom (cascades to documents due to Prisma schema)
  await prisma.classroom.delete({
    where: { id },
  });

  logger.info(`Classroom deleted: ${id}`, { documentCount: existing.documents.length });

  res.json({
    success: true,
    message: 'Classroom deleted',
  });
});

module.exports = {
  createClassroom,
  getClassrooms,
  getClassroom,
  updateClassroom,
  deleteClassroom,
};
