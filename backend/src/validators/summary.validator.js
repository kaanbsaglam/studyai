/**
 * Summary Validators
 */

const { z } = require('zod');

const createSummarySchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(100, 'Title is too long'),
  focusTopic: z
    .string()
    .max(200, 'Focus topic is too long')
    .optional(),
  length: z
    .enum(['short', 'medium', 'long'], {
      required_error: 'Length is required',
      invalid_type_error: 'Length must be short, medium, or long',
    }),
  // Array of document IDs to summarize (empty = general knowledge)
  documentIds: z
    .array(z.string().uuid('Invalid document ID'))
    .max(10, 'Maximum 10 documents allowed')
    .optional()
    .default([]),
});

module.exports = {
  createSummarySchema,
};
