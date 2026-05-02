/**
 * Integration test helpers.
 *
 * Provides:
 *  - buildApp(routes): tiny Express app with json + the real errorHandler.
 *  - tokenFor(userId): JWT for the supplied user id.
 *  - injectUser(user): a middleware that stamps req.user without hitting Prisma.
 *    Useful for testing controllers in isolation from authenticate's DB lookup.
 */

const express = require('express');
const { generateToken } = require('../../services/auth.service');
const { errorHandler } = require('../../middleware/errorHandler');

function buildApp(mountFn) {
  const app = express();
  app.use(express.json());
  mountFn(app);
  app.use(errorHandler);
  return app;
}

function tokenFor(userId) {
  return generateToken(userId);
}

function injectUser(user) {
  return (req, res, next) => {
    req.user = user;
    next();
  };
}

const FREE_USER = {
  id: 'user-free',
  email: 'free@example.com',
  name: 'Free',
  role: 'USER',
  tier: 'FREE',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PREMIUM_USER = { ...FREE_USER, id: 'user-premium', tier: 'PREMIUM' };
const ADMIN_USER = { ...FREE_USER, id: 'user-admin', role: 'ADMIN' };
const OTHER_USER = { ...FREE_USER, id: 'user-other' };

module.exports = {
  buildApp,
  tokenFor,
  injectUser,
  FREE_USER,
  PREMIUM_USER,
  ADMIN_USER,
  OTHER_USER,
};
