/**
 * LLM Service
 *
 * Simple router layer. Model name is always required — no defaults, no tier logic.
 * Provider is determined automatically from the model registry in llm.config.js.
 */

const { getProvider } = require('../providers');
const llmConfig = require('../config/llm.config');
const logger = require('../config/logger');

/**
 * Generate text using a specific model.
 * Provider is resolved from the model registry.
 *
 * @param {string} prompt
 * @param {{ model: string }} options - model name (must exist in registry)
 * @returns {Promise<{ text: string, tokensUsed: number, weightedTokens: number }>}
 */
async function generateText(prompt, { model }) {
  const modelConfig = llmConfig.models[model];
  if (!modelConfig) {
    throw new Error(`Unknown model: ${model}. Register it in llm.config.js models.`);
  }

  const provider = getProvider(modelConfig.provider);

  logger.info('LLM generateText', {
    model,
    provider: modelConfig.provider,
    promptLength: prompt.length,
  });

  const result = await provider.generateText(prompt, { model });

  const weightedTokens = Math.ceil(result.tokensUsed * modelConfig.costWeight);

  logger.info('LLM generateText completed', {
    model,
    provider: modelConfig.provider,
    tokensUsed: result.tokensUsed,
    weightedTokens,
  });

  return {
    text: result.text,
    tokensUsed: result.tokensUsed,
    weightedTokens,
  };
}

/**
 * Generate text with automatic fallback on failure.
 * Caller passes primary and fallback model names from config.
 *
 * @param {string} prompt
 * @param {{ primary: string, fallback: string|null }} models
 * @returns {Promise<{ text: string, tokensUsed: number, weightedTokens: number }>}
 */
async function generateWithFallback(prompt, { primary, fallback }) {
  try {
    return await generateText(prompt, { model: primary });
  } catch (err) {
    if (!fallback || fallback === primary) throw err;
    logger.warn(`Primary model ${primary} failed, trying fallback ${fallback}`, {
      error: err.message,
    });
    return await generateText(prompt, { model: fallback });
  }
}

/**
 * Stream text using a specific model (async generator).
 * Provider is resolved from the model registry.
 *
 * Yields { chunk: string } objects and returns final stats
 * via a callback (since generator return values are hard to capture).
 *
 * @param {string} prompt
 * @param {{ model: string }} options
 * @param {function} [onComplete] - Called with { tokensUsed, weightedTokens } when stream ends
 * @returns {AsyncGenerator<{chunk: string}>}
 */
async function* generateTextStream(prompt, { model }, onComplete) {
  const modelConfig = llmConfig.models[model];
  if (!modelConfig) {
    throw new Error(`Unknown model: ${model}. Register it in llm.config.js models.`);
  }

  const provider = getProvider(modelConfig.provider);

  logger.info('LLM generateTextStream', {
    model,
    provider: modelConfig.provider,
    promptLength: prompt.length,
  });

  const stream = provider.generateTextStream(prompt, { model });
  let fullText = '';
  let result;

  // Iterate the provider's async generator, forwarding chunks
  while (true) {
    const { value, done } = await stream.next();
    if (done) {
      // The return value of the generator contains { tokensUsed }
      result = value || { tokensUsed: 0 };
      break;
    }
    fullText += value.chunk;
    yield value;
  }

  const weightedTokens = Math.ceil((result.tokensUsed || 0) * modelConfig.costWeight);

  logger.info('LLM generateTextStream completed', {
    model,
    provider: modelConfig.provider,
    tokensUsed: result.tokensUsed,
    weightedTokens,
    textLength: fullText.length,
  });

  if (onComplete) {
    onComplete({
      text: fullText,
      tokensUsed: result.tokensUsed || 0,
      weightedTokens,
    });
  }

  return {
    text: fullText,
    tokensUsed: result.tokensUsed || 0,
    weightedTokens,
  };
}

/**
 * Stream text with automatic fallback on failure.
 *
 * @param {string} prompt
 * @param {{ primary: string, fallback: string|null }} models
 * @param {function} [onComplete] - Called with final stats
 * @returns {AsyncGenerator<{chunk: string}>}
 */
async function* generateStreamWithFallback(prompt, { primary, fallback }, onComplete) {
  try {
    yield* generateTextStream(prompt, { model: primary }, onComplete);
  } catch (err) {
    if (!fallback || fallback === primary) throw err;
    logger.warn(`Primary model ${primary} stream failed, trying fallback ${fallback}`, {
      error: err.message,
    });
    yield* generateTextStream(prompt, { model: fallback }, onComplete);
  }
}

module.exports = {
  generateText,
  generateWithFallback,
  generateTextStream,
  generateStreamWithFallback,
};
