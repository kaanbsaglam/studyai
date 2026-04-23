/**
 * Summary Generator
 *
 * Generates summaries from content.
 * Handles map-reduce for large content by extracting key points and synthesizing.
 */

const Generator = require('./Generator');
const logger = require('../config/logger');
const { loadPrompt } = require('../prompts/loader');

// Length configurations
const LENGTH_CONFIG = {
  short: { words: '150-250', keyPoints: 5, description: 'brief overview' },
  medium: { words: '400-600', keyPoints: 10, description: 'detailed summary' },
  long: { words: '800-1200', keyPoints: 15, description: 'comprehensive summary' },
};

// Depth-0 output is prose; intermediate (depth > 0) emits structured key-points + topics.
const SUMMARY_INTERMEDIATE_SCHEMA = {
  type: 'object',
  properties: {
    keyPoints: { type: 'array', items: { type: 'string' } },
    mainTopics: { type: 'array', items: { type: 'string' } },
  },
  required: ['keyPoints', 'mainTopics'],
};

class SummaryGenerator extends Generator {
  getName() {
    return 'summary';
  }

  getSchema(depth) {
    return depth > 0 ? SUMMARY_INTERMEDIATE_SCHEMA : null;
  }

  needsDocumentContext() {
    // Summaries benefit from document context for better organization
    return true;
  }

  getSummarizationFocus() {
    return 'Preserve the main ideas, key arguments, and important conclusions. Maintain the logical structure and flow of the content.';
  }

  buildMapPrompt(content, params, depth) {
    const { length = 'medium', focusTopic } = params;
    const lengthInfo = LENGTH_CONFIG[length] || LENGTH_CONFIG.medium;

    const topicInstruction = focusTopic
      ? `Focus specifically on aspects related to: "${focusTopic}".`
      : 'Cover the most important concepts from all the material.';

    return loadPrompt('summary/map', {
      isIntermediate: depth > 0,
      topicInstruction,
      content,
      keyPoints: lengthInfo.keyPoints,
      lengthDescription: lengthInfo.description,
      lengthWords: lengthInfo.words,
    });
  }

  buildReducePrompt(partialResults, params, depth) {
    const { length = 'medium', focusTopic } = params;
    const lengthInfo = LENGTH_CONFIG[length] || LENGTH_CONFIG.medium;

    const allKeyPoints = [];
    const allTopics = [];

    for (const result of partialResults) {
      if (result && result.keyPoints) {
        allKeyPoints.push(...result.keyPoints);
      }
      if (result && result.mainTopics) {
        allTopics.push(...result.mainTopics);
      }
    }

    if (allKeyPoints.length === 0 && allTopics.length === 0) {
      return null;
    }

    const topicInstruction = focusTopic
      ? `Focus specifically on aspects related to: "${focusTopic}".`
      : '';

    return loadPrompt('summary/reduce', {
      isIntermediate: depth > 0,
      topicInstruction,
      keyPoints: lengthInfo.keyPoints,
      keyPointsJson: JSON.stringify(allKeyPoints, null, 2),
      mainTopicsJson: JSON.stringify([...new Set(allTopics)], null, 2),
      lengthDescription: lengthInfo.description,
      lengthWords: lengthInfo.words,
    });
  }

  parseResponse(responseText, depth) {
    if (depth > 0) {
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch (e) {
        logger.warn('SummaryGenerator: Failed to parse JSON, extracting as text', { error: e.message });
        return {
          keyPoints: [responseText.trim()],
          mainTopics: [],
        };
      }

      return {
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        mainTopics: Array.isArray(parsed.mainTopics) ? parsed.mainTopics : [],
      };
    }

    // Depth 0 - return as summary text
    return {
      summary: responseText.trim(),
      keyPoints: [],
    };
  }

  combineResults(results, params) {
    // Combine all key points and topics
    const allKeyPoints = [];
    const allTopics = [];
    let summary = '';

    for (const result of results) {
      if (result.summary) {
        // If we have a summary, append it (shouldn't happen in normal flow)
        summary += (summary ? '\n\n' : '') + result.summary;
      }
      if (result.keyPoints) {
        allKeyPoints.push(...result.keyPoints);
      }
      if (result.mainTopics) {
        allTopics.push(...result.mainTopics);
      }
    }

    // Deduplicate key points (simple string comparison)
    const uniqueKeyPoints = [...new Set(allKeyPoints)];
    const uniqueTopics = [...new Set(allTopics)];

    return {
      summary,
      keyPoints: uniqueKeyPoints,
      mainTopics: uniqueTopics,
    };
  }

  validateResult(result, params) {
    // If we have a summary string, return it
    if (result.summary && typeof result.summary === 'string' && result.summary.length > 0) {
      logger.info('SummaryGenerator: Returning prose summary');
      return result.summary;
    }

    // If we only have key points, join them into a summary
    if (result.keyPoints && result.keyPoints.length > 0) {
      logger.info('SummaryGenerator: Converting key points to summary');
      return result.keyPoints.join('\n\n');
    }

    // Empty result is valid - content may not have summarizable information
    logger.info('SummaryGenerator: No summary generated (content may not have summarizable information)');
    return '';
  }
}

module.exports = SummaryGenerator;
