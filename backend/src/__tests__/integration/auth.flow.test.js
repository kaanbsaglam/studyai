/**
 * Auth flow integration test.
 *
 * Mounts the auth controllers behind a tiny Express app with the real
 * errorHandler and exercises register / login / me end-to-end via supertest.
 * Prisma + email + google are mocked.
 */

jest.mock('../../services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/google.service', () => ({
  verifyGoogleIdToken: jest.fn(),
}));

const express = require('express');
const request = require('supertest');

const prisma = require('../../lib/prisma');
const { verifyGoogleIdToken } = require('../../services/google.service');
const { sendEmail } = require('../../services/email.service');
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  googleAuth,
} = require('../../controllers/auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { errorHandler } = require('../../middleware/errorHandler');
const { hashPassword } = require('../../services/auth.service');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/auth/register', register);
  app.post('/auth/login', login);
  app.get('/auth/me', authenticate, getMe);
  app.post('/auth/forgot-password', forgotPassword);
  app.post('/auth/reset-password', resetPassword);
  app.post('/auth/change-password', authenticate, changePassword);
  app.post('/auth/google', googleAuth);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /auth/register', () => {
  it('creates user and returns token (201)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'new-id',
        role: 'USER',
        tier: 'FREE',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      })
    );

    const res = await request(buildApp())
      .post('/auth/register')
      .send({ email: 'NEW@User.COM', password: 'goodpassword', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('new@user.com');
    expect(res.body.data.user.id).toBe('new-id');
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.passwordHash).toBeUndefined(); // never leak
  });

  it('rejects duplicate email with 400', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'a@b.com' });

    const res = await request(buildApp())
      .post('/auth/register')
      .send({ email: 'a@b.com', password: 'goodpassword' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid input (Zod)', async () => {
    const res = await request(buildApp())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });
});

describe('POST /auth/login', () => {
  it('logs in with correct credentials', async () => {
    const passwordHash = await hashPassword('goodpassword');
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      passwordHash,
      name: null,
      role: 'USER',
      tier: 'FREE',
      createdAt: new Date(),
    });

    const res = await request(buildApp())
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'goodpassword' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe('u1');
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it('returns 401 for wrong password', async () => {
    const passwordHash = await hashPassword('right');
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@b.com', passwordHash, role: 'USER', tier: 'FREE',
    });

    const res = await request(buildApp())
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 (not 404) for unknown email — no enumeration', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/auth/login')
      .send({ email: 'nobody@nope.com', password: 'whatever' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for Google-only user with no password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@b.com', passwordHash: null, googleId: 'g123',
      role: 'USER', tier: 'FREE',
    });

    const res = await request(buildApp())
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'whatever' });

    expect(res.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('returns current user when token is valid', async () => {
    // First register/login to get a token
    const passwordHash = await hashPassword('goodpassword');
    const userRecord = {
      id: 'u1', email: 'a@b.com', passwordHash, name: 'Alice',
      role: 'USER', tier: 'FREE', createdAt: new Date(), updatedAt: new Date(),
    };
    prisma.user.findUnique.mockResolvedValue(userRecord);

    const loginRes = await request(buildApp())
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'goodpassword' });

    const token = loginRes.body.data.token;

    // findUnique called by both authenticate middleware and getMe
    prisma.user.findUnique.mockResolvedValue(userRecord);

    const meRes = await request(buildApp())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.id).toBe('u1');
    expect(meRes.body.data.user.passwordHash).toBeUndefined();
  });

  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed token', async () => {
    const res = await request(buildApp())
      .get('/auth/me')
      .set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 with valid signature but missing user', async () => {
    // Issue a token then make prisma return null
    const { generateToken } = require('../../services/auth.service');
    const token = generateToken('u1');
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(buildApp())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/forgot-password', () => {
  it('returns 200 with generic message even when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/auth/forgot-password')
      .send({ email: 'ghost@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('stores hashed reset token and sends email when user exists', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: 'Alice',
    });
    prisma.user.update.mockResolvedValue({});

    const res = await request(buildApp())
      .post('/auth/forgot-password')
      .send({ email: 'a@b.com' });

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const updateArg = prisma.user.update.mock.calls[0][0];
    expect(updateArg.data.passwordResetTokenHash).toEqual(expect.any(String));
    expect(updateArg.data.passwordResetExpiresAt).toBeInstanceOf(Date);

    // sendEmail is fire-and-forget, so just verify it was invoked
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe('POST /auth/reset-password', () => {
  it('rejects when token does not match any user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/auth/reset-password')
      .send({ token: 'nope', newPassword: 'goodpassword' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates password when token is valid', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
    prisma.user.update.mockResolvedValue({});

    const res = await request(buildApp())
      .post('/auth/reset-password')
      .send({ token: 'valid', newPassword: 'newgoodpassword' });

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const arg = prisma.user.update.mock.calls[0][0];
    expect(arg.data.passwordHash).toEqual(expect.any(String));
    expect(arg.data.passwordResetTokenHash).toBeNull();
    expect(arg.data.passwordResetExpiresAt).toBeNull();
  });
});

describe('POST /auth/google', () => {
  it('returns 401 when Google verification fails', async () => {
    verifyGoogleIdToken.mockRejectedValue(new Error('invalid'));

    const res = await request(buildApp())
      .post('/auth/google')
      .send({ idToken: 'whatever' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when email is not verified', async () => {
    verifyGoogleIdToken.mockResolvedValue({
      googleId: 'g1', email: 'a@b.com', emailVerified: false, name: 'A',
    });

    const res = await request(buildApp())
      .post('/auth/google')
      .send({ idToken: 't' });

    expect(res.status).toBe(401);
  });

  it('logs in existing google-linked user', async () => {
    verifyGoogleIdToken.mockResolvedValue({
      googleId: 'g1', email: 'a@b.com', emailVerified: true, name: 'Alice',
    });
    const userRecord = {
      id: 'u1', email: 'a@b.com', name: 'Alice', googleId: 'g1',
      role: 'USER', tier: 'FREE', createdAt: new Date(),
    };
    prisma.user.findUnique.mockResolvedValueOnce(userRecord); // by googleId

    const res = await request(buildApp())
      .post('/auth/google')
      .send({ idToken: 't' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe('u1');
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('links google account to existing email-only user', async () => {
    verifyGoogleIdToken.mockResolvedValue({
      googleId: 'g1', email: 'a@b.com', emailVerified: true, name: 'Alice',
    });
    prisma.user.findUnique
      .mockResolvedValueOnce(null)              // by googleId — not found
      .mockResolvedValueOnce({                   // by email — exists
        id: 'u1', email: 'a@b.com', name: null,
      });
    prisma.user.update.mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: 'Alice', googleId: 'g1',
      role: 'USER', tier: 'FREE', createdAt: new Date(),
    });

    const res = await request(buildApp())
      .post('/auth/google')
      .send({ idToken: 't' });

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const arg = prisma.user.update.mock.calls[0][0];
    expect(arg.data.googleId).toBe('g1');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates new user when email is unknown', async () => {
    verifyGoogleIdToken.mockResolvedValue({
      googleId: 'g1', email: 'new@b.com', emailVerified: true, name: 'New',
    });
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // by googleId
      .mockResolvedValueOnce(null); // by email
    prisma.user.create.mockResolvedValue({
      id: 'u2', email: 'new@b.com', name: 'New', googleId: 'g1',
      role: 'USER', tier: 'FREE', createdAt: new Date(),
    });

    const res = await request(buildApp())
      .post('/auth/google')
      .send({ idToken: 't' });

    expect(res.status).toBe(200);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(res.body.data.user.id).toBe('u2');
  });
});
