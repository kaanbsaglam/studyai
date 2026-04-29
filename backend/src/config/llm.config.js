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
    'gemini-2.0-flash':  { provider: 'gemini',  costWeight: 0.13 },
    'gemini-2.5-flash':  { provider: 'gemini',  costWeight: 0.80 },
    'gpt-4o-mini':       { provider: 'openai',  costWeight: 0.20 },
    'gpt-4.1-mini':      { provider: 'openai',  costWeight: 0.50 },
    'gpt-5-mini':        { provider: 'openai',  costWeight: 1.40 },
    'gpt-5':             { provider: 'openai',  costWeight: 1.55 },
    'gpt-4.1':           { provider: 'openai',  costWeight: 2.50 },
    'gpt-4o':            { provider: 'openai',  costWeight: 3.00 },
    'whisper-1':         { provider: 'openai',  costWeight: 0.10 },
  },

  // ── Scenario Config ─────────────────────────────────────────────
  // Each scenario has { primary, fallback }.
  // fallback: null = no fallback, fail immediately.
  tiers: {
    FREE: {
      chat:           { primary: 'gpt-4o-mini', fallback: null },
      chatTitle:      { primary: 'gpt-4o-mini', fallback: null },
      studyAid:       { primary: 'gpt-4o-mini', fallback: null },
      pipeline: {
        map:          { primary: 'gpt-4o-mini', fallback: null },
        reduce:       { primary: 'gpt-4o-mini', fallback: null },
        summarize:    { primary: 'gpt-4o-mini', fallback: null },
      },
      extraction: {
        vision:       { primary: 'gemini-2.5-flash', fallback: null },
        whisper:      { primary: 'whisper-1',        fallback: null },
      },
    },
    PREMIUM: {
      chat:             { primary: 'gpt-4o-mini', fallback: null },
      chatTitle:        { primary: 'gpt-4o-mini', fallback: null },
      studyAid:         { primary: 'gpt-4o-mini', fallback: null },
      topicExtraction:  { primary: 'gpt-4o-mini', fallback: null },
      orchestrator: {
        planner:        { primary: 'gpt-4o-mini', fallback: null },
        retriever:      { primary: 'gpt-4o-mini', fallback: null },
        synthesis:      { primary: 'gpt-5',       fallback: 'gpt-4o-mini' },
      },
      pipeline: {
        map:            { primary: 'gpt-4o-mini', fallback: null },
        reduce:         { primary: 'gpt-4o-mini', fallback: null },
        summarize:      { primary: 'gpt-4o-mini', fallback: null },
      },
      extraction: {
        vision:         { primary: 'gemini-2.0-flash', fallback: null },
        whisper:        { primary: 'whisper-1',        fallback: null },
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
