/**
 * Gemini Vision Extractor
 *
 * Multimodal PDF extraction using Google Gemini Vision API.
 * Extracts text and describes visual elements (images, charts, diagrams).
 * This is the primary extractor for PREMIUM tier users.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Extractor = require('./Extractor');
const { env } = require('../config/env');
const logger = require('../config/logger');

const EXTRACTION_PROMPT = `You are a document text extractor. Extract ALL text content from this PDF and describe visual elements.

Instructions:
1. Extract all readable text exactly as it appears, preserving structure
2. For images, charts, diagrams, figures: Use [IMAGE: description] format
3. For tables: Preserve structure using plain text
4. For math formulas: Represent in readable text format
5. Maintain logical reading order

Output extracted content directly without preamble.`;

class GeminiVisionExtractor extends Extractor {
  constructor(config = {}) {
    super(config);

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('Gemini API key not configured (GEMINI_API_KEY)');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }

    this.model = config.model || 'gemini-2.0-flash';
  }

  /**
   * Extract text from PDF using Gemini Vision API
   * @param {Buffer} buffer - PDF file content
   * @param {object} options - Extraction options
   * @param {string} [options.model] - Model to use (defaults to gemini-2.0-flash)
   * @returns {Promise<{text: string, tokensUsed: number}>}
   */
  async extract(buffer, options = {}) {
    if (!this.genAI) {
      throw new Error('Gemini Vision extractor is not configured. GEMINI_API_KEY is missing.');
    }

    const model = options.model || this.model;

    logger.debug('GeminiVisionExtractor: Starting extraction', {
      bufferSize: buffer.length,
      model,
    });

    try {
      const genModel = this.genAI.getGenerativeModel({ model });

      // Convert PDF buffer to base64
      const base64Pdf = buffer.toString('base64');

      // Create multimodal content with PDF and extraction prompt
      const result = await genModel.generateContent([
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Pdf,
          },
        },
        EXTRACTION_PROMPT,
      ]);

      const text = result.response.text();
      const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;

      logger.debug('GeminiVisionExtractor: Extraction complete', {
        model,
        tokensUsed,
        textLength: text.length,
      });

      return {
        text,
        tokensUsed,
      };
    } catch (error) {
      logger.error('GeminiVisionExtractor: Extraction failed', {
        model,
        error: error.message,
      });
      throw error;
    }
  }

  getName() {
    return 'gemini-vision';
  }

  getExtractionMethod() {
    return 'VISION';
  }
}

module.exports = GeminiVisionExtractor;
