/**
 * Admin Middleware
 *
 * Restricts access to admin-only routes.
 * Must be used after authenticate middleware.
 */

const { AuthorizationError } = require('./errorHandler');

/**
 * Require admin role middleware
 *
 * Checks if the authenticated user has ADMIN role.
 * Must be used after the authenticate middleware.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    throw new AuthorizationError('Authentication required');
  }

  if (req.user.role !== 'ADMIN') {
    throw new AuthorizationError('Admin access required');
  }

  next();
}

module.exports = {
  requireAdmin,
};
