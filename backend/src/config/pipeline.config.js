/**
 * Pipeline Configuration
 *
 * Tier-based thresholds and limits for the adaptive content processing pipeline.
 * Controls when map-reduce is triggered, chunk sizes, and model selection.
 */

module.exports = {
  tiers: {
    FREE: {
      threshold: 25000, // tokens to trigger map-reduce
      chunkSize: 8000, // target tokens per chunk
      maxDepth: 3, // maximum recursion depth
      maxChunks: 50, // maximum chunks to process
      parallelLimit: 10, // concurrent chunk processing limit
      models: {
        map: 'gemini-2.0-flash', // model for extraction (depth 1+)
        reduce: 'gemini-2.0-flash', // model for final output (depth 0)
      },
    },
    PREMIUM: {
      threshold: 40000,
      chunkSize: 10000,
      maxDepth: 3,
      maxChunks: 50,
      parallelLimit: 10,
      models: {
        map: 'gemini-2.0-flash',
        reduce: 'gemini-2.0-flash', // can be upgraded to pro model later
      },
    },
  },

  tokenEstimation: {
    charsPerToken: 4, // average characters per token
    overheadMultiplier: 1.1, // safety margin for prompt overhead
  },

  chunkingModes: {
    BY_TOKENS: 'by-tokens',
    BY_DOCUMENT: 'by-document',
  },
};
