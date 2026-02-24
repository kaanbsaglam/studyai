/**
 * Central LLM Configuration
 *
 * All model references across the system come from this file.
 * Two sections:
 *   1. Model Registry — every model with its provider and cost weight
 *   2. Scenario Config — tier-based primary/fallback for each use case
 */

module.exports = {
  // ── Model Registry ──────────────────────────────────────────────
  // Adding a new model = one line here + referencing it in a scenario below.
  // costWeight determines how raw tokens are converted to weighted tokens
  // for daily limit tracking.
  models: {
    'gemini-2.0-flash':  { provider: 'gemini',  costWeight: 0.15 },
    'gemini-2.5-pro':    { provider: 'gemini',  costWeight: 1.25 },
    'gpt-4o-mini':       { provider: 'openai',  costWeight: 0.2 },
    'whisper-1':         { provider: 'openai',  costWeight: 0.1 },
  },

  // ── Scenario Config ─────────────────────────────────────────────
  // Each scenario has { primary, fallback }.
  // fallback: null = no fallback, fail immediately.
  tiers: {
    FREE: {
      chat:           { primary: 'gemini-2.0-flash', fallback: null },
      studyAid:       { primary: 'gemini-2.0-flash', fallback: null },
      pipeline: {
        map:          { primary: 'gemini-2.0-flash', fallback: null },
        reduce:       { primary: 'gemini-2.0-flash', fallback: null },
        summarize:    { primary: 'gemini-2.0-flash', fallback: null },
      },
      extraction: {
        vision:       { primary: 'gemini-2.0-flash', fallback: null },
        whisper:      { primary: 'whisper-1',         fallback: null },
      },
    },
    PREMIUM: {
      chat:           { primary: 'gemini-2.0-flash', fallback: null },
      studyAid:       { primary: 'gemini-2.0-flash', fallback: null },
      pipeline: {
        map:          { primary: 'gemini-2.0-flash', fallback: null },
        reduce:       { primary: 'gemini-2.0-flash', fallback: null },
        summarize:    { primary: 'gemini-2.0-flash', fallback: null },
      },
      extraction: {
        vision:       { primary: 'gemini-2.0-flash', fallback: null },
        whisper:      { primary: 'whisper-1',         fallback: null },
      },
    },
  },

  // ── Provider Settings ───────────────────────────────────────────
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
