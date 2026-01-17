/**
 * PDF Parse Extractor
 *
 * Text-only PDF extraction using pdf-parse library.
 * This is the default extractor for FREE tier users.
 */

const pdfParse = require('pdf-parse');
const Extractor = require('./Extractor');
const logger = require('../config/logger');

class PdfParseExtractor extends Extractor {
  constructor(config = {}) {
    super(config);
  }

  /**
   * Extract text from PDF using pdf-parse
   * @param {Buffer} buffer - PDF file content
   * @param {object} options - Extraction options (unused for this extractor)
   * @returns {Promise<{text: string, tokensUsed: number}>}
   */
  async extract(buffer, options = {}) {
    logger.debug('PdfParseExtractor: Starting extraction', { bufferSize: buffer.length });

    try {
      const data = await pdfParse(buffer);
      const text = data.text;

      logger.debug('PdfParseExtractor: Extraction complete', {
        textLength: text.length,
        pages: data.numpages,
      });

      return {
        text,
        tokensUsed: 0, // No API tokens used for local extraction
      };
    } catch (error) {
      logger.error('PdfParseExtractor: Extraction failed', { error: error.message });
      throw new Error('Failed to extract text from PDF');
    }
  }

  getName() {
    return 'pdf-parse';
  }

  getExtractionMethod() {
    return 'TEXT_ONLY';
  }
}

module.exports = PdfParseExtractor;
