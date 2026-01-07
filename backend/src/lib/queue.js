/**
 * BullMQ Queue Configuration
 *
 * Provides queues for background job processing.
 */

const { Queue } = require('bullmq');
const logger = require('../config/logger');

// Redis connection config for BullMQ
const connection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? parseInt(new URL(process.env.REDIS_URL).port) : 6379,
};

// Document processing queue
const documentQueue = new Queue('document-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50,      // Keep last 50 failed jobs
  },
});

logger.info('📬 Document processing queue initialized');

/**
 * Add a document processing job to the queue
 * @param {string} documentId - Document ID to process
 * @returns {Promise<Job>}
 */
async function addDocumentProcessingJob(documentId) {
  const job = await documentQueue.add(
    'process-document',
    { documentId },
    { jobId: documentId } // Use documentId as jobId to prevent duplicates
  );
  logger.info(`Added document processing job: ${documentId}`);
  return job;
}

module.exports = {
  documentQueue,
  addDocumentProcessingJob,
  connection,
};
