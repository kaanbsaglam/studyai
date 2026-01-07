/**
 * Flashcard Validators
 */

const { z } = require('zod');

const createFlashcardSetSchema = z.object({
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
    .min(5, 'Minimum 5 flashcards')
    .max(50, 'Maximum 50 flashcards'),
  // Array of document IDs to generate from (empty = general knowledge)
  documentIds: z
    .array(z.string().uuid('Invalid document ID'))
    .max(10, 'Maximum 10 documents allowed')
    .optional()
    .default([]),
});

module.exports = {
  createFlashcardSetSchema,
};
