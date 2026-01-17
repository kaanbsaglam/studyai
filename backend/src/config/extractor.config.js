/**
 * Extractor Configuration
 *
 * Defines tier-based PDF extractor selection.
 * PREMIUM users get Gemini Vision extraction (text + image descriptions).
 * FREE users get text-only pdf-parse extraction.
 */

module.exports = {
  // Default extractor when none specified
  defaultExtractor: 'pdf-parse',

  // Tier-based extractor configuration for PDFs
  pdf: {
    FREE: {
      primary: 'pdf-parse',
      fallback: null, // No fallback for FREE tier
    },
    PREMIUM: {
      primary: 'gemini-vision',
      fallback: 'pdf-parse', // Fallback if Gemini fails
    },
  },

  // Extractor-specific settings
  extractors: {
    'pdf-parse': {
      tokensUsed: false,
    },
    'gemini-vision': {
      tokensUsed: true,
      model: 'gemini-2.0-flash',
    },
  },
};
