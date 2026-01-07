/**
 * Admin Controller
 *
 * Handles admin-only operations like user management.
 */

const prisma = require('../lib/prisma');
const { asyncHandler, NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { getUserUsage, getTierLimits, formatBytes } = require('../services/tier.service');
const logger = require('../config/logger');

/**
 * Get all users with pagination
 * GET /api/v1/admin/users
 */
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Optional filters
  const { search, tier, role } = req.query;

  const where = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (tier && ['FREE', 'PREMIUM'].includes(tier)) {
    where.tier = tier;
  }

  if (role && ['USER', 'ADMIN'].includes(role)) {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        createdAt: true,
        _count: {
          select: {
            classrooms: true,
            documents: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * Get a single user with detailed stats
 * GET /api/v1/admin/users/:id
 */
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tier: true,
      createdAt: true,
      updatedAt: true,
      classrooms: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: { select: { documents: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Get usage stats
  const usage = await getUserUsage(id);
  const limits = getTierLimits(user.tier);

  res.json({
    success: true,
    data: {
      user: {
        ...user,
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
    },
  });
});

/**
 * Update a user's tier
 * PATCH /api/v1/admin/users/:id/tier
 */
const updateUserTier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tier } = req.body;

  if (!tier || !['FREE', 'PREMIUM'].includes(tier)) {
    throw new ValidationError('Invalid tier. Must be FREE or PREMIUM');
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('User');
  }

  // Prevent admins from changing their own tier accidentally
  if (id === req.user.id) {
    throw new ValidationError('Cannot change your own tier through admin panel');
  }

  await prisma.user.update({
    where: { id },
    data: { tier },
  });

  logger.info(`Admin ${req.user.id} changed user ${id} tier to ${tier}`);

  res.json({
    success: true,
    message: `User tier updated to ${tier}`,
  });
});

/**
 * Update a user's role
 * PATCH /api/v1/admin/users/:id/role
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['USER', 'ADMIN'].includes(role)) {
    throw new ValidationError('Invalid role. Must be USER or ADMIN');
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('User');
  }

  // Prevent admins from demoting themselves
  if (id === req.user.id && role !== 'ADMIN') {
    throw new ValidationError('Cannot demote yourself');
  }

  await prisma.user.update({
    where: { id },
    data: { role },
  });

  logger.info(`Admin ${req.user.id} changed user ${id} role to ${role}`);

  res.json({
    success: true,
    message: `User role updated to ${role}`,
  });
});

/**
 * Delete a user
 * DELETE /api/v1/admin/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('User');
  }

  // Prevent admins from deleting themselves
  if (id === req.user.id) {
    throw new ValidationError('Cannot delete yourself');
  }

  // Prevent deleting other admins
  if (user.role === 'ADMIN') {
    throw new ValidationError('Cannot delete another admin');
  }

  // Delete user (cascades to classrooms, documents, etc.)
  await prisma.user.delete({ where: { id } });

  logger.info(`Admin ${req.user.id} deleted user ${id}`);

  res.json({
    success: true,
    message: 'User deleted',
  });
});

/**
 * Get system stats overview
 * GET /api/v1/admin/stats
 */
const getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    freeUsers,
    premiumUsers,
    adminUsers,
    totalClassrooms,
    totalDocuments,
    storageUsed,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { tier: 'FREE' } }),
    prisma.user.count({ where: { tier: 'PREMIUM' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.classroom.count(),
    prisma.document.count(),
    prisma.document.aggregate({ _sum: { size: true } }),
  ]);

  res.json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        free: freeUsers,
        premium: premiumUsers,
        admins: adminUsers,
      },
      content: {
        classrooms: totalClassrooms,
        documents: totalDocuments,
        storageBytes: storageUsed._sum.size || 0,
        storageFormatted: formatBytes(storageUsed._sum.size || 0),
      },
    },
  });
});

module.exports = {
  getUsers,
  getUser,
  updateUserTier,
  updateUserRole,
  deleteUser,
  getStats,
};
