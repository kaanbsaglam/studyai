/**
 * Summary Generator
 *
 * Generates summaries from content.
 * Handles map-reduce for large content by extracting key points and synthesizing.
 */

const Generator = require('./Generator');
const logger = require('../config/logger');

// Length configurations
const LENGTH_CONFIG = {
  short: { words: '150-250', keyPoints: 5, description: 'brief overview' },
  medium: { words: '400-600', keyPoints: 10, description: 'detailed summary' },
  long: { words: '800-1200', keyPoints: 15, description: 'comprehensive summary' },
};

class SummaryGenerator extends Generator {
  getName() {
    return 'summary';
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

    if (depth > 0) {
      // Intermediate extraction - extract key points as JSON
      return `Extract the key points and main topics from this content.

${topicInstruction}

Content:
${content}

Extract up to ${lengthInfo.keyPoints} key points as a JSON object:
{"keyPoints": ["point 1", "point 2", ...], "mainTopics": ["topic 1", "topic 2", ...]}

Respond with ONLY valid JSON:`;
    }

    // Depth 0 - final output quality (prose summary)
    return `You are an expert at creating clear, educational summaries.

Based on the following study material, create a ${lengthInfo.description} (approximately ${lengthInfo.words} words).
${topicInstruction}

Guidelines:
- Capture the main ideas and key concepts
- Maintain accuracy to the source material
- Use clear, accessible language
- Organize information logically
- Include important details, examples, or definitions when relevant

Study Material:
${content}

Write the summary in a flowing, readable format. Generate the summary:`;
  }

  buildReducePrompt(partialResults, params, depth) {
    const { length = 'medium', focusTopic } = params;
    const lengthInfo = LENGTH_CONFIG[length] || LENGTH_CONFIG.medium;

    // Collect all key points from partial results
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

    // Handle case where no key points were extracted
    if (allKeyPoints.length === 0 && allTopics.length === 0) {
      return null; // Signal that reduce is not needed
    }

    const topicInstruction = focusTopic
      ? `Focus specifically on aspects related to: "${focusTopic}".`
      : '';

    if (depth > 0) {
      // Still intermediate - consolidate key points
      return `Consolidate these key points into the most important ${lengthInfo.keyPoints} points.

${topicInstruction}

Key Points:
${JSON.stringify(allKeyPoints, null, 2)}

Main Topics:
${JSON.stringify([...new Set(allTopics)], null, 2)}

Respond with ONLY valid JSON:
{"keyPoints": ["point 1", "point 2", ...], "mainTopics": ["topic 1", "topic 2", ...]}`;
    }

    // Depth 0 - synthesize into prose
    return `You are an expert at creating clear, educational summaries.

Synthesize these key points into a ${lengthInfo.description} (approximately ${lengthInfo.words} words).

${topicInstruction}

Key Points:
${JSON.stringify(allKeyPoints, null, 2)}

Main Topics:
${JSON.stringify([...new Set(allTopics)], null, 2)}

Guidelines:
- Create a coherent, flowing narrative
- Organize by main topics logically
- Use clear, accessible language
- Include all important concepts

Write the summary as flowing prose (not bullet points):`;
  }

  parseResponse(responseText, depth) {
    if (depth > 0) {
      // Intermediate - parse JSON
      const jsonStr = this.stripMarkdownCodeBlocks(responseText);

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        logger.warn('SummaryGenerator: Failed to parse JSON, extracting as text', { error: e.message });
        // Fallback: treat as plain text key points
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
