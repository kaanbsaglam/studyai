/**
 * Structured Winston logger.
 *
 * Two axes on every line:
 *   - process: "api" | "worker" — where the code runs (set via LOG_PROCESS_NAME env var by entry points)
 *   - tag:     "pipeline" | "orchestrator" | "extractor" | "chat" | "auth" — what story the line belongs to
 *
 * Tags are set at the call site that owns the story, not by transport-level wrappers.
 * Untagged logs are fine for noise (heartbeats, route hits, CRUD).
 *
 * Helpers:
 *   logger.logEvent('info', { tag, event, ...fields })
 *   logger.logLLMCall({ tag, event, model, tokensIn, tokensOut, weightedTokens, costWeight, durationMs, ...extra })
 *
 * traceId is pulled automatically from AsyncLocalStorage if a request/job set one.
 */

const winston = require('winston');
const { currentTraceId } = require('../lib/traceContext');

// LOG_FORCE_JSON=1 emits prod JSON format even in development. Useful for
// piping stdout to a structured-logs validator without changing NODE_ENV.
const useJsonFormat = process.env.NODE_ENV === 'production' || process.env.LOG_FORCE_JSON === '1';
const isDevelopment = !useJsonFormat;
const processName = process.env.LOG_PROCESS_NAME || 'api';

const attachTraceId = winston.format((info) => {
  if (!info.traceId) {
    const tid = currentTraceId();
    if (tid) info.traceId = tid;
  }
  return info;
});

const devFormat = winston.format.combine(
  attachTraceId(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    const { timestamp, level, message, traceId } = info;
    const proc = info.process;
    const tag = info.tag;
    const event = info.event;
    const meta = { ...info };
    delete meta.timestamp;
    delete meta.level;
    delete meta.message;
    delete meta.traceId;
    delete meta.process;
    delete meta.tag;
    delete meta.event;
    delete meta[Symbol.for('level')];
    delete meta[Symbol.for('splat')];

    const head = [proc, tag].filter(Boolean).join('|');
    const headStr = head ? `[${head}] ` : '';
    const evStr = event ? `${event} ` : '';
    const idStr = traceId ? `<${String(traceId).slice(0, 8)}> ` : '';
    // Suppress the message when it's identical to the event name (logEvent
    // defaults message to event; rendering both is redundant).
    const msgStr = message && message !== event ? message : '';
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} ${level}: ${headStr}${evStr}${idStr}${msgStr}${metaStr}`;
  })
);

const prodFormat = winston.format.combine(
  attachTraceId(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports = [new winston.transports.Console()];

// Axiom HTTPS ingest. Stdout transport stays untouched so docker logs and
// local dev still work. The per-transport format filter ships only lines
// that carry a `tag` (untagged noise — heartbeats, route hits, prisma chatter
// — never leaves the host), which keeps free-tier ingest under control.
if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
  // eslint-disable-next-line global-require
  const { WinstonTransport: AxiomTransport } = require('@axiomhq/winston');
  transports.push(
    new AxiomTransport({
      token: process.env.AXIOM_TOKEN,
      dataset: process.env.AXIOM_DATASET,
      // EU datasets need https://api.eu.axiom.co; US is the default.
      ...(process.env.AXIOM_URL ? { url: process.env.AXIOM_URL } : {}),
      format: winston.format((info) => (info.tag ? info : false))(),
    }),
  );
}

const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: isDevelopment ? devFormat : prodFormat,
  defaultMeta: { process: processName },
  transports,
});

/**
 * Emit a structured event. `event` is required and should be a stable
 * machine-readable name (snake_case past tense, e.g. "pipeline_started").
 * `tag` is required to anchor the line to a story.
 */
logger.logEvent = function logEvent(level, { tag, event, message, ...fields }) {
  this.log(level, message || event, { tag, event, ...fields });
};

/**
 * Emit a cost-bearing LLM call log line. Hero shape used by the pipeline
 * and orchestrator presentation videos.
 */
logger.logLLMCall = function logLLMCall({
  tag,
  event,
  model,
  costWeight,
  tokensIn,
  tokensOut,
  weightedTokens,
  durationMs,
  ...extra
}) {
  this.log('info', event, {
    tag,
    event,
    model,
    costWeight,
    tokensIn,
    tokensOut,
    weightedTokens,
    durationMs,
    ...extra,
  });
};

module.exports = logger;
