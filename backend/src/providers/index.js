/**
 * LLM Provider Registry
 *
 * Factory for creating and accessing LLM provider instances.
 * Providers are lazily instantiated and cached.
 */

const OpenAIProvider = require('./OpenAIProvider');
const GeminiProvider = require('./GeminiProvider');
const logger = require('../config/logger');

// Provider class registry
const providerClasses = {
  openai: OpenAIProvider,
  gemini: GeminiProvider,
};

// Cached provider instances (singleton per provider)
const providerInstances = {};

/**
 * Get a provider instance by name
 * @param {string} providerName - Provider name ('openai', 'gemini', etc.)
 * @returns {LLMProvider} Provider instance
 */
function getProvider(providerName) {
  const name = providerName.toLowerCase();

  // Return cached instance if available
  if (providerInstances[name]) {
    return providerInstances[name];
  }

  // Get provider class
  const ProviderClass = providerClasses[name];
  if (!ProviderClass) {
    throw new Error(`Unknown LLM provider: ${providerName}. Available: ${Object.keys(providerClasses).join(', ')}`);
  }

  // Instantiate and cache
  logger.info(`Initializing LLM provider: ${name}`);
  providerInstances[name] = new ProviderClass();

  return providerInstances[name];
}

/**
 * Check if a provider is available
 * @param {string} providerName - Provider name
 * @returns {boolean}
 */
function hasProvider(providerName) {
  return providerClasses.hasOwnProperty(providerName.toLowerCase());
}

/**
 * Get list of available provider names
 * @returns {string[]}
 */
function getAvailableProviders() {
  return Object.keys(providerClasses);
}

module.exports = {
  getProvider,
  hasProvider,
  getAvailableProviders,
};
