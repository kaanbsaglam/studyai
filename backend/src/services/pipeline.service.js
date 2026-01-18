/**
 * Pipeline Service
 *
 * Core adaptive content processing pipeline that handles LLM content generation
 * regardless of input size. Automatically decides whether to process directly
 * or use map-reduce based on content size.
 */

const { getStrategy } = require('../strategies');
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
 * Chunk content by document, preserving document identity
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

    // If single doc is larger than chunk size, subdivide it
    if (docContent.length > targetChars) {
      // Flush current chunk first
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // Split the large document
      const subChunks = chunkByTokens(docContent, chunkSize);
      chunks.push(...subChunks);
      continue;
    }

    // Check if adding this doc would exceed chunk size
    if (currentChunk.length + docContent.length > targetChars) {
      chunks.push(currentChunk.trim());
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
 * Process a single chunk with retry logic
 * @param {Strategy} strategy - Strategy instance
 * @param {string} chunk - Content chunk
 * @param {object} params - Strategy parameters
 * @param {number} depth - Current recursion depth
 * @param {string} tier - User tier
 * @param {object} tierConfig - Tier configuration
 * @returns {Promise<{result: *, tokensUsed: number, failed: boolean, error?: string}>}
 */
async function processChunk(strategy, chunk, params, depth, tier, tierConfig) {
  const prompt = strategy.buildMapPrompt(chunk, params, depth);

  // Select model based on depth
  const model = depth === 0 ? tierConfig.models.reduce : tierConfig.models.map;

  try {
    const { text, tokensUsed } = await generateText(prompt, { tier, model });
    const result = strategy.parseResponse(text, depth);

    return { result, tokensUsed, failed: false };
  } catch (error) {
    logger.warn(`processChunk: Primary failed, trying fallback`, {
      depth,
      error: error.message,
    });

    // Try fallback
    try {
      const { text, tokensUsed } = await generateText(prompt, { tier, useFallback: true });
      const result = strategy.parseResponse(text, depth);

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
 * @param {Strategy} strategy - Strategy instance
 * @param {string[]} chunks - Content chunks
 * @param {object} params - Strategy parameters
 * @param {number} depth - Current recursion depth
 * @param {string} tier - User tier
 * @param {object} tierConfig - Tier configuration
 * @returns {Promise<{results: Array, tokensUsed: number, failures: number}>}
 */
async function processChunksParallel(strategy, chunks, params, depth, tier, tierConfig) {
  const { parallelLimit } = tierConfig;

  const allResults = [];
  let totalTokens = 0;
  let failures = 0;

  // Process in batches
  for (let i = 0; i < chunks.length; i += parallelLimit) {
    const batch = chunks.slice(i, i + parallelLimit);

    const batchPromises = batch.map((chunk) => processChunk(strategy, chunk, params, depth, tier, tierConfig));

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
 * Recursive map-reduce processing
 * @param {Strategy} strategy - Strategy instance
 * @param {string[]} chunks - Content chunks
 * @param {object} params - Strategy parameters
 * @param {number} depth - Current recursion depth
 * @param {string} tier - User tier
 * @param {object} tierConfig - Tier configuration
 * @returns {Promise<{result: *, tokensUsed: number, warnings: string[]}>}
 */
async function mapReduce(strategy, chunks, params, depth, tier, tierConfig) {
  const warnings = [];

  logger.info(`mapReduce: Starting at depth ${depth}`, {
    chunks: chunks.length,
    maxDepth: tierConfig.maxDepth,
  });

  // Process all chunks at this depth
  const { results, tokensUsed, failures } = await processChunksParallel(
    strategy,
    chunks,
    params,
    depth + 1, // map processing is depth + 1
    tier,
    tierConfig
  );

  if (failures > 0) {
    warnings.push(`${failures} chunk(s) failed to process`);
  }

  if (results.length === 0) {
    throw new Error('All chunks failed to process');
  }

  // Combine results from this level
  const combined = strategy.combineResults(results, params);

  // Check if we need another reduce pass
  const combinedTokens = estimateTokens(JSON.stringify(combined));

  if (combinedTokens > tierConfig.threshold && depth < tierConfig.maxDepth) {
    // Need another level of reduction
    logger.info(`mapReduce: Combined still too large (${combinedTokens} tokens), reducing further`);

    // Build reduce prompt and process
    const reducePrompt = strategy.buildReducePrompt(results, params, depth);
    const { text, tokensUsed: reduceTokens } = await generateText(reducePrompt, {
      tier,
      model: tierConfig.models.reduce,
    });

    const reduceResult = strategy.parseResponse(text, depth);

    return {
      result: reduceResult,
      tokensUsed: tokensUsed + reduceTokens,
      warnings,
    };
  }

  // Final reduce at depth 0
  if (depth === 0 || results.length > 1) {
    const reducePrompt = strategy.buildReducePrompt(results, params, 0);
    const { text, tokensUsed: reduceTokens } = await generateText(reducePrompt, {
      tier,
      model: tierConfig.models.reduce,
    });

    const finalResult = strategy.parseResponse(text, 0);

    return {
      result: finalResult,
      tokensUsed: tokensUsed + reduceTokens,
      warnings,
    };
  }

  return {
    result: combined,
    tokensUsed,
    warnings,
  };
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
 * Main entry point: Generate content using a strategy
 * @param {string} strategyName - Strategy name ('quiz', 'flashcard', 'summary')
 * @param {string|Array} content - Content string or array of documents
 * @param {object} params - Strategy-specific parameters
 * @param {object} options - Processing options
 * @param {string} [options.tier='FREE'] - User tier
 * @param {string} [options.chunkingMode] - Force chunking mode ('by-tokens' or 'by-document')
 * @returns {Promise<{result: *, tokensUsed: number, warnings?: string[], partialFailure?: boolean}>}
 */
async function generateWithStrategy(strategyName, content, params, options = {}) {
  const { tier = 'FREE', chunkingMode: forcedChunkingMode } = options;

  // Get strategy and config
  const strategy = getStrategy(strategyName);
  const tierConfig = pipelineConfig.tiers[tier] || pipelineConfig.tiers.FREE;

  // Determine chunking mode
  const chunkingMode =
    forcedChunkingMode ||
    (strategy.needsDocumentContext() ? pipelineConfig.chunkingModes.BY_DOCUMENT : pipelineConfig.chunkingModes.BY_TOKENS);

  // Estimate content size
  const tokenEstimate = estimateTokens(content);

  logger.info(`generateWithStrategy: Starting`, {
    strategy: strategyName,
    tier,
    estimatedTokens: tokenEstimate,
    threshold: tierConfig.threshold,
    chunkingMode,
  });

  // If under threshold, process directly
  if (tokenEstimate <= tierConfig.threshold) {
    logger.info(`generateWithStrategy: Direct processing (under threshold)`);

    const contentStr = getContentString(content);
    const prompt = strategy.buildMapPrompt(contentStr, params, 0);

    const { text, tokensUsed } = await generateText(prompt, {
      tier,
      model: tierConfig.models.reduce,
    });

    const result = strategy.parseResponse(text, 0);
    const validated = strategy.validateResult(result, params);

    return { result: validated, tokensUsed };
  }

  // Over threshold - use map-reduce
  logger.info(`generateWithStrategy: Map-reduce processing (over threshold)`);

  // Chunk the content
  let chunks;
  if (chunkingMode === pipelineConfig.chunkingModes.BY_DOCUMENT && Array.isArray(content)) {
    chunks = chunkByDocument(content, tierConfig.chunkSize);
  } else {
    const contentStr = getContentString(content);
    chunks = chunkByTokens(contentStr, tierConfig.chunkSize);
  }

  // Limit chunks if necessary
  if (chunks.length > tierConfig.maxChunks) {
    logger.warn(`generateWithStrategy: Truncating chunks from ${chunks.length} to ${tierConfig.maxChunks}`);
    chunks = chunks.slice(0, tierConfig.maxChunks);
  }

  logger.info(`generateWithStrategy: Created ${chunks.length} chunks`);

  // Run map-reduce
  const { result, tokensUsed, warnings } = await mapReduce(strategy, chunks, params, 0, tier, tierConfig);

  // Validate final result
  const validated = strategy.validateResult(result, params);

  return {
    result: validated,
    tokensUsed,
    warnings: warnings.length > 0 ? warnings : undefined,
    partialFailure: warnings.length > 0,
  };
}

module.exports = {
  generateWithStrategy,
  estimateTokens,
  chunkByTokens,
  chunkByDocument,
};
