/**
 * Pipeline Configuration
 *
 * Tier-based thresholds and limits for the adaptive content processing pipeline.
 * Controls when map-reduce is triggered and chunk sizes.
 * Model selection is handled by llm.config.js.
 */

module.exports = {
  // Embedding chunker settings (used by chunker.service.js for document ingestion)
  embeddingChunker: {
    chunkSize: 800,   // target words per chunk
    overlap: 150,     // words of overlap between chunks
  },

  tiers: {
    FREE: {
      threshold: 25000, // tokens to trigger map-reduce
      chunkSize: 8000, // target tokens per chunk (also threshold for recursive summarization)
      maxDepth: 1, // 0 = task, 1 = summarization
      maxChunks: 50, // maximum chunks to process at each level
      parallelLimit: 10, // concurrent chunk processing limit
    },
    PREMIUM: {
      threshold: 10000, // keep it low for easier testing, later change it to 40000 10000 or 60000 15000
      chunkSize: 4000,
      maxDepth: 1,
      maxChunks: 50,
      parallelLimit: 10,
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

  /**
   * Calculate max processable tokens for a tier
   * At depth 0: maxChunks * chunkSize
   * With summarization (depth 1): each chunk can itself be maxChunks * chunkSize before summarization
   * So theoretical max = chunkSize * maxChunks^(maxDepth+1)
   * But we use a conservative estimate assuming ~10x compression from summarization
   */
  summarizationCompression: 10, // assume summaries are ~10x smaller than source
};
