/**
 * LLM Provider Base Class
 *
 * Abstract base class that defines the interface for all LLM providers.
 * All provider implementations (Gemini, OpenAI, Anthropic, etc.) must extend this class.
 */

class LLMProvider {
  constructor(config = {}) {
    if (this.constructor === LLMProvider) {
      throw new Error('LLMProvider is an abstract class and cannot be instantiated directly');
    }
    this.config = config;
  }

  /**
   * Generate text from a prompt
   * @param {string} prompt - The input prompt
   * @param {object} options - Generation options
   * @param {string} [options.model] - Model to use (provider-specific)
   * @param {object} [options.schema] - JSON schema (OpenAPI-3 subset) for structured
   *   output. When provided, the provider must enforce server-side JSON output
   *   matching this shape (Gemini: responseSchema; OpenAI: response_format json_schema strict).
   *   Schemas should list every property in `required` (no optional fields) so they
   *   round-trip through OpenAI's strict mode.
   * @returns {Promise<{text: string, tokensUsed: number}>}
   */
  async generateText(prompt, options = {}) {
    throw new Error('generateText() must be implemented by subclass');
  }

  /**
   * Stream text from a prompt (async generator)
   * @param {string} prompt - The input prompt
   * @param {object} options - Generation options
   * @param {string} [options.model] - Model to use (provider-specific)
   * @yields {{ chunk: string }} - Text chunks as they arrive
   * @returns {AsyncGenerator<{chunk: string}, {tokensUsed: number}>}
   */
  async *generateTextStream(prompt, options = {}) {
    throw new Error('generateTextStream() must be implemented by subclass');
  }

  /**
   * Get the provider name
   * @returns {string}
   */
  getName() {
    throw new Error('getName() must be implemented by subclass');
  }
}

module.exports = LLMProvider;
