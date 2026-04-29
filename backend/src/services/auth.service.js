/**
 * Auth Service
 *
 * Business logic for authentication: password hashing, JWT generation/verification.
 *
 * Usage:
 *   const authService = require('./services/auth.service');
 *   const hash = await authService.hashPassword('password123');
 *   const token = authService.generateToken(userId);
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 * @param {string} userId - User's UUID
 * @returns {string} JWT token
 */
function generateToken(userId) {
  return jwt.sign(
    { userId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload (contains userId)
 * @throws {JsonWebTokenError} If token is invalid
 * @throws {TokenExpiredError} If token has expired
 */
function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

/**
 * Generate a password-reset token. Returns the raw token (sent in the email)
 * and its sha256 hash (stored in the DB so a DB leak alone can't grant resets).
 */
function generateResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  return { token, tokenHash, expiresAt };
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateResetToken,
  hashResetToken,
};
