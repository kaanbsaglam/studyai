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

  logger.info('Extractor extractPdf', {
    tier,
    primary: primaryExtractorName,
    fallback: fallbackExtractorName,
    bufferSize: buffer.length,
  });

  // Try primary extractor
  try {
    const extractor = getExtractor(primaryExtractorName);
    // Pass vision model from central config if using gemini-vision
    const extractOptions = { ...options };
    if (primaryExtractorName === 'gemini-vision') {
      const visionConfig = llmConfig.tiers[tier]?.extraction?.vision || llmConfig.tiers.FREE.extraction.vision;
      extractOptions.model = visionConfig.primary;
    }
    const result = await extractor.extract(buffer, extractOptions);

    logger.info('Extractor extractPdf completed', {
      tier,
      extractor: primaryExtractorName,
      tokensUsed: result.tokensUsed,
      textLength: result.text.length,
    });

    return {
      text: result.text,
      tokensUsed: result.tokensUsed,
      extractionMethod: extractor.getExtractionMethod(),
    };
  } catch (error) {
    logger.warn('Primary extractor failed', {
      tier,
      extractor: primaryExtractorName,
      error: error.message,
    });

    // Try fallback if configured
    if (fallbackExtractorName && fallbackExtractorName !== primaryExtractorName) {
      logger.info('Trying fallback extractor', {
        tier,
        fallback: fallbackExtractorName,
      });

      try {
        const fallbackExtractor = getExtractor(fallbackExtractorName);
        const result = await fallbackExtractor.extract(buffer, options);

        logger.info('Fallback extractor succeeded', {
          tier,
          extractor: fallbackExtractorName,
          tokensUsed: result.tokensUsed,
          textLength: result.text.length,
        });

        return {
          text: result.text,
          tokensUsed: result.tokensUsed,
          extractionMethod: fallbackExtractor.getExtractionMethod(),
        };
      } catch (fallbackError) {
        logger.error('Fallback extractor also failed', {
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
