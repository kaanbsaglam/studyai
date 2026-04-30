/**
 * LLM Service
 *
 * Simple router layer. Model name is always required — no defaults, no tier logic.
 * Provider is determined automatically from the model registry in llm.config.js.
 *
 * Callers may pass `tag` (e.g. 'pipeline', 'orchestrator', 'extractor', 'chat') to
 * have the call emit a structured `llm_call_completed` event with hero fields:
 * model, costWeight, tokensIn, tokensOut, weightedTokens, durationMs.
 * Untagged calls are silent at info level — keeps noise out of saved Axiom views.
 */

const { getProvider } = require('../providers');
const llmConfig = require('../config/llm.config');
const logger = require('../config/logger');

function emitLLMCall({ tag, event, model, modelConfig, result, durationMs, weightedTokens, extra }) {
  if (!tag) return;
  logger.logLLMCall({
    tag,
    event: event || 'llm_call_completed',
    model,
    costWeight: modelConfig.costWeight,
    tokensIn: result.tokensIn || 0,
    tokensOut: result.tokensOut || 0,
    tokensUsed: result.tokensUsed || 0,
    weightedTokens,
    durationMs,
    ...(extra || {}),
  });
}

/**
 * Generate text using a specific model.
 *
 * @param {string} prompt
 * @param {{ model: string, schema?: object, tag?: string, event?: string, extra?: object }} options
 * @returns {Promise<{ text: string, tokensUsed: number, tokensIn: number, tokensOut: number, weightedTokens: number }>}
 */
async function generateText(prompt, { model, schema, tag, event, extra }) {
  const modelConfig = llmConfig.models[model];
  if (!modelConfig) {
    throw new Error(`Unknown model: ${model}. Register it in llm.config.js models.`);
  }

  const provider = getProvider(modelConfig.provider);
  const startMs = Date.now();
  const result = await provider.generateText(prompt, { model, schema });
  const durationMs = Date.now() - startMs;
  const weightedTokens = Math.ceil(result.tokensUsed * modelConfig.costWeight);

  emitLLMCall({ tag, event, model, modelConfig, result, durationMs, weightedTokens, extra });

  return {
    text: result.text,
    tokensUsed: result.tokensUsed,
    tokensIn: result.tokensIn || 0,
    tokensOut: result.tokensOut || 0,
    weightedTokens,
  };
}

/**
 * Generate text with automatic fallback on failure.
 */
async function generateWithFallback(prompt, { primary, fallback }, { schema, tag, event, extra } = {}) {
  try {
    return await generateText(prompt, { model: primary, schema, tag, event, extra });
  } catch (err) {
    if (!fallback || fallback === primary) throw err;
    if (tag) {
      logger.logEvent('warn', {
        tag,
        event: 'llm_primary_failed_falling_back',
        primary,
        fallback,
        error: err.message,
      });
    }
    return await generateText(prompt, { model: fallback, schema, tag, event, extra: { ...(extra || {}), fellBack: true } });
  }
}

/**
 * Stream text using a specific model (async generator).
 * Yields { chunk: string } objects; emits llm_call_completed when stream ends.
 */
async function* generateTextStream(prompt, { model, tag, event, extra }, onComplete) {
  const modelConfig = llmConfig.models[model];
  if (!modelConfig) {
    throw new Error(`Unknown model: ${model}. Register it in llm.config.js models.`);
  }

  const provider = getProvider(modelConfig.provider);
  const startMs = Date.now();

  const stream = provider.generateTextStream(prompt, { model });
  let fullText = '';
  let result;

  while (true) {
    const { value, done } = await stream.next();
    if (done) {
      result = value || { tokensUsed: 0, tokensIn: 0, tokensOut: 0 };
      break;
    }
    fullText += value.chunk;
    yield value;
  }

  const durationMs = Date.now() - startMs;
  const weightedTokens = Math.ceil((result.tokensUsed || 0) * modelConfig.costWeight);

  emitLLMCall({
    tag,
    event,
    model,
    modelConfig,
    result,
    durationMs,
    weightedTokens,
    extra: { ...(extra || {}), streamed: true, textLength: fullText.length },
  });

  if (onComplete) {
    onComplete({
      text: fullText,
      tokensUsed: result.tokensUsed || 0,
      tokensIn: result.tokensIn || 0,
      tokensOut: result.tokensOut || 0,
      weightedTokens,
    });
  }

  return {
    text: fullText,
    tokensUsed: result.tokensUsed || 0,
    tokensIn: result.tokensIn || 0,
    tokensOut: result.tokensOut || 0,
    weightedTokens,
  };
}

/**
 * Stream text with automatic fallback on failure.
 */
async function* generateStreamWithFallback(prompt, { primary, fallback }, onComplete, { tag, event, extra } = {}) {
  try {
    yield* generateTextStream(prompt, { model: primary, tag, event, extra }, onComplete);
  } catch (err) {
    if (!fallback || fallback === primary) throw err;
    if (tag) {
      logger.logEvent('warn', {
        tag,
        event: 'llm_primary_stream_failed_falling_back',
        primary,
        fallback,
        error: err.message,
      });
    }
    yield* generateTextStream(prompt, { model: fallback, tag, event, extra: { ...(extra || {}), fellBack: true } }, onComplete);
  }
}

module.exports = {
  generateText,
  generateWithFallback,
  generateTextStream,
  generateStreamWithFallback,
};
