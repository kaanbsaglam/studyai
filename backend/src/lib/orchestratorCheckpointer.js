/**
 * Orchestrator Checkpointer
 *
 * Postgres-backed LangGraph checkpointer. Thread IDs are OrchestratorSession IDs.
 * Tables (checkpoints, checkpoint_writes, checkpoint_blobs, checkpoint_migrations)
 * are managed by the checkpointer itself, outside Prisma's migration graph.
 *
 * `setup()` is idempotent — safe to call on every boot.
 */

const { PostgresSaver } = require('@langchain/langgraph-checkpoint-postgres');
const { env } = require('../config/env');
const logger = require('../config/logger');

let instance = null;
let setupPromise = null;

function getCheckpointer() {
  if (!instance) {
    instance = PostgresSaver.fromConnString(env.DATABASE_URL);
    logger.info('Orchestrator checkpointer initialized');
  }
  return instance;
}

async function ensureSetup() {
  if (setupPromise) return setupPromise;
  const cp = getCheckpointer();
  setupPromise = cp.setup().then(
    () => logger.info('Orchestrator checkpointer tables ready'),
    (err) => {
      setupPromise = null;
      logger.error('Orchestrator checkpointer setup failed', { error: err.message });
      throw err;
    }
  );
  return setupPromise;
}

/**
 * Delete all checkpoints for a given thread (session).
 * Called when a session is deleted so checkpoint tables don't grow unbounded.
 */
async function deleteThread(threadId) {
  const cp = getCheckpointer();
  try {
    if (typeof cp.deleteThread === 'function') {
      await cp.deleteThread(threadId);
      logger.info(`Deleted orchestrator checkpointer thread ${threadId}`);
      return;
    }
    // Fallback: direct SQL delete if the API doesn't expose deleteThread
    // (older versions). Safe no-op if tables don't exist yet.
    logger.warn('Checkpointer has no deleteThread method; skipping cleanup', { threadId });
  } catch (err) {
    logger.warn(`Failed to delete checkpointer thread ${threadId}`, { error: err.message });
  }
}

module.exports = { getCheckpointer, ensureSetup, deleteThread };
