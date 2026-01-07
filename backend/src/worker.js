/**
 * StudyAI Background Worker
 *
 * Processes background jobs from Redis queue using BullMQ.
 * Run with: npm run worker:dev (development) or npm run worker:start (production)
 *
 * This runs as a SEPARATE PROCESS from the API server.
 */

require('dotenv').config();

const { Worker } = require('bullmq');
const logger = require('./config/logger');
const prisma = require('./lib/prisma');
const { connection } = require('./lib/queue');
const { getFile, deleteFile } = require('./services/s3.service');
const { extractText } = require('./services/textExtractor.service');
const { chunkText } = require('./services/chunker.service');
const { generateEmbeddings, upsertVectors, deleteVectorsByDocument } = require('./services/embedding.service');
const { v4: uuidv4 } = require('uuid');

logger.info('🔧 Worker starting...');
logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);

/**
 * Process a document: extract text, chunk, embed, store in Pinecone
 */
async function processDocument(job) {
  const { documentId } = job.data;
  logger.info(`Processing document: ${documentId}`);

  // Get document from database
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { classroom: true },
  });

  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  // Update status to PROCESSING
  await prisma.document.update({
    where: { id: documentId },
    data: { status: 'PROCESSING' },
  });

  try {
    // Step 1: Download file from S3
    logger.info(`Downloading file from S3: ${document.s3Key}`);
    const fileBuffer = await getFile(document.s3Key);

    // Step 2: Extract text
    logger.info(`Extracting text from ${document.mimeType}`);
    const text = await extractText(fileBuffer, document.mimeType);

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }

    logger.info(`Extracted ${text.length} characters`);

    // Step 3: Chunk text
    logger.info('Chunking text...');
    const chunks = chunkText(text);
    logger.info(`Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error('No chunks created from document');
    }

    // Step 4: Generate embeddings
    logger.info('Generating embeddings...');
    const embeddings = await generateEmbeddings(chunks);
    logger.info(`Generated ${embeddings.length} embeddings`);

    // Step 5: Prepare vectors for Pinecone
    const vectors = chunks.map((chunk, index) => {
      const pineconeId = uuidv4();
      return {
        id: pineconeId,
        values: embeddings[index],
        metadata: {
          documentId: document.id,
          classroomId: document.classroomId,
          userId: document.userId,
          chunkIndex: index,
          filename: document.originalName,
          text: chunk.substring(0, 1000), // Store first 1000 chars for context
        },
      };
    });

    // Step 6: Upsert to Pinecone
    logger.info('Upserting vectors to Pinecone...');
    await upsertVectors(vectors);

    // Step 7: Store chunk references in database
    logger.info('Storing chunk references in database...');
    await prisma.documentChunk.createMany({
      data: chunks.map((chunk, index) => ({
        documentId: document.id,
        chunkIndex: index,
        content: chunk,
        pineconeId: vectors[index].id,
      })),
    });

    // Step 8: Update document status to READY
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'READY' },
    });

    logger.info(`✅ Document processed successfully: ${documentId}`);
    return { success: true, chunks: chunks.length };

  } catch (error) {
    logger.error(`❌ Document processing failed: ${documentId}`, {
      error: error.message,
      stack: error.stack,
    });

    // Clean up everything on failure - transactional approach
    await cleanupFailedDocument(document);

    throw error;
  }
}

/**
 * Clean up a failed document - delete from S3, Pinecone, and DB
 */
async function cleanupFailedDocument(document) {
  logger.info(`Cleaning up failed document: ${document.id}`);

  // 1. Delete vectors from Pinecone (if any exist)
  try {
    await deleteVectorsByDocument(document.id);
  } catch (err) {
    logger.warn(`Failed to delete vectors from Pinecone: ${err.message}`);
  }

  // 2. Delete file from S3
  try {
    await deleteFile(document.s3Key);
    logger.info(`Deleted S3 file: ${document.s3Key}`);
  } catch (err) {
    logger.warn(`Failed to delete S3 file: ${err.message}`);
  }

  // 3. Delete document from DB (cascades to chunks)
  try {
    await prisma.document.delete({
      where: { id: document.id },
    });
    logger.info(`Deleted document record: ${document.id}`);
  } catch (err) {
    logger.warn(`Failed to delete document record: ${err.message}`);
  }
}

// Create worker
const worker = new Worker(
  'document-processing',
  async (job) => {
    return processDocument(job);
  },
  {
    connection,
    concurrency: 2, // Process 2 jobs at a time
  }
);

// Worker event handlers
worker.on('completed', (job, result) => {
  logger.info(`Job completed: ${job.id}`, result);
});

worker.on('failed', (job, error) => {
  logger.error(`Job failed: ${job?.id}`, { error: error.message });
});

worker.on('error', (error) => {
  logger.error('Worker error', { error: error.message });
});

logger.info('⏳ Worker ready, waiting for jobs...');

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down worker...`);

  await worker.close();
  logger.info('Worker closed');

  await prisma.$disconnect();
  logger.info('Database connection closed');

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
