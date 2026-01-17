/**
 * Extractor Registry
 *
 * Factory for creating and accessing extractor instances.
 * Extractors are lazily instantiated and cached.
 */

const PdfParseExtractor = require('./PdfParseExtractor');
const GeminiVisionExtractor = require('./GeminiVisionExtractor');
const logger = require('../config/logger');

// Extractor class registry
const extractorClasses = {
  'pdf-parse': PdfParseExtractor,
  'gemini-vision': GeminiVisionExtractor,
};

// Cached extractor instances (singleton per extractor)
const extractorInstances = {};

/**
 * Get an extractor instance by name
 * @param {string} extractorName - Extractor name ('pdf-parse', 'gemini-vision')
 * @returns {Extractor} Extractor instance
 */
function getExtractor(extractorName) {
  const name = extractorName.toLowerCase();

  // Return cached instance if available
  if (extractorInstances[name]) {
    return extractorInstances[name];
  }

  // Get extractor class
  const ExtractorClass = extractorClasses[name];
  if (!ExtractorClass) {
    throw new Error(`Unknown extractor: ${extractorName}. Available: ${Object.keys(extractorClasses).join(', ')}`);
  }

  // Instantiate and cache
  logger.info(`Initializing extractor: ${name}`);
  extractorInstances[name] = new ExtractorClass();

  return extractorInstances[name];
}

/**
 * Check if an extractor is available
 * @param {string} extractorName - Extractor name
 * @returns {boolean}
 */
function hasExtractor(extractorName) {
  return Object.prototype.hasOwnProperty.call(extractorClasses, extractorName.toLowerCase());
}

/**
 * Get list of available extractor names
 * @returns {string[]}
 */
function getAvailableExtractors() {
  return Object.keys(extractorClasses);
}

module.exports = {
  getExtractor,
  hasExtractor,
  getAvailableExtractors,
};
