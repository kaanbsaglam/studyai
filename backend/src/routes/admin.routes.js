/**
 * Admin Routes
 *
 * Protected routes for admin-only operations.
 */

const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/admin.middleware');
const {
  getUsers,
  getUser,
  updateUserTier,
  updateUserRole,
  deleteUser,
  getStats,
} = require('../controllers/admin.controller');

const router = Router();

// All routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

// GET /api/v1/admin/stats - System overview stats
router.get('/stats', getStats);

// GET /api/v1/admin/users - List all users
router.get('/users', getUsers);

// GET /api/v1/admin/users/:id - Get user details
router.get('/users/:id', getUser);

// PATCH /api/v1/admin/users/:id/tier - Update user tier
router.patch('/users/:id/tier', updateUserTier);

// PATCH /api/v1/admin/users/:id/role - Update user role
router.patch('/users/:id/role', updateUserRole);

// DELETE /api/v1/admin/users/:id - Delete user
router.delete('/users/:id', deleteUser);

module.exports = router;
