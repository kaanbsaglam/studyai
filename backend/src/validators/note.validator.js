/**
 * Note Validators
 */

const { z } = require('zod');

const createNoteSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(200, 'Title is too long'),
  content: z
    .string()
    .max(50000, 'Content is too long')
    .optional()
    .default(''),
  documentId: z
    .string()
    .uuid('Invalid document ID')
    .optional()
    .nullable(),
});

const updateNoteSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title is too long')
    .optional(),
  content: z
    .string()
    .max(50000, 'Content is too long')
    .optional(),
});

module.exports = {
  createNoteSchema,
  updateNoteSchema,
};
