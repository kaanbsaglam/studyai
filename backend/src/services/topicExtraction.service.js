/**
 * Topic Extraction Service
 *
 * Produces a lightweight { summary, topics } metadata blob for a document.
 * Consumed later by the orchestrator chat architecture to decide which
 * documents are relevant to a given question without loading their content.
 *
 * PREMIUM-only: callers must gate on `llmConfig.tiers[tier]?.topicExtraction`
 * before invoking this service.
 */

const { generateText } = require('./llm.service');
const llmConfig = require('../config/llm.config');
const { loadPrompt } = require('../prompts/loader');
const logger = require('../config/logger');

/**
 * Strip ```json ... ``` fences the LLM may have wrapped the JSON in.
 */
function stripJsonFences(raw) {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  return s.trim();
}

/**
 * Validate the parsed object matches the shape contract.
 * Loose on purpose: off-spec-but-usable metadata beats null.
 */
function validateShape(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Topic extraction output is not an object');
  }
  if (typeof parsed.summary !== 'string' || parsed.summary.trim().length === 0) {
    throw new Error('Topic extraction output is missing a non-empty summary');
  }
  if (!Array.isArray(parsed.topics) || parsed.topics.length === 0) {
    throw new Error('Topic extraction output is missing a non-empty topics array');
  }
  for (const t of parsed.topics) {
    if (typeof t !== 'string' || t.trim().length === 0) {
      throw new Error('Topic extraction output has a non-string or empty topic entry');
    }
  }
}

/**
 * Extract { summary, topics } metadata from a document's extracted text.
 *
 * @param {string} documentText - Fully extracted plain text of the document.
 * @param {string} tier - Owner's tier ('PREMIUM' expected; FREE should be gated out by caller).
 * @returns {Promise<{ metadata: { summary: string, topics: string[] }, tokensUsed: number, weightedTokens: number }>}
 */
async function extractTopicMetadata(documentText, tier) {
  const scenario = llmConfig.tiers[tier]?.topicExtraction;
  if (!scenario) {
    throw new Error(`Topic extraction is not enabled for tier ${tier}`);
  }

  const prompt = loadPrompt('extraction/topic', { documentText });

  const { text, tokensUsed, weightedTokens } = await generateText(prompt, {
    model: scenario.primary,
  });

  const cleaned = stripJsonFences(text);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Topic extraction output is not valid JSON: ${err.message}`);
  }

  validateShape(parsed);

  logger.info('Topic extraction succeeded', {
    summaryLength: parsed.summary.length,
    topicsCount: parsed.topics.length,
    tokensUsed,
    weightedTokens,
  });

  return {
    metadata: { summary: parsed.summary, topics: parsed.topics },
    tokensUsed,
    weightedTokens,
  };
}

module.exports = { extractTopicMetadata };
