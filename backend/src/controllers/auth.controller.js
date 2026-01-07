/**
 * Auth Controller
 *
 * Route handlers for authentication endpoints.
 */

const prisma = require('../lib/prisma');
const { hashPassword, comparePassword, generateToken } = require('../services/auth.service');
const { registerSchema, loginSchema } = require('../validators/auth.validator');
const { ValidationError, AuthenticationError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
  // Validate input
  const data = registerSchema.parse(req.body);

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new ValidationError('Email already registered');
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  // Generate token
  const token = generateToken(user.id);

  res.status(201).json({
    success: true,
    data: {
      user,
      token,
    },
  });
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  // Validate input
  const data = loginSchema.parse(req.body);

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Compare password
  const isValidPassword = await comparePassword(data.password, user.passwordHash);

  if (!isValidPassword) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Generate token
  const token = generateToken(user.id);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      token,
    },
  });
});

/**
 * Get current user
 * GET /api/v1/auth/me
 * Requires authentication
 */
const getMe = asyncHandler(async (req, res) => {
  // User is already attached by authenticate middleware
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

module.exports = {
  register,
  login,
  getMe,
};
