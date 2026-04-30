/**
 * StudyAI Background Worker
 *
 * Processes background jobs from Redis queue using BullMQ.
 * Run with: npm run worker:dev (development) or npm run worker:start (production)
 *
 * This runs as a SEPARATE PROCESS from the API server.
 */

require('dotenv').config();

// Identify this process for structured logs (must be set before logger is required)
process.env.LOG_PROCESS_NAME = process.env.LOG_PROCESS_NAME || 'worker';

const { Worker } = require('bullmq');
const logger = require('./config/logger');
const prisma = require('./lib/prisma');
const { connection } = require('./lib/queue');
const { getFile, deleteFile } = require('./services/s3.service');
const { extractTextWithTier } = require('./services/textExtractor.service');
const { isAudioFile } = require('./validators/document.validator');
const { chunkText } = require('./services/chunker.service');
const { recordTokenUsage } = require('./services/tier.service');
const { generateEmbeddings, upsertVectors, deleteVectorsByDocument } = require('./services/embedding.service');
const { extractTopicMetadata } = require('./services/topicExtraction.service');
const llmConfig = require('./config/llm.config');
const { v4: uuidv4 } = require('uuid');
const { runWithTrace, newTraceId } = require('./lib/traceContext');

logger.info('Worker starting...');
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

/**
 * Process a document: extract text, chunk, embed, store in Pinecone
 */
async function processDocument(job) {
  const startMs = Date.now();
  const { documentId } = job.data;
  logger.logEvent('info', {
    tag: 'pipeline',
    event: 'document_processing_started',
    documentId,
    jobId: job.id,
  });

  // Get document from database with user for tier-based extraction
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      classroom: true,
      user: { select: { id: true, tier: true } },
    },
  });

  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  const userTier = document.user?.tier || 'FREE';

  // Update status to PROCESSING
  await prisma.document.update({
    where: { id: documentId },
    data: { status: 'PROCESSING' },
  });

  try {
    // Step 1: Download file from S3
    logger.logEvent('info', {
      tag: 'pipeline',
      event: 'document_s3_download_started',
      documentId,
      filename: document.originalName,
      s3Key: document.s3Key,
    });
    const fileBuffer = await getFile(document.s3Key);

    // Step 2: Extract text (tier-based for PDFs and audio)
    logger.logEvent('info', {
      tag: 'extractor',
      event: 'extraction_started',
      documentId,
      filename: document.originalName,
      mimeType: document.mimeType,
      tier: userTier,
    });
    const { text, tokensUsed, weightedTokens, extractionMethod } = await extractTextWithTier(
      fileBuffer,
      document.mimeType,
      userTier,
      document.originalName
    );

    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from the document');
    }

    logger.logEvent('info', {
      tag: 'extractor',
      event: 'extraction_completed',
      documentId,
      filename: document.originalName,
      extractionMethod,
      chars: text.length,
      tokensUsed,
      weightedTokens,
    });

    // Record token usage if any tokens were used (Whisper duration or Gemini
    // Vision tokens). Pass weightedTokens so cost-weighting is honored.
    if (tokensUsed > 0) {
      await recordTokenUsage(document.userId, tokensUsed, weightedTokens);
    }

    // Step 3: Chunk text
    const chunks = chunkText(text);
    logger.logEvent('info', {
      tag: 'pipeline',
      event: 'chunking_completed',
      documentId,
      chunkCount: chunks.length,
    });

    if (chunks.length === 0) {
      throw new Error('No chunks created from document');
    }

    // Step 4: Generate embeddings
    const embeddings = await generateEmbeddings(chunks);
    logger.logEvent('info', {
      tag: 'pipeline',
      event: 'embeddings_generated',
      documentId,
      embeddingCount: embeddings.length,
    });

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
    await upsertVectors(vectors);
    logger.logEvent('info', {
      tag: 'pipeline',
      event: 'pinecone_upsert_completed',
      documentId,
      vectorCount: vectors.length,
    });

    // Step 7: Store chunk references in database
    await prisma.documentChunk.createMany({
      data: chunks.map((chunk, index) => ({
        documentId: document.id,
        chunkIndex: index,
        content: chunk,
        pineconeId: vectors[index].id,
      })),
    });

    // Step 8: Topic extraction (PREMIUM only, config-as-gate).
    // Runs once per document; failure is non-fatal — doc still goes READY with null metadata.
    let topicMetadata = null;
    let metadataExtractedAt = null;
    if (llmConfig.tiers[userTier]?.topicExtraction) {
      try {
        const result = await extractTopicMetadata(text, userTier);
        topicMetadata = result.metadata;
        metadataExtractedAt = new Date();
        await recordTokenUsage(document.userId, result.tokensUsed, result.weightedTokens);
        logger.logEvent('info', {
          tag: 'pipeline',
          event: 'topic_metadata_extracted',
          documentId,
          tokensUsed: result.tokensUsed,
          weightedTokens: result.weightedTokens,
        });
      } catch (err) {
        logger.logEvent('warn', {
          tag: 'pipeline',
          event: 'topic_extraction_failed',
          documentId,
          error: err.message,
        });
        // Intentionally swallow — doc still transitions to READY below.
      }
    }

    // Step 9: Single combined update — status + extraction method + topic metadata
    // + processed tier snapshot + clear any in-flight reprocessing flag.
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'READY',
        extractionMethod: extractionMethod || undefined,
        topicMetadata: topicMetadata || undefined,
        metadataExtractedAt: metadataExtractedAt || undefined,
        processedTier: userTier,
        reprocessingAt: null,
      },
    });

    logger.logEvent('info', {
      tag: 'pipeline',
      event: 'document_processing_completed',
      documentId,
      filename: document.originalName,
      chunkCount: chunks.length,
      durationMs: Date.now() - startMs,
    });
    return { success: true, chunks: chunks.length };

  } catch (error) {
    logger.logEvent('error', {
      tag: 'pipeline',
      event: 'document_processing_failed',
      documentId,
      filename: document.originalName,
      error: error.message,
      stack: error.stack,
      durationMs: Date.now() - startMs,
    });

    // For audio files, keep the S3 file and DB record so users can still listen
    if (isAudioFile(document.mimeType)) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED', errorMessage: error.message },
      });
    } else {
      // Clean up everything on failure - transactional approach
      await cleanupFailedDocument(document);
    }

    throw error;
  }
}

/**
 * Clean up a failed document - delete from S3, Pinecone, and DB
 */
async function cleanupFailedDocument(document) {
  // 1. Delete vectors from Pinecone (if any exist)
  try {
    await deleteVectorsByDocument(document.id);
  } catch (err) {
    logger.logEvent('warn', {
      tag: 'pipeline',
      event: 'cleanup_pinecone_failed',
      documentId: document.id,
      error: err.message,
    });
  }

  // 2. Delete file from S3
  try {
    await deleteFile(document.s3Key);
  } catch (err) {
    logger.logEvent('warn', {
      tag: 'pipeline',
      event: 'cleanup_s3_failed',
      documentId: document.id,
      s3Key: document.s3Key,
      error: err.message,
    });
  }

  // 3. Delete document from DB (cascades to chunks)
  try {
    await prisma.document.delete({
      where: { id: document.id },
    });
  } catch (err) {
    logger.logEvent('warn', {
      tag: 'pipeline',
      event: 'cleanup_db_failed',
      documentId: document.id,
      error: err.message,
    });
  }
}

// Create worker
const worker = new Worker(
  'document-processing',
  async (job) => {
    // Each job runs in its own trace context so all log lines emitted while
    // processing the job (including from imported services) share one ID.
    return runWithTrace(newTraceId(), () => processDocument(job));
  },
  {
    connection,
    concurrency: 2, // Process 2 jobs at a time
    lockDuration: 120000, // 2 minutes - audio transcription can be slow
  }
);

// Worker event handlers
worker.on('completed', (job) => {
  logger.logEvent('info', {
    tag: 'pipeline',
    event: 'job_completed',
    jobId: job.id,
  });
});

worker.on('failed', (job, error) => {
  logger.logEvent('error', {
    tag: 'pipeline',
    event: 'job_failed',
    jobId: job?.id,
    error: error.message,
  });
});

worker.on('error', (error) => {
  logger.error('Worker error', { error: error.message });
});

logger.info('Worker ready, waiting for jobs...');

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
