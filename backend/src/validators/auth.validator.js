/**
 * Auth Validators
 *
 * Zod schemas for validating authentication requests.
 *
 * Usage:
 *   const { registerSchema } = require('./validators/auth.validator');
 *   const data = registerSchema.parse(req.body);
 */

const { z } = require('zod');

/**
 * Register request schema
 */
const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name is too long')
    .trim()
    .optional(),
});

/**
 * Login request schema
 */
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
};
