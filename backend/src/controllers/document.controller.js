/**
 * Document Controller
 *
 * Route handlers for document upload and management.
 */

const prisma = require('../lib/prisma');
const { uploadFile, deleteFile, getPresignedUrl } = require('../services/s3.service');
const { deleteVectorsByDocument, deleteVectorsByIds } = require('../services/embedding.service');
const { validateFile, isAudioFile } = require('../validators/document.validator');
const { addDocumentProcessingJob, documentQueue } = require('../lib/queue');
const { NotFoundError, AuthorizationError, ValidationError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { canUploadDocument, canUploadAudio } = require('../services/tier.service');
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

  // Check if audio file requires premium tier
  if (isAudioFile(file.mimetype)) {
    const audioCheck = canUploadAudio(req.user.tier);
    if (!audioCheck.allowed) {
      throw new ValidationError(audioCheck.reason);
    }
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

  // Delete vectors from Pinecone
  try {
    await deleteVectorsByDocument(id);
  } catch (error) {
    logger.error('Failed to delete vectors from Pinecone', { error: error.message, documentId: id });
    // Continue with database deletion even if Pinecone fails
  }

  // Delete from database (cascades to chunks)
  await prisma.document.delete({
    where: { id },
  });

  logger.info(`Document deleted: ${id}`);

  res.json({
    success: true,
    message: 'Document deleted',
  });
});

/**
 * Get a presigned streaming URL for an audio document
 * GET /api/v1/documents/:id/stream
 */
const getStreamUrl = asyncHandler(async (req, res) => {
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

  if (!isAudioFile(document.mimeType)) {
    throw new ValidationError('Only audio documents can be streamed');
  }

  const url = await getPresignedUrl(document.s3Key);

  res.json({
    success: true,
    data: { url },
  });
});

/**
 * Reprocess a failed document (re-queue for processing)
 * POST /api/v1/documents/:id/reprocess
 */
const reprocessDocument = asyncHandler(async (req, res) => {
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

  if (document.status !== 'FAILED') {
    throw new ValidationError('Only failed documents can be reprocessed');
  }

  // Clean up any partial data from previous attempt
  const existingChunks = await prisma.documentChunk.findMany({
    where: { documentId: id },
    select: { pineconeId: true },
  });
  if (existingChunks.length > 0) {
    const pineconeIds = existingChunks.map((c) => c.pineconeId).filter(Boolean);
    if (pineconeIds.length > 0) {
      await deleteVectorsByIds(pineconeIds).catch(() => {});
    }
    await prisma.documentChunk.deleteMany({ where: { documentId: id } });
  }

  // Reset status to PENDING and clear error
  await prisma.document.update({
    where: { id },
    data: { status: 'PENDING', errorMessage: null },
  });

  // Remove old job from queue (BullMQ prevents duplicate jobIds)
  try {
    const existingJob = await documentQueue.getJob(id);
    if (existingJob) {
      await existingJob.remove().catch(() => {});
    }
  } catch {
    // Job may already be gone, safe to ignore
  }

  // Re-queue for processing
  await addDocumentProcessingJob(id);

  logger.info(`Document ${id} re-queued for processing`);

  res.json({
    success: true,
    message: 'Document re-queued for processing',
  });
});

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  getDownloadUrl,
  deleteDocument,
  getStreamUrl,
  reprocessDocument,
};
