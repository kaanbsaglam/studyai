/**
 * Pipeline Service
 *
 * Core adaptive content processing pipeline that handles LLM content generation
 * regardless of input size. Automatically decides whether to process directly
 * or use map-reduce based on content size.
 *
 * Key features:
 * - Recursive summarization for oversized documents before task processing
 * - Depth-based model selection (cheaper models for deeper recursion)
 * - Upfront validation to reject content that exceeds processable limits
 */

const { getGenerator } = require('../generators');
const { generateText } = require('./llm.service');
const pipelineConfig = require('../config/pipeline.config');
const logger = require('../config/logger');

/**
 * Estimate token count from content
 * @param {string|Array} content - Content string or array of documents
 * @returns {number} Estimated token count
 */
function estimateTokens(content) {
  const { charsPerToken, overheadMultiplier } = pipelineConfig.tokenEstimation;

  let charCount;
  if (typeof content === 'string') {
    charCount = content.length;
  } else if (Array.isArray(content)) {
    charCount = content.reduce((sum, doc) => sum + (doc.content?.length || 0), 0);
  } else {
    charCount = 0;
  }

  return Math.ceil((charCount / charsPerToken) * overheadMultiplier);
}

/**
 * Calculate maximum processable tokens for a tier configuration
 * With recursive summarization, each level can handle maxChunks * chunkSize tokens
 * @param {object} tierConfig - Tier configuration
 * @returns {number} Maximum processable tokens
 */
function calculateMaxProcessableTokens(tierConfig) {
  const { chunkSize, maxChunks, maxDepth } = tierConfig;
  const { summarizationCompression } = pipelineConfig;

  // At depth 0 (task level): maxChunks * chunkSize
  // With summarization (depth 1+): each chunk can be up to maxChunks * chunkSize before being summarized
  // Summarization compresses by ~summarizationCompression factor
  let maxTokens = chunkSize * maxChunks;

  for (let d = 1; d <= maxDepth; d++) {
    // Each level can handle more due to compression
    maxTokens *= summarizationCompression;
  }

  return maxTokens;
}

/**
 * Get the appropriate model for a given depth and phase
 * @param {object} tierConfig - Tier configuration
 * @param {number} depth - Current depth (0 = task, 1+ = summarization)
 * @param {'map' | 'reduce'} phase - Processing phase
 * @returns {string} Model name
 */
function getModelForDepth(tierConfig, depth, phase) {
  const models = tierConfig.models;
  const depthConfig = models[Math.min(depth, models.length - 1)];
  return depthConfig[phase] || depthConfig.map;
}

/**
 * Chunk content by token count, splitting at natural boundaries
 * @param {string} content - Content to chunk
 * @param {number} chunkSize - Target tokens per chunk
 * @returns {string[]} Array of content chunks
 */
function chunkByTokens(content, chunkSize) {
  const { charsPerToken } = pipelineConfig.tokenEstimation;
  const targetChars = chunkSize * charsPerToken;

  if (content.length <= targetChars) {
    return [content];
  }

  const chunks = [];
  let remaining = content;

  while (remaining.length > 0) {
    if (remaining.length <= targetChars) {
      chunks.push(remaining);
      break;
    }

    // Find a good split point within the target range
    let splitPoint = targetChars;

    // Try to split at paragraph boundary (double newline)
    const paragraphBreak = remaining.lastIndexOf('\n\n', splitPoint);
    if (paragraphBreak > targetChars * 0.5) {
      splitPoint = paragraphBreak + 2;
    } else {
      // Try to split at sentence boundary
      const sentenceBreak = findSentenceBreak(remaining, splitPoint);
      if (sentenceBreak > targetChars * 0.5) {
        splitPoint = sentenceBreak;
      } else {
        // Try to split at word boundary
        const wordBreak = remaining.lastIndexOf(' ', splitPoint);
        if (wordBreak > targetChars * 0.5) {
          splitPoint = wordBreak + 1;
        }
      }
    }

    chunks.push(remaining.slice(0, splitPoint).trim());
    remaining = remaining.slice(splitPoint).trim();
  }

  return chunks;
}

/**
 * Find sentence break near target position
 * @param {string} text - Text to search
 * @param {number} target - Target position
 * @returns {number} Position of sentence break, or -1
 */
function findSentenceBreak(text, target) {
  const searchRange = text.slice(Math.floor(target * 0.7), target);
  const patterns = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];

  let bestPos = -1;
  for (const pattern of patterns) {
    const pos = searchRange.lastIndexOf(pattern);
    if (pos > bestPos) {
      bestPos = pos;
    }
  }

  return bestPos > 0 ? Math.floor(target * 0.7) + bestPos + 2 : -1;
}

/**
 * Build summarization prompt for oversized content
 * @param {string} content - Content to summarize
 * @param {string} focus - What to focus on when summarizing (from strategy)
 * @returns {string} Summarization prompt
 */
function buildSummarizationPrompt(content, focus) {
  return `Summarize the following content concisely while preserving the most important information.

Focus: ${focus}

Content:
${content}

Requirements:
- Preserve key facts, concepts, and details
- Maintain accuracy to the source
- Be concise but comprehensive
- Do not add information not present in the source

Write the summary:`;
}

/**
 * Recursively summarize content that exceeds chunk size
 * @param {string} content - Content to summarize
 * @param {object} generator - Generator instance (for summarization focus)
 * @param {number} depth - Current recursion depth
 * @param {string} tier - User tier
 * @param {object} tierConfig - Tier configuration
 * @returns {Promise<{content: string, tokensUsed: number}>}
 */
async function summarizeOversizedContent(content, generator, depth, tier, tierConfig) {
  const { chunkSize, maxDepth, maxChunks } = tierConfig;
  const contentTokens = estimateTokens(content);

  // If content fits in chunk size, return as-is
  if (contentTokens <= chunkSize) {
    return { content, tokensUsed: 0 };
  }

  // If we've exceeded max depth, just truncate and warn
  if (depth > maxDepth) {
    logger.warn(`summarizeOversizedContent: Max depth ${maxDepth} exceeded, truncating content`);
    const { charsPerToken } = pipelineConfig.tokenEstimation;
    const truncated = content.slice(0, chunkSize * charsPerToken);
    return { content: truncated, tokensUsed: 0 };
  }

  logger.info(`summarizeOversizedContent: Content (${contentTokens} tokens) exceeds chunkSize (${chunkSize}), summarizing at depth ${depth}`);

  // Split into chunks
  const chunks = chunkByTokens(content, chunkSize);

  // Limit chunks
  if (chunks.length > maxChunks) {
    logger.warn(`summarizeOversizedContent: Truncating from ${chunks.length} to ${maxChunks} chunks`);
    chunks.length = maxChunks;
  }

  // Get summarization focus from generator
  const focus = generator.getSummarizationFocus();
  const model = getModelForDepth(tierConfig, depth, 'map');

  // Summarize each chunk
  let totalTokensUsed = 0;
  const summaries = [];

  for (const chunk of chunks) {
    const prompt = buildSummarizationPrompt(chunk, focus);

    try {
      const { text, tokensUsed } = await generateText(prompt, { tier, model });
      summaries.push(text.trim());
      totalTokensUsed += tokensUsed;
    } catch (error) {
      logger.error('summarizeOversizedContent: Chunk summarization failed', { error: error.message });
      // Use truncated original as fallback
      const { charsPerToken } = pipelineConfig.tokenEstimation;
      summaries.push(chunk.slice(0, chunkSize * charsPerToken * 0.5));
    }
  }

  // Combine summaries
  const combined = summaries.join('\n\n');
  const combinedTokens = estimateTokens(combined);

  // If combined still exceeds chunk size, recurse
  if (combinedTokens > chunkSize) {
    logger.info(`summarizeOversizedContent: Combined (${combinedTokens} tokens) still exceeds chunkSize, recursing`);
    const recurseResult = await summarizeOversizedContent(combined, generator, depth + 1, tier, tierConfig);
    return {
      content: recurseResult.content,
      tokensUsed: totalTokensUsed + recurseResult.tokensUsed,
    };
  }

  return { content: combined, tokensUsed: totalTokensUsed };
}

/**
 * Pre-process documents, summarizing any that exceed chunk size
 * @param {Array<{id: string, name: string, content: string}>} documents - Documents to process
 * @param {object} generator - Generator instance
 * @param {string} tier - User tier
 * @param {object} tierConfig - Tier configuration
 * @returns {Promise<{documents: Array, tokensUsed: number, summarized: string[]}>}
 */
async function preprocessOversizedDocuments(documents, generator, tier, tierConfig) {
  const { chunkSize } = tierConfig;
  const processedDocs = [];
  let totalTokensUsed = 0;
  const summarizedDocs = [];

  for (const doc of documents) {
    const docTokens = estimateTokens(doc.content);

    if (docTokens > chunkSize) {
      logger.info(`preprocessOversizedDocuments: Document "${doc.name}" (${docTokens} tokens) exceeds chunkSize, summarizing`);

      const { content: summarized, tokensUsed } = await summarizeOversizedContent(
        doc.content,
        generator,
        1, // Start at depth 1 (summarization level)
        tier,
        tierConfig
      );

      processedDocs.push({
        ...doc,
        content: summarized,
        originalTokens: docTokens,
        wasSummarized: true,
      });

      totalTokensUsed += tokensUsed;
      summarizedDocs.push(doc.name);
    } else {
      processedDocs.push({ ...doc, wasSummarized: false });
    }
  }

  return { documents: processedDocs, tokensUsed: totalTokensUsed, summarized: summarizedDocs };
}

/**
 * Process a single chunk with retry logic
 * @param {Strategy} strategy - Strategy instance
 * @param {string} chunk - Content chunk
 * @param {object} params - Strategy parameters
 * @param {number} depth - Current recursion depth
 * @param {string} tier - User tier
 * @param {object} tierConfig - Tier configuration
 * @returns {Promise<{result: *, tokensUsed: number, failed: boolean, error?: string}>}
 */
async function processChunk(generator, chunk, params, depth, tier, tierConfig) {
  const prompt = generator.buildMapPrompt(chunk, params, depth);
  const model = getModelForDepth(tierConfig, depth, 'map');

  try {
    const { text, tokensUsed } = await generateText(prompt, { tier, model });
    const result = generator.parseResponse(text, depth);

    return { result, tokensUsed, failed: false };
  } catch (error) {
    logger.warn(`processChunk: Primary failed, trying fallback`, {
      depth,
      error: error.message,
    });

    // Try fallback
    try {
      const { text, tokensUsed } = await generateText(prompt, { tier, useFallback: true });
      const result = generator.parseResponse(text, depth);

      return { result, tokensUsed, failed: false };
    } catch (fallbackError) {
      logger.error(`processChunk: Fallback also failed`, {
        depth,
        error: fallbackError.message,
      });

      return {
        result: null,
        tokensUsed: 0,
        failed: true,
        error: fallbackError.message,
      };
    }
  }
}

/**
 * Process multiple chunks in parallel with concurrency limit
 * @param {Generator} generator - Generator instance
 * @param {string[]} chunks - Content chunks
 * @param {object} params - Generator parameters
 * @param {number} depth - Current recursion depth
 * @param {string} tier - User tier
 * @param {object} tierConfig - Tier configuration
 * @returns {Promise<{results: Array, tokensUsed: number, failures: number}>}
 */
async function processChunksParallel(generator, chunks, params, depth, tier, tierConfig) {
  const { parallelLimit } = tierConfig;

  const allResults = [];
  let totalTokens = 0;
  let failures = 0;

  // Process in batches
  for (let i = 0; i < chunks.length; i += parallelLimit) {
    const batch = chunks.slice(i, i + parallelLimit);

    const batchPromises = batch.map((chunk) => processChunk(generator, chunk, params, depth, tier, tierConfig));

    const batchResults = await Promise.all(batchPromises);

    for (const res of batchResults) {
      totalTokens += res.tokensUsed;
      if (res.failed) {
        failures++;
      } else if (res.result !== null) {
        allResults.push(res.result);
      }
    }

    logger.info(`processChunksParallel: Batch ${Math.floor(i / parallelLimit) + 1} complete`, {
      processed: Math.min(i + parallelLimit, chunks.length),
      total: chunks.length,
      failures,
    });
  }

  return { results: allResults, tokensUsed: totalTokens, failures };
}

/**
 * Get content as string from various input formats
 * @param {string|Array} content - Content string or array of documents
 * @returns {string} Content as string
 */
function getContentString(content) {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((doc) => `\n\n=== ${doc.name} ===\n${doc.content}`).join('');
  }

  return '';
}

/**
 * Chunk content by document, keeping documents together when possible
 * @param {Array<{id: string, name: string, content: string}>} documents - Documents to chunk
 * @param {number} chunkSize - Target tokens per chunk
 * @returns {string[]} Array of content chunks
 */
function chunkByDocument(documents, chunkSize) {
  const { charsPerToken } = pipelineConfig.tokenEstimation;
  const targetChars = chunkSize * charsPerToken;

  const chunks = [];
  let currentChunk = '';

  for (const doc of documents) {
    const docContent = `\n\n=== ${doc.name} ===\n${doc.content}`;

    // Check if adding this doc would exceed chunk size
    if (currentChunk.length + docContent.length > targetChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = docContent;
    } else {
      currentChunk += docContent;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Main entry point: Generate content using a generator
 * @param {string} generatorName - Generator name ('quiz', 'flashcard', 'summary')
 * @param {string|Array} content - Content string or array of documents
 * @param {object} params - Generator-specific parameters
 * @param {object} options - Processing options
 * @param {string} [options.tier='FREE'] - User tier
 * @param {string} [options.chunkingMode] - Force chunking mode ('by-tokens' or 'by-document')
 * @param {number} [options.chunkSizeOverride] - Override chunk size threshold
 * @returns {Promise<{result: *, tokensUsed: number, warnings?: string[], summarizedDocs?: string[]}>}
 */
async function generateWithGenerator(generatorName, content, params, options = {}) {
  const { tier = 'FREE', chunkingMode: forcedChunkingMode, chunkSizeOverride } = options;

  // Get generator and config
  const generator = getGenerator(generatorName);
  const tierConfig = { ...pipelineConfig.tiers[tier] || pipelineConfig.tiers.FREE };

  // Apply chunk size override if provided
  if (chunkSizeOverride) {
    tierConfig.chunkSize = chunkSizeOverride;
  }

  // Determine chunking mode
  const chunkingMode =
    forcedChunkingMode ||
    (generator.needsDocumentContext() ? pipelineConfig.chunkingModes.BY_DOCUMENT : pipelineConfig.chunkingModes.BY_TOKENS);

  // Estimate content size
  const tokenEstimate = estimateTokens(content);
  const maxProcessable = calculateMaxProcessableTokens(tierConfig);

  logger.info(`generateWithGenerator: Starting`, {
    generator: generatorName,
    tier,
    estimatedTokens: tokenEstimate,
    threshold: tierConfig.threshold,
    maxProcessable,
    chunkingMode,
  });

  // Check if content exceeds absolute maximum
  if (tokenEstimate > maxProcessable) {
    const error = new Error(
      `Content too large to process. Estimated ${tokenEstimate} tokens exceeds maximum ${maxProcessable} tokens. ` +
        `Please select fewer documents or use smaller documents.`
    );
    error.code = 'CONTENT_TOO_LARGE';
    error.tokenEstimate = tokenEstimate;
    error.maxProcessable = maxProcessable;
    throw error;
  }

  const warnings = [];
  let totalTokensUsed = 0;
  let summarizedDocs = [];

  // Pre-process oversized documents (if array of documents)
  let processedContent = content;
  if (Array.isArray(content)) {
    const preprocessResult = await preprocessOversizedDocuments(content, generator, tier, tierConfig);
    processedContent = preprocessResult.documents;
    totalTokensUsed += preprocessResult.tokensUsed;
    summarizedDocs = preprocessResult.summarized;

    if (summarizedDocs.length > 0) {
      warnings.push(`${summarizedDocs.length} document(s) were summarized before processing due to size`);
      logger.info(`generateWithGenerator: Summarized ${summarizedDocs.length} oversized documents`);
    }
  } else if (typeof content === 'string' && estimateTokens(content) > tierConfig.chunkSize) {
    // String content that's oversized - summarize it
    const { content: summarized, tokensUsed } = await summarizeOversizedContent(
      content,
      generator,
      1,
      tier,
      tierConfig
    );
    processedContent = summarized;
    totalTokensUsed += tokensUsed;
    warnings.push('Content was summarized before processing due to size');
  }

  // Re-estimate after preprocessing
  const processedTokens = estimateTokens(processedContent);

  // If under threshold after preprocessing, process directly
  if (processedTokens <= tierConfig.threshold) {
    logger.info(`generateWithGenerator: Direct processing (${processedTokens} tokens under threshold)`);

    const contentStr = getContentString(processedContent);
    const prompt = generator.buildMapPrompt(contentStr, params, 0);
    const model = getModelForDepth(tierConfig, 0, 'reduce');

    const { text, tokensUsed } = await generateText(prompt, { tier, model });
    totalTokensUsed += tokensUsed;

    const result = generator.parseResponse(text, 0);
    const validated = generator.validateResult(result, params);

    return {
      result: validated,
      tokensUsed: totalTokensUsed,
      warnings: warnings.length > 0 ? warnings : undefined,
      summarizedDocs: summarizedDocs.length > 0 ? summarizedDocs : undefined,
    };
  }

  // Over threshold - use map-reduce
  logger.info(`generateWithGenerator: Map-reduce processing (${processedTokens} tokens over threshold)`);

  // Chunk the content
  let chunks;
  if (chunkingMode === pipelineConfig.chunkingModes.BY_DOCUMENT && Array.isArray(processedContent)) {
    chunks = chunkByDocument(processedContent, tierConfig.chunkSize);
  } else {
    const contentStr = getContentString(processedContent);
    chunks = chunkByTokens(contentStr, tierConfig.chunkSize);
  }

  // Limit chunks if necessary
  if (chunks.length > tierConfig.maxChunks) {
    logger.warn(`generateWithGenerator: Truncating chunks from ${chunks.length} to ${tierConfig.maxChunks}`);
    warnings.push(`Content truncated from ${chunks.length} to ${tierConfig.maxChunks} chunks`);
    chunks = chunks.slice(0, tierConfig.maxChunks);
  }

  logger.info(`generateWithGenerator: Created ${chunks.length} chunks`);

  // Map phase - process all chunks
  const { results, tokensUsed: mapTokens, failures } = await processChunksParallel(
    generator,
    chunks,
    params,
    0, // depth 0 for task-level processing
    tier,
    tierConfig
  );

  totalTokensUsed += mapTokens;

  if (failures > 0) {
    warnings.push(`${failures} chunk(s) failed to process`);
  }

  if (results.length === 0) {
    // All chunks failed or returned empty - return empty result
    const emptyResult = generator.validateResult([], params);
    return {
      result: emptyResult,
      tokensUsed: totalTokensUsed,
      warnings: warnings.length > 0 ? warnings : undefined,
      summarizedDocs: summarizedDocs.length > 0 ? summarizedDocs : undefined,
    };
  }

  // Combine results
  const combined = generator.combineResults(results, params);

  // Reduce phase - curate final results
  const reducePrompt = generator.buildReducePrompt(results, params, 0);

  // If buildReducePrompt returns null, skip reduce phase
  if (reducePrompt === null) {
    const validated = generator.validateResult(combined, params);
    return {
      result: validated,
      tokensUsed: totalTokensUsed,
      warnings: warnings.length > 0 ? warnings : undefined,
      summarizedDocs: summarizedDocs.length > 0 ? summarizedDocs : undefined,
    };
  }

  const reduceModel = getModelForDepth(tierConfig, 0, 'reduce');
  const { text: reduceText, tokensUsed: reduceTokens } = await generateText(reducePrompt, {
    tier,
    model: reduceModel,
  });

  totalTokensUsed += reduceTokens;

  const finalResult = generator.parseResponse(reduceText, 0);
  const validated = generator.validateResult(finalResult, params);

  return {
    result: validated,
    tokensUsed: totalTokensUsed,
    warnings: warnings.length > 0 ? warnings : undefined,
    summarizedDocs: summarizedDocs.length > 0 ? summarizedDocs : undefined,
  };
}

module.exports = {
  generateWithGenerator,
  estimateTokens,
  calculateMaxProcessableTokens,
  chunkByTokens,
  chunkByDocument,
};
