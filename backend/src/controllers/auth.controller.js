/**
 * Auth Controller
 *
 * Route handlers for authentication endpoints.
 */

const prisma = require('../lib/prisma');
const {
  hashPassword,
  comparePassword,
  generateToken,
  generateResetToken,
  hashResetToken,
} = require('../services/auth.service');
const { sendEmail } = require('../services/email.service');
const { passwordResetEmail } = require('../services/email.templates');
const { verifyGoogleIdToken } = require('../services/google.service');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  googleAuthSchema,
} = require('../validators/auth.validator');
const {
  ValidationError,
  AuthenticationError,
  asyncHandler,
} = require('../middleware/errorHandler');
const { env } = require('../config/env');
const logger = require('../config/logger');

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tier: user.tier,
    createdAt: user.createdAt,
    hasPassword: !!user.passwordHash,
    hasGoogle: !!user.googleId,
  };
}

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new ValidationError('Email already registered');
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name || null,
    },
  });

  const token = generateToken(user.id);

  res.status(201).json({
    success: true,
    data: { user: publicUser(user), token },
  });
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user || !user.passwordHash) {
    // No user, or a Google-only user with no password set yet.
    throw new AuthenticationError('Invalid email or password');
  }

  const isValidPassword = await comparePassword(data.password, user.passwordHash);

  if (!isValidPassword) {
    throw new AuthenticationError('Invalid email or password');
  }

  const token = generateToken(user.id);

  res.json({
    success: true,
    data: { user: publicUser(user), token },
  });
});

/**
 * Get current user
 * GET /api/v1/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  // authenticate middleware attached req.user already, but it's a partial
  // select. Re-read so hasPassword / hasGoogle are accurate.
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  res.json({
    success: true,
    data: { user: publicUser(user) },
  });
});

/**
 * Forgot password — generates a reset token and emails it.
 * Always returns 200 with a generic message to avoid user enumeration.
 *
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const data = forgotPasswordSchema.parse(req.body);
  const locale = (req.body.locale || req.headers['accept-language'] || 'en')
    .toString()
    .toLowerCase()
    .startsWith('tr')
    ? 'tr'
    : 'en';

  const user = await prisma.user.findUnique({ where: { email: data.email } });

  // Send email asynchronously so timing doesn't reveal account existence.
  if (user) {
    const { token, tokenHash, expiresAt } = generateResetToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${token}`;
    const { subject, html, text } = passwordResetEmail({
      name: user.name,
      resetUrl,
      locale,
    });

    sendEmail({ to: user.email, subject, html, text }).catch((err) => {
      logger.error('Failed to send password reset email', {
        userId: user.id,
        error: err.message,
      });
    });
  }

  res.json({
    success: true,
    message: 'If an account exists for that email, a reset link has been sent.',
  });
});

/**
 * Reset password using a valid token.
 * POST /api/v1/auth/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const data = resetPasswordSchema.parse(req.body);

  const tokenHash = hashResetToken(data.token);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    throw new ValidationError('Reset link is invalid or has expired');
  }

  const passwordHash = await hashPassword(data.newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
  });

  res.json({
    success: true,
    message: 'Password has been reset. Please log in with your new password.',
  });
});

/**
 * Change password (authenticated). Verifies current password unless the user
 * is a Google-only account that hasn't set one yet — in which case they should
 * use the forgot-password flow to set one.
 *
 * POST /api/v1/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const data = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  if (!user.passwordHash) {
    throw new ValidationError(
      'No password is set on this account. Use the "Set password" flow to create one.'
    );
  }

  const isValid = await comparePassword(data.currentPassword, user.passwordHash);
  if (!isValid) {
    throw new ValidationError('Current password is incorrect');
  }

  const passwordHash = await hashPassword(data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  res.json({ success: true, message: 'Password updated' });
});

/**
 * Google sign-in / sign-up.
 * POST /api/v1/auth/google
 * Body: { idToken }
 */
const googleAuth = asyncHandler(async (req, res) => {
  const data = googleAuthSchema.parse(req.body);

  let claims;
  try {
    claims = await verifyGoogleIdToken(data.idToken);
  } catch (err) {
    logger.warn('Google ID token verification failed', { error: err.message });
    throw new AuthenticationError('Invalid Google credential');
  }

  if (!claims.emailVerified || !claims.email) {
    throw new AuthenticationError('Google account email is not verified');
  }

  // 1) Existing Google-linked user
  let user = await prisma.user.findUnique({ where: { googleId: claims.googleId } });

  // 2) Existing email-only user — link this Google account to it
  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email: claims.email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: claims.googleId,
          name: byEmail.name || claims.name,
        },
      });
    }
  }

  // 3) Brand new user — create
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: claims.email,
        googleId: claims.googleId,
        name: claims.name,
        passwordHash: null,
      },
    });
  }

  const token = generateToken(user.id);

  res.json({
    success: true,
    data: { user: publicUser(user), token },
  });
});

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  googleAuth,
};
