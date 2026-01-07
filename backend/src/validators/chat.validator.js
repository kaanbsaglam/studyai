/**
 * Chat Validators
 */

const { z } = require('zod');

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(10000),
});

const chatQuerySchema = z.object({
  question: z
    .string({ required_error: 'Question is required' })
    .min(1, 'Question cannot be empty')
    .max(1000, 'Question is too long'),
  // Array of document IDs to use as full context
  documentIds: z
    .array(z.string().uuid('Invalid document ID'))
    .max(10, 'Maximum 10 documents allowed')
    .optional()
    .default([]),
  // Conversation history for context
  conversationHistory: z
    .array(messageSchema)
    .max(50, 'Conversation history too long')
    .optional()
    .default([]),
});

module.exports = {
  chatQuerySchema,
};
