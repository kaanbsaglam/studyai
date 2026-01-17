/**
 * Extractor Base Class
 *
 * Abstract base class that defines the interface for all PDF extractors.
 * All extractor implementations must extend this class.
 */

class Extractor {
  constructor(config = {}) {
    if (this.constructor === Extractor) {
      throw new Error('Extractor is an abstract class and cannot be instantiated directly');
    }
    this.config = config;
  }

  /**
   * Extract text from a PDF buffer
   * @param {Buffer} buffer - PDF file content
   * @param {object} options - Extraction options
   * @returns {Promise<{text: string, tokensUsed: number}>}
   */
  async extract(buffer, options = {}) {
    throw new Error('extract() must be implemented by subclass');
  }

  /**
   * Get the extractor name
   * @returns {string}
   */
  getName() {
    throw new Error('getName() must be implemented by subclass');
  }

  /**
   * Get the extraction method for database storage
   * @returns {'TEXT_ONLY' | 'VISION'}
   */
  getExtractionMethod() {
    throw new Error('getExtractionMethod() must be implemented by subclass');
  }
}

module.exports = Extractor;
