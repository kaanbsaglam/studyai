/**
 * OpenAI Provider
 *
 * Implementation of LLMProvider for OpenAI GPT models.
 */

const OpenAI = require('openai');
const LLMProvider = require('./LLMProvider');
const { env } = require('../config/env');
const logger = require('../config/logger');

class OpenAIProvider extends LLMProvider {
  constructor(config = {}) {
    super(config);

    const apiKey = env.OPENAI_LLM_SECRET_KEY;
    if (!apiKey) {
      logger.warn('OpenAI LLM API key not configured (OPENAI_LLM_SECRET_KEY)');
      this.client = null;
    } else {
      this.client = new OpenAI({ apiKey });
    }
  }

  /**
   * Generate text using OpenAI GPT models
   * @param {string} prompt - The input prompt
   * @param {object} options - Generation options
   * @param {string} [options.model='gpt-4o-mini'] - Model to use
   * @returns {Promise<{text: string, tokensUsed: number}>}
   */
  async generateText(prompt, options = {}) {
    if (!this.client) {
      throw new Error('OpenAI provider is not configured. OPENAI_LLM_SECRET_KEY is missing.');
    }

    const model = options.model || 'gpt-4o-mini';

    logger.debug('OpenAI generateText called', { model, promptLength: prompt.length });

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const text = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;

      logger.debug('OpenAI response received', { model, tokensUsed, textLength: text.length });

      return { text, tokensUsed };
    } catch (error) {
      logger.error('OpenAI generateText failed', {
        model,
        error: error.message,
        code: error.code,
      });
      throw error;
    }
  }

  getName() {
    return 'openai';
  }
}

module.exports = OpenAIProvider;
