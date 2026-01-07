/**
 * Document Controller
 *
 * Route handlers for document upload and management.
 */

const prisma = require('../lib/prisma');
const { uploadFile, deleteFile, getPresignedUrl } = require('../services/s3.service');
const { validateFile } = require('../validators/document.validator');
const { addDocumentProcessingJob } = require('../lib/queue');
const { NotFoundError, AuthorizationError, ValidationError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { canUploadDocument } = require('../services/tier.service');
const logger = require('../config/logger');

/**
 * Upload a document to a classroom
 * POST /api/v1/classrooms/:classroomId/documents
 */
const uploadDocument = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;
  const file = req.file;

  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new ValidationError(validation.error);
  }

  // Check storage tier limits
  const tierCheck = await canUploadDocument(req.user.id, req.user.tier, file.size);
  if (!tierCheck.allowed) {
    throw new ValidationError(tierCheck.reason);
  }

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

  // Upload to S3
  const { key, filename } = await uploadFile(
    file.buffer,
    file.originalname,
    file.mimetype,
    classroomId
  );

  // Create document record
  const document = await prisma.document.create({
    data: {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      s3Key: key,
      status: 'PENDING',
      userId: req.user.id,
      classroomId,
    },
  });

  // Queue for processing
  await addDocumentProcessingJob(document.id);

  logger.info(`Document uploaded: ${document.id}`, {
    classroomId,
    filename: file.originalname,
  });

  res.status(201).json({
    success: true,
    data: { document },
  });
});

/**
 * Get all documents in a classroom
 * GET /api/v1/classrooms/:classroomId/documents
 */
const getDocuments = asyncHandler(async (req, res) => {
  const { classroomId } = req.params;

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

  const documents = await prisma.document.findMany({
    where: { classroomId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filename: true,
      originalName: true,
      mimeType: true,
      size: true,
      status: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  res.json({
    success: true,
    data: { documents },
  });
});

/**
 * Get a single document
 * GET /api/v1/documents/:id
 */
const getDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      classroom: true,
      chunks: {
        orderBy: { chunkIndex: 'asc' },
        select: {
          id: true,
          chunkIndex: true,
          content: true,
        },
      },
    },
  });

  if (!document) {
    throw new NotFoundError('Document');
  }

  if (document.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this document');
  }

  res.json({
    success: true,
    data: { document },
  });
});

/**
 * Get download URL for a document
 * GET /api/v1/documents/:id/download
 */
const getDownloadUrl = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    throw new NotFoundError('Document');
  }

  if (document.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this document');
  }

  const url = await getPresignedUrl(document.s3Key);

  res.json({
    success: true,
    data: { url },
  });
});

/**
 * Delete a document
 * DELETE /api/v1/documents/:id
 */
const deleteDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    throw new NotFoundError('Document');
  }

  if (document.userId !== req.user.id) {
    throw new AuthorizationError('You do not have access to this document');
  }

  // Delete from S3
  try {
    await deleteFile(document.s3Key);
  } catch (error) {
    logger.error('Failed to delete file from S3', { error: error.message, key: document.s3Key });
    // Continue with database deletion even if S3 fails
  }

  // Delete from database (cascades to chunks)
  await prisma.document.delete({
    where: { id },
  });

  // TODO: Delete vectors from Pinecone

  logger.info(`Document deleted: ${id}`);

  res.json({
    success: true,
    message: 'Document deleted',
  });
});

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  getDownloadUrl,
  deleteDocument,
};
