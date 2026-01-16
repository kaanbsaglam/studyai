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
   * @returns {Promise<{text: string, tokensUsed: number}>}
   */
  async generateText(prompt, options = {}) {
    throw new Error('generateText() must be implemented by subclass');
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
