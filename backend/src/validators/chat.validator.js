/**
 * Chat Validators
 */

const { z } = require('zod');

const chatQuerySchema = z.object({
  question: z
    .string({ required_error: 'Question is required' })
    .min(1, 'Question cannot be empty')
    .max(1000, 'Question is too long'),
});

module.exports = {
  chatQuerySchema,
};
