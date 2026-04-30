/**
 * Extractor Service
 *
 * High-level service for PDF extraction that abstracts extractor details.
 * Handles tier-based extractor selection and fallback logic.
 */

const { getExtractor } = require('../extractors');
const extractorConfig = require('../config/extractor.config');
const llmConfig = require('../config/llm.config');
const logger = require('../config/logger');

/**
 * Get extractor configuration for a user tier
 * @param {string} tier - User tier ('FREE' or 'PREMIUM')
 * @returns {object} Tier configuration
 */
function getConfigForTier(tier) {
  const config = extractorConfig.pdf[tier];
  if (!config) {
    logger.warn(`Unknown tier: ${tier}, falling back to FREE`);
    return extractorConfig.pdf.FREE;
  }
  return config;
}

/**
 * Extract text from a PDF buffer using the configured extractor for the tier
 * @param {Buffer} buffer - PDF file content
 * @param {object} options - Options
 * @param {string} [options.tier='FREE'] - User tier for extractor selection
 * @returns {Promise<{text: string, tokensUsed: number, extractionMethod: string}>}
 */
async function extractPdf(buffer, options = {}) {
  const { tier = 'FREE' } = options;

  const tierConfig = getConfigForTier(tier);
  const primaryExtractorName = tierConfig.primary;
  const fallbackExtractorName = tierConfig.fallback;

  // Try primary extractor
  try {
    const extractor = getExtractor(primaryExtractorName);
    // Pass vision model + costWeight from central config if using gemini-vision
    const extractOptions = { ...options };
    if (primaryExtractorName === 'gemini-vision') {
      const visionConfig = llmConfig.tiers[tier]?.extraction?.vision || llmConfig.tiers.FREE.extraction.vision;
      extractOptions.model = visionConfig.primary;
      extractOptions.costWeight = llmConfig.models[visionConfig.primary]?.costWeight || 0;
    }
    const result = await extractor.extract(buffer, extractOptions);

    // pdf-parse uses 0 tokens, so weightedTokens collapses to 0.
    const costWeight = extractOptions.costWeight || 0;
    const weightedTokens = Math.ceil((result.tokensUsed || 0) * costWeight);

    return {
      text: result.text,
      tokensUsed: result.tokensUsed,
      weightedTokens,
      extractionMethod: extractor.getExtractionMethod(),
    };
  } catch (error) {
    logger.logEvent('warn', {
      tag: 'extractor',
      event: 'extractor_primary_failed',
      tier,
      extractor: primaryExtractorName,
      error: error.message,
    });

    // Try fallback if configured
    if (fallbackExtractorName && fallbackExtractorName !== primaryExtractorName) {
      logger.logEvent('info', {
        tag: 'extractor',
        event: 'extraction_fallback_used',
        tier,
        from: primaryExtractorName,
        to: fallbackExtractorName,
      });

      try {
        const fallbackExtractor = getExtractor(fallbackExtractorName);
        const fallbackOptions = { ...options };
        if (fallbackExtractorName === 'gemini-vision') {
          const visionConfig = llmConfig.tiers[tier]?.extraction?.vision || llmConfig.tiers.FREE.extraction.vision;
          fallbackOptions.model = visionConfig.primary;
          fallbackOptions.costWeight = llmConfig.models[visionConfig.primary]?.costWeight || 0;
        }
        const result = await fallbackExtractor.extract(buffer, fallbackOptions);

        const costWeight = fallbackOptions.costWeight || 0;
        const weightedTokens = Math.ceil((result.tokensUsed || 0) * costWeight);

        return {
          text: result.text,
          tokensUsed: result.tokensUsed,
          weightedTokens,
          extractionMethod: fallbackExtractor.getExtractionMethod(),
        };
      } catch (fallbackError) {
        logger.logEvent('error', {
          tag: 'extractor',
          event: 'extractor_fallback_failed',
          tier,
          extractor: fallbackExtractorName,
          error: fallbackError.message,
        });
        throw fallbackError;
      }
    }

    // No fallback available or fallback is same as primary
    throw error;
  }
}

module.exports = {
  extractPdf,
  getConfigForTier,
};
