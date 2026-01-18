/**
 * Strategy Base Class
 *
 * Abstract base class that defines the interface for all content processing strategies.
 * Strategies handle the map-reduce logic for different content generation tasks.
 */

class Strategy {
  constructor(config = {}) {
    if (this.constructor === Strategy) {
      throw new Error('Strategy is an abstract class and cannot be instantiated directly');
    }
    this.config = config;
  }

  /**
   * Get the strategy identifier
   * @returns {string}
   */
  getName() {
    throw new Error('getName() must be implemented by subclass');
  }

  /**
   * Whether this strategy needs document context (affects chunking mode selection)
   * - true: prefers BY_DOCUMENT chunking to preserve document boundaries
   * - false: prefers BY_TOKENS chunking for efficiency
   * @returns {boolean}
   */
  needsDocumentContext() {
    return false;
  }

  /**
   * Build the prompt for processing a chunk of content
   * @param {string} content - The content chunk to process
   * @param {object} params - Strategy-specific parameters (count, focusTopic, etc.)
   * @param {number} depth - Current recursion depth (0 = final output, 1+ = intermediate)
   * @returns {string} The prompt to send to the LLM
   */
  buildMapPrompt(content, params, depth) {
    throw new Error('buildMapPrompt() must be implemented by subclass');
  }

  /**
   * Build the prompt for combining partial results
   * @param {Array} partialResults - Results from previous processing step
   * @param {object} params - Strategy-specific parameters
   * @param {number} depth - Current recursion depth
   * @returns {string} The prompt to send to the LLM
   */
  buildReducePrompt(partialResults, params, depth) {
    throw new Error('buildReducePrompt() must be implemented by subclass');
  }

  /**
   * Parse the LLM response into structured data
   * @param {string} responseText - Raw text response from LLM
   * @param {number} depth - Current recursion depth
   * @returns {*} Parsed result (structure depends on strategy)
   */
  parseResponse(responseText, depth) {
    throw new Error('parseResponse() must be implemented by subclass');
  }

  /**
   * Combine results from multiple chunks
   * @param {Array} results - Array of parsed results from chunks
   * @param {object} params - Strategy-specific parameters
   * @returns {*} Combined result
   */
  combineResults(results, params) {
    throw new Error('combineResults() must be implemented by subclass');
  }

  /**
   * Validate the final result meets requirements
   * @param {*} result - The result to validate
   * @param {object} params - Strategy-specific parameters
   * @returns {*} Validated/cleaned result
   * @throws {Error} If validation fails
   */
  validateResult(result, params) {
    throw new Error('validateResult() must be implemented by subclass');
  }

  /**
   * Helper to strip markdown code blocks from response
   * @param {string} text - Response text
   * @returns {string} Cleaned text
   */
  stripMarkdownCodeBlocks(text) {
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    return jsonStr.trim();
  }

  /**
   * Helper to deduplicate results by a key
   * @param {Array} items - Items to deduplicate
   * @param {Function} keyFn - Function to extract key from item
   * @returns {Array} Deduplicated items
   */
  deduplicateBy(items, keyFn) {
    const seen = new Set();
    return items.filter((item) => {
      const key = keyFn(item).toLowerCase().trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

module.exports = Strategy;
