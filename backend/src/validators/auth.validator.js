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

const emailField = z
  .string({ required_error: 'Email is required' })
  .email('Invalid email format')
  .toLowerCase()
  .trim();

const passwordField = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(64, 'Password is too long');

/**
 * Register request schema
 */
const registerSchema = z.object({
  email: emailField,
  password: passwordField,
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
  email: emailField,
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

/**
 * Forgot password request schema
 */
const forgotPasswordSchema = z.object({
  email: emailField,
});

/**
 * Reset password request schema
 */
const resetPasswordSchema = z.object({
  token: z
    .string({ required_error: 'Token is required' })
    .min(1, 'Token is required'),
  newPassword: passwordField,
});

/**
 * Change password request schema (authenticated user)
 */
const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'Current password is required' })
    .min(1, 'Current password is required'),
  newPassword: passwordField,
});

/**
 * Google sign-in request schema (frontend posts the ID token from Google
 * Identity Services).
 */
const googleAuthSchema = z.object({
  idToken: z
    .string({ required_error: 'idToken is required' })
    .min(1, 'idToken is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  googleAuthSchema,
};
