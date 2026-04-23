/**
 * Orchestrator Chat Validators
 */

const { z } = require('zod');

const sendOrchestratorMessageSchema = z.object({
  question: z
    .string({ required_error: 'Question is required' })
    .min(1, 'Question cannot be empty')
    .max(1000, 'Question is too long'),
  sessionId: z.string().uuid('Invalid session ID').optional(),
});

module.exports = {
  sendOrchestratorMessageSchema,
};
