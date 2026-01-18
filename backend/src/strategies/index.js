/**
 * Strategy Registry
 *
 * Factory for creating and accessing strategy instances.
 * Strategies are lazily instantiated and cached.
 */

const QuizStrategy = require('./QuizStrategy');
const FlashcardStrategy = require('./FlashcardStrategy');
const SummaryStrategy = require('./SummaryStrategy');
const logger = require('../config/logger');

// Strategy class registry
const strategyClasses = {
  quiz: QuizStrategy,
  flashcard: FlashcardStrategy,
  summary: SummaryStrategy,
};

// Cached strategy instances (singleton per strategy)
const strategyInstances = {};

/**
 * Get a strategy instance by name
 * @param {string} strategyName - Strategy name ('quiz', 'flashcard', 'summary')
 * @returns {Strategy} Strategy instance
 */
function getStrategy(strategyName) {
  const name = strategyName.toLowerCase();

  // Return cached instance if available
  if (strategyInstances[name]) {
    return strategyInstances[name];
  }

  // Get strategy class
  const StrategyClass = strategyClasses[name];
  if (!StrategyClass) {
    throw new Error(`Unknown strategy: ${strategyName}. Available: ${Object.keys(strategyClasses).join(', ')}`);
  }

  // Instantiate and cache
  logger.info(`Initializing strategy: ${name}`);
  strategyInstances[name] = new StrategyClass();

  return strategyInstances[name];
}

/**
 * Check if a strategy is available
 * @param {string} strategyName - Strategy name
 * @returns {boolean}
 */
function hasStrategy(strategyName) {
  return Object.prototype.hasOwnProperty.call(strategyClasses, strategyName.toLowerCase());
}

/**
 * Get list of available strategy names
 * @returns {string[]}
 */
function getAvailableStrategies() {
  return Object.keys(strategyClasses);
}

module.exports = {
  getStrategy,
  hasStrategy,
  getAvailableStrategies,
};
