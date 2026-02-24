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

const manualSummarySchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(100, 'Title is too long'),
  focusTopic: z
    .string()
    .max(200, 'Focus topic is too long')
    .optional(),
  content: z
    .string({ required_error: 'Content is required' })
    .min(1, 'Content cannot be empty')
    .max(50000, 'Content is too long'),
  length: z
    .enum(['short', 'medium', 'long'])
    .optional()
    .default('medium'),
});

const updateSummarySchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(100, 'Title is too long')
    .optional(),
  focusTopic: z
    .string()
    .max(200, 'Focus topic is too long')
    .optional()
    .nullable(),
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(50000, 'Content is too long')
    .optional(),
  length: z
    .enum(['short', 'medium', 'long'])
    .optional(),
});

module.exports = {
  createSummarySchema,
  manualSummarySchema,
  updateSummarySchema,
};
