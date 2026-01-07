/**
 * Quiz Validators
 */

const { z } = require('zod');

const createQuizSetSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(100, 'Title is too long'),
  focusTopic: z
    .string()
    .max(200, 'Focus topic is too long')
    .optional(),
  count: z
    .number({ required_error: 'Count is required' })
    .int('Count must be a whole number')
    .min(5, 'Minimum 5 questions')
    .max(30, 'Maximum 30 questions'),
  // Array of document IDs to generate from (empty = general knowledge)
  documentIds: z
    .array(z.string().uuid('Invalid document ID'))
    .max(10, 'Maximum 10 documents allowed')
    .optional()
    .default([]),
});

const recordAttemptSchema = z.object({
  score: z
    .number({ required_error: 'Score is required' })
    .int('Score must be a whole number')
    .min(0, 'Score cannot be negative'),
  totalQuestions: z
    .number({ required_error: 'Total questions is required' })
    .int('Total questions must be a whole number')
    .min(1, 'Must have at least 1 question'),
});

module.exports = {
  createQuizSetSchema,
  recordAttemptSchema,
};
