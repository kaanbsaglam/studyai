/**
 * Classroom Validators
 *
 * Zod schemas for validating classroom requests.
 */

const { z } = require('zod');

/**
 * Create classroom schema
 */
const createClassroomSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name cannot be empty')
    .max(100, 'Name is too long')
    .trim(),
  description: z
    .string()
    .max(500, 'Description is too long')
    .trim()
    .optional(),
});

/**
 * Update classroom schema
 */
const updateClassroomSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name is too long')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description is too long')
    .trim()
    .nullable()
    .optional(),
});

module.exports = {
  createClassroomSchema,
  updateClassroomSchema,
};
