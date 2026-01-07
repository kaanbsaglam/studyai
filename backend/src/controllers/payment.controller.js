/**
 * Payment Controller
 *
 * Mock payment handlers for tier upgrades.
 * In production, this would integrate with Stripe or similar.
 */

const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../middleware/errorHandler');
const { getTierLimits, getUserUsage, formatBytes } = require('../services/tier.service');
const logger = require('../config/logger');

/**
 * Get user's current usage and tier info
 * GET /api/v1/account/usage
 */
const getUsage = asyncHandler(async (req, res) => {
  const usage = await getUserUsage(req.user.id);
  const limits = getTierLimits(req.user.tier);

  res.json({
    success: true,
    data: {
      tier: req.user.tier,
      usage: {
        classrooms: usage.classrooms,
        maxClassrooms: limits.maxClassrooms,
        storageBytes: usage.storageBytes,
        storageFormatted: formatBytes(usage.storageBytes),
        maxStorageBytes: limits.maxStorageBytes,
        maxStorageFormatted: formatBytes(limits.maxStorageBytes),
        tokensToday: usage.tokensToday,
        maxTokensPerDay: limits.maxTokensPerDay,
      },
    },
  });
});

/**
 * Mock upgrade to premium
 * POST /api/v1/account/upgrade
 *
 * In production, this would:
 * 1. Create Stripe checkout session
 * 2. Handle webhook for payment confirmation
 * 3. Then upgrade the user
 */
const upgradeToPremium = asyncHandler(async (req, res) => {
  // Check if already premium
  if (req.user.tier === 'PREMIUM') {
    throw new ValidationError('You are already on the Premium plan');
  }

  // Mock: In production, verify payment first
  // For now, just upgrade immediately

  await prisma.user.update({
    where: { id: req.user.id },
    data: { tier: 'PREMIUM' },
  });

  logger.info(`User ${req.user.id} upgraded to PREMIUM`);

  // Get new limits to return
  const limits = getTierLimits('PREMIUM');

  res.json({
    success: true,
    message: 'Successfully upgraded to Premium!',
    data: {
      tier: 'PREMIUM',
      limits: {
        maxClassrooms: limits.maxClassrooms,
        maxStorageFormatted: formatBytes(limits.maxStorageBytes),
        maxTokensPerDay: limits.maxTokensPerDay,
      },
    },
  });
});

/**
 * Mock downgrade to free (for testing)
 * POST /api/v1/account/downgrade
 */
const downgradeToFree = asyncHandler(async (req, res) => {
  if (req.user.tier === 'FREE') {
    throw new ValidationError('You are already on the Free plan');
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { tier: 'FREE' },
  });

  logger.info(`User ${req.user.id} downgraded to FREE`);

  res.json({
    success: true,
    message: 'Downgraded to Free plan',
  });
});

module.exports = {
  getUsage,
  upgradeToPremium,
  downgradeToFree,
};
