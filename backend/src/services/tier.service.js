/**
 * Tier Service
 *
 * Manages tier limits and usage tracking.
 */

const prisma = require('../lib/prisma');
const logger = require('../config/logger');

// Tier limits configuration
const TIER_LIMITS = {
  FREE: {
    maxClassrooms: 5,
    maxStorageBytes: 100 * 1024 * 1024, // 100 MB
    maxTokensPerDay: 50000,
  },
  PREMIUM: {
    maxClassrooms: 50,
    maxStorageBytes: 2 * 1024 * 1024 * 1024, // 2 GB
    maxTokensPerDay: 1000000,
  },
};

/**
 * Get limits for a tier
 * @param {string} tier - 'FREE' or 'PREMIUM'
 * @returns {object} Tier limits
 */
function getTierLimits(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.FREE;
}

/**
 * Get user's current usage stats
 * @param {string} userId
 * @returns {Promise<object>} Usage stats
 */
async function getUserUsage(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get counts in parallel
  const [classroomCount, storageUsed, dailyUsage] = await Promise.all([
    // Count classrooms
    prisma.classroom.count({
      where: { userId },
    }),

    // Sum document sizes
    prisma.document.aggregate({
      where: { userId },
      _sum: { size: true },
    }),

    // Get today's token usage
    prisma.dailyUsage.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    }),
  ]);

  return {
    classrooms: classroomCount,
    storageBytes: storageUsed._sum.size || 0,
    tokensToday: dailyUsage?.tokensUsed || 0,
  };
}

/**
 * Check if user can create a new classroom
 * @param {string} userId
 * @param {string} tier
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function canCreateClassroom(userId, tier) {
  const limits = getTierLimits(tier);
  const usage = await getUserUsage(userId);

  if (usage.classrooms >= limits.maxClassrooms) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${limits.maxClassrooms} classrooms for your ${tier} plan. Upgrade to create more.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can upload a document of given size
 * @param {string} userId
 * @param {string} tier
 * @param {number} fileSize - Size in bytes
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function canUploadDocument(userId, tier, fileSize) {
  const limits = getTierLimits(tier);
  const usage = await getUserUsage(userId);

  const newTotal = usage.storageBytes + fileSize;

  if (newTotal > limits.maxStorageBytes) {
    const usedMB = Math.round(usage.storageBytes / (1024 * 1024));
    const limitMB = Math.round(limits.maxStorageBytes / (1024 * 1024));
    return {
      allowed: false,
      reason: `Storage limit reached. You're using ${usedMB}MB of ${limitMB}MB. Upgrade for more storage.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can send a chat message (has tokens remaining)
 * @param {string} userId
 * @param {string} tier
 * @returns {Promise<{allowed: boolean, reason?: string, remaining?: number}>}
 */
async function canUseChat(userId, tier) {
  const limits = getTierLimits(tier);
  const usage = await getUserUsage(userId);

  const remaining = limits.maxTokensPerDay - usage.tokensToday;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Daily token limit reached. You've used ${limits.maxTokensPerDay.toLocaleString()} tokens today. Upgrade for more or try again tomorrow.`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining };
}

/**
 * Record token usage for a chat interaction
 * @param {string} userId
 * @param {number} tokensUsed - Total tokens (input + output)
 */
async function recordTokenUsage(userId, tokensUsed) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyUsage.upsert({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
    update: {
      tokensUsed: {
        increment: tokensUsed,
      },
    },
    create: {
      userId,
      date: today,
      tokensUsed,
    },
  });

  logger.debug(`Recorded ${tokensUsed} tokens for user ${userId}`);
}

/**
 * Format bytes to human readable string
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

module.exports = {
  TIER_LIMITS,
  getTierLimits,
  getUserUsage,
  canCreateClassroom,
  canUploadDocument,
  canUseChat,
  recordTokenUsage,
  formatBytes,
};
