/**
 * Auth Middleware
 *
 * JWT verification middleware for protecting routes.
 *
 * Usage:
 *   const { authenticate } = require('./middleware/auth.middleware');
 *   router.get('/me', authenticate, controller.getMe);
 */

const { verifyToken } = require('../services/auth.service');
const { AuthenticationError } = require('./errorHandler');
const prisma = require('../lib/prisma');

/**
 * Authenticate middleware
 *
 * Verifies JWT token from Authorization header and attaches user to request.
 * Expects header format: "Bearer <token>"
 */
async function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const decoded = verifyToken(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        createdAt: true,
        updatedAt: true,
        // Don't select passwordHash
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    // Let error handler deal with JWT errors (JsonWebTokenError, TokenExpiredError)
    next(error);
  }
}

module.exports = {
  authenticate,
};
