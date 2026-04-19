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
  documentIds: z
    .array(z.string().uuid('Invalid document ID'))
    .max(10, 'Maximum 10 documents allowed')
    .optional()
    .default([]),
});

const addOrchestratorDocumentsSchema = z.object({
  documentIds: z
    .array(z.string().uuid('Invalid document ID'))
    .min(1, 'At least one document ID is required')
    .max(10, 'Maximum 10 documents allowed'),
});

module.exports = {
  sendOrchestratorMessageSchema,
  addOrchestratorDocumentsSchema,
};
