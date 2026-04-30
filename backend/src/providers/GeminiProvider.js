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
   * @param {object} [options.schema] - Optional response schema for structured JSON output
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
    const generationConfig = options.schema
      ? { responseMimeType: 'application/json', responseSchema: options.schema }
      : undefined;

    logger.debug('Gemini generateText called', { model, promptLength: prompt.length, structured: !!options.schema });

    try {
      const genModel = this.genAI.getGenerativeModel(
        generationConfig ? { model, generationConfig } : { model }
      );
      const result = await genModel.generateContent(prompt);

      const text = result.response.text();
      const usage = result.response.usageMetadata || {};
      const tokensIn = usage.promptTokenCount || 0;
      const tokensOut = usage.candidatesTokenCount || 0;
      const tokensUsed = usage.totalTokenCount || (tokensIn + tokensOut);

      logger.debug('Gemini response received', { model, tokensUsed, textLength: text.length });

      return { text, tokensUsed, tokensIn, tokensOut };
    } catch (error) {
      logger.error('Gemini generateText failed', {
        model,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Stream text using Google Gemini models (async generator)
   * @param {string} prompt - The input prompt
   * @param {object} options - Generation options
   * @param {string} options.model - Model to use (required)
   * @yields {{ chunk: string }}
   * @returns {AsyncGenerator<{chunk: string}, {tokensUsed: number}>}
   */
  async *generateTextStream(prompt, options = {}) {
    if (!this.genAI) {
      throw new Error('Gemini provider is not configured. GEMINI_API_KEY is missing.');
    }

    if (!options.model) {
      throw new Error('GeminiProvider requires a model name');
    }

    const model = options.model;

    logger.debug('Gemini generateTextStream called', { model, promptLength: prompt.length });

    try {
      const genModel = this.genAI.getGenerativeModel({ model });
      const result = await genModel.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield { chunk: text };
        }
      }

      // Get final aggregated response for token usage
      const aggregated = await result.response;
      const usage = aggregated.usageMetadata || {};
      const tokensIn = usage.promptTokenCount || 0;
      const tokensOut = usage.candidatesTokenCount || 0;
      const tokensUsed = usage.totalTokenCount || (tokensIn + tokensOut);

      logger.debug('Gemini streaming completed', { model, tokensUsed });

      return { tokensUsed, tokensIn, tokensOut };
    } catch (error) {
      logger.error('Gemini generateTextStream failed', {
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
