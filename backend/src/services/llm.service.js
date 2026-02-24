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

module.exports = {
  generateText,
  generateWithFallback,
};
