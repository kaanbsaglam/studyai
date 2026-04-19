/**
 * Tier Middleware
 *
 * Gates routes behind tier requirements. Must be used after authenticate.
 */

const { AuthorizationError } = require('./errorHandler');

/**
 * Require PREMIUM tier. Returns 403 for FREE users with a message
 * suggesting an upgrade.
 */
function requirePremium(req, res, next) {
  if (!req.user) {
    throw new AuthorizationError('Authentication required');
  }
  if (req.user.tier !== 'PREMIUM') {
    throw new AuthorizationError(
      'This feature is available to PREMIUM users only. Upgrade to access it.',
    );
  }
  next();
}

module.exports = { requirePremium };
