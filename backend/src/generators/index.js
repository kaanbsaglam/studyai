/**
 * Generator Registry
 *
 * Factory for creating and accessing generator instances.
 * Generators are lazily instantiated and cached.
 */

const QuizGenerator = require('./QuizGenerator');
const FlashcardGenerator = require('./FlashcardGenerator');
const SummaryGenerator = require('./SummaryGenerator');
const logger = require('../config/logger');

// Generator class registry
const generatorClasses = {
  quiz: QuizGenerator,
  flashcard: FlashcardGenerator,
  summary: SummaryGenerator,
};

// Cached generator instances (singleton per generator)
const generatorInstances = {};

/**
 * Get a generator instance by name
 * @param {string} generatorName - Generator name ('quiz', 'flashcard', 'summary')
 * @returns {Generator} Generator instance
 */
function getGenerator(generatorName) {
  const name = generatorName.toLowerCase();

  // Return cached instance if available
  if (generatorInstances[name]) {
    return generatorInstances[name];
  }

  // Get generator class
  const GeneratorClass = generatorClasses[name];
  if (!GeneratorClass) {
    throw new Error(`Unknown generator: ${generatorName}. Available: ${Object.keys(generatorClasses).join(', ')}`);
  }

  // Instantiate and cache
  logger.info(`Initializing generator: ${name}`);
  generatorInstances[name] = new GeneratorClass();

  return generatorInstances[name];
}

/**
 * Check if a generator is available
 * @param {string} generatorName - Generator name
 * @returns {boolean}
 */
function hasGenerator(generatorName) {
  return Object.prototype.hasOwnProperty.call(generatorClasses, generatorName.toLowerCase());
}

/**
 * Get list of available generator names
 * @returns {string[]}
 */
function getAvailableGenerators() {
  return Object.keys(generatorClasses);
}

module.exports = {
  getGenerator,
  hasGenerator,
  getAvailableGenerators,
};
