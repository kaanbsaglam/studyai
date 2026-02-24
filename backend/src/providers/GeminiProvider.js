/**
 * Gemini Provider
 *
 * Implementation of LLMProvider for Google Gemini models.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const LLMProvider = require('./LLMProvider');
const { env } = require('../config/env');
const logger = require('../config/logger');

class GeminiProvider extends LLMProvider {
  constructor(config = {}) {
    super(config);

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('Gemini API key not configured (GEMINI_API_KEY)');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Generate text using Google Gemini models
   * @param {string} prompt - The input prompt
   * @param {object} options - Generation options
   * @param {string} options.model - Model to use (required)
   * @returns {Promise<{text: string, tokensUsed: number}>}
   */
  async generateText(prompt, options = {}) {
    if (!this.genAI) {
      throw new Error('Gemini provider is not configured. GEMINI_API_KEY is missing.');
    }

    if (!options.model) {
      throw new Error('GeminiProvider requires a model name');
    }

    const model = options.model;

    logger.debug('Gemini generateText called', { model, promptLength: prompt.length });

    try {
      const genModel = this.genAI.getGenerativeModel({ model });
      const result = await genModel.generateContent(prompt);

      const text = result.response.text();
      const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;

      logger.debug('Gemini response received', { model, tokensUsed, textLength: text.length });

      return { text, tokensUsed };
    } catch (error) {
      logger.error('Gemini generateText failed', {
        model,
        error: error.message,
      });
      throw error;
    }
  }

  getName() {
    return 'gemini';
  }
}

module.exports = GeminiProvider;
