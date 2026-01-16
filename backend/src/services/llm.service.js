/**
 * LLM Service
 *
 * High-level service for text generation that abstracts provider details.
 * Services should use this instead of directly using providers.
 */

const { getProvider } = require('../providers');
const llmConfig = require('../config/llm.config');
const logger = require('../config/logger');

/**
 * Get configuration for a user tier
 * @param {string} tier - User tier ('FREE' or 'PREMIUM')
 * @returns {object} Tier configuration
 */
function getConfigForTier(tier) {
  const config = llmConfig.tiers[tier];
  if (!config) {
    logger.warn(`Unknown tier: ${tier}, falling back to FREE`);
    return llmConfig.tiers.FREE;
  }
  return config;
}

/**
 * Generate text using the configured LLM provider
 * @param {string} prompt - The input prompt
 * @param {object} options - Options
 * @param {string} [options.tier='FREE'] - User tier for model selection
 * @param {boolean} [options.useFallback=false] - Use fallback model instead of primary
 * @returns {Promise<{text: string, tokensUsed: number}>}
 */
async function generateText(prompt, options = {}) {
  const { tier = 'FREE', useFallback = false } = options;

  const tierConfig = getConfigForTier(tier);
  const providerName = tierConfig.provider;
  const model = useFallback ? tierConfig.fallback : tierConfig.primary;

  logger.info('LLM generateText', {
    tier,
    provider: providerName,
    model,
    promptLength: prompt.length,
  });

  const provider = getProvider(providerName);
  const result = await provider.generateText(prompt, { model });

  logger.info('LLM generateText completed', {
    tier,
    provider: providerName,
    model,
    tokensUsed: result.tokensUsed,
  });

  return result;
}

/**
 * Generate text with automatic fallback on failure
 * @param {string} prompt - The input prompt
 * @param {object} options - Options (same as generateText)
 * @returns {Promise<{text: string, tokensUsed: number}>}
 */
async function generateTextWithFallback(prompt, options = {}) {
  const { tier = 'FREE' } = options;

  try {
    return await generateText(prompt, { tier, useFallback: false });
  } catch (error) {
    const tierConfig = getConfigForTier(tier);

    // Only try fallback if it's different from primary
    if (tierConfig.primary !== tierConfig.fallback) {
      logger.warn('Primary LLM failed, trying fallback', {
        tier,
        error: error.message,
        fallbackModel: tierConfig.fallback,
      });
      return await generateText(prompt, { tier, useFallback: true });
    }

    // No fallback available, re-throw
    throw error;
  }
}

module.exports = {
  generateText,
  generateTextWithFallback,
  getConfigForTier,
};
