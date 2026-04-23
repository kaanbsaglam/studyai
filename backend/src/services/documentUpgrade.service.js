/**
 * Document Upgrade Service
 *
 * Helpers for the PREMIUM document upgrade flow — re-running the processing
 * pipeline on a doc that was originally processed at FREE quality (no Vision,
 * no topic metadata), so the owner can benefit from PREMIUM features like
 * the orchestrator chat.
 *
 * Two exports:
 *   - isUpgradeable(doc, userTier): pure derivation for API responses and guards
 *   - performUpgrade(docId): cleanup + requeue, assumes guards already passed
 */

const prisma = require('../lib/prisma');
const { deleteVectorsByIds } = require('./embedding.service');
const { addDocumentProcessingJob, documentQueue } = require('../lib/queue');
const logger = require('../config/logger');

/**
 * Derive whether a document can be upgraded, given the current user's tier.
 * One source of truth — call this anywhere an API response needs the flag.
 */
function isUpgradeable(doc, userTier) {
  if (userTier !== 'PREMIUM') return false;
  if (doc.status !== 'READY') return false;
  if (doc.reprocessingAt) return false;
  const isPdf = doc.mimeType === 'application/pdf';
  const needsVision = isPdf && doc.extractionMethod !== 'VISION';
  const needsTopics = doc.topicMetadata == null;
  return needsVision || needsTopics;
}

/**
 * Re-run the processing pipeline for a document at the owner's current tier.
 * Guards are the caller's responsibility.
 *
 * - Deletes old Pinecone vectors for the doc's chunks.
 * - Deletes old chunk rows.
 * - Resets the doc to PENDING, clears errorMessage, sets reprocessingAt = now.
 * - Removes any stale BullMQ job and enqueues a fresh one.
 */
async function performUpgrade(docId) {
  const existingChunks = await prisma.documentChunk.findMany({
    where: { documentId: docId },
    select: { pineconeId: true },
  });
  if (existingChunks.length > 0) {
    const pineconeIds = existingChunks.map((c) => c.pineconeId).filter(Boolean);
    if (pineconeIds.length > 0) {
      await deleteVectorsByIds(pineconeIds).catch(() => {});
    }
    await prisma.documentChunk.deleteMany({ where: { documentId: docId } });
  }

  await prisma.document.update({
    where: { id: docId },
    data: {
      status: 'PENDING',
      errorMessage: null,
      reprocessingAt: new Date(),
    },
  });

  try {
    const existingJob = await documentQueue.getJob(docId);
    if (existingJob) {
      await existingJob.remove().catch(() => {});
    }
  } catch {
    // Job may already be gone, safe to ignore.
  }

  await addDocumentProcessingJob(docId);
  logger.info(`Document ${docId} re-queued for upgrade`);
}

module.exports = { isUpgradeable, performUpgrade };
