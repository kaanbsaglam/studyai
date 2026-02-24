/**
 * Tier Configuration
 *
 * Defines feature limits for each account tier.
 */

module.exports = {
  FREE: {
    maxClassrooms: 5,
    maxStorageBytes: 100 * 1024 * 1024,     // 100 MB
    maxTokensPerDay: 50000, // weighted tokens, calculated using costWeight from llm.config.js
  },
  PREMIUM: {
    maxClassrooms: 50,
    maxStorageBytes: 2 * 1024 * 1024 * 1024, // 2 GB
    maxTokensPerDay: 1000000, // weighted tokens, calculated using costWeight from llm.config.js
  },
};
