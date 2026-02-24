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

const manualFlashcardSetSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(100, 'Title is too long'),
  focusTopic: z
    .string()
    .max(200, 'Focus topic is too long')
    .optional(),
  cards: z
    .array(
      z.object({
        front: z.string().min(1, 'Front side cannot be empty').max(1000, 'Front side is too long'),
        back: z.string().min(1, 'Back side cannot be empty').max(2000, 'Back side is too long'),
      })
    )
    .min(1, 'At least 1 card is required')
    .max(100, 'Maximum 100 cards allowed'),
});

const updateFlashcardSetSchema = z.object({
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
  cards: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        front: z.string().min(1, 'Front side cannot be empty').max(1000, 'Front side is too long'),
        back: z.string().min(1, 'Back side cannot be empty').max(2000, 'Back side is too long'),
      })
    )
    .min(1, 'At least 1 card is required')
    .max(100, 'Maximum 100 cards allowed')
    .optional(),
});

module.exports = {
  createFlashcardSetSchema,
  manualFlashcardSetSchema,
  updateFlashcardSetSchema,
};
