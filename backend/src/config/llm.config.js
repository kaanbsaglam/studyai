/**
 * LLM Configuration
 *
 * Defines tier-based model selection and provider settings.
 * Models can be easily changed here without modifying service code.
 */

module.exports = {
  // Default provider when none specified
  defaultProvider: 'gemini',

  // Tier-based model configuration
  tiers: {
    FREE: {
      provider: 'gemini',
      primary: 'gemini-2.0-flash',
      fallback: 'gemini-2.0-flash',
    },
    PREMIUM: {
      provider: 'gemini',
      primary: 'gemini-2.0-flash',
      fallback: 'gemini-2.0-flash',
    },
  },

  // Provider-specific settings
  providers: {
    openai: {
      apiKeyEnv: 'OPENAI_LLM_SECRET_KEY',
    },
    gemini: {
      apiKeyEnv: 'GEMINI_API_KEY',
    },
    anthropic: {
      apiKeyEnv: 'ANTHROPIC_API_KEY',
    },
  },
};
