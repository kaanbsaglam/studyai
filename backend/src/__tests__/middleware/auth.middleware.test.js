/**
 * Auth middleware tests.
 *
 * Verifies header parsing, token verification, prisma lookup, and error
 * forwarding behavior of the authenticate middleware.
 */

const prisma = require('../../lib/prisma');
const { authenticate } = require('../../middleware/auth.middleware');
const { generateToken } = require('../../services/auth.service');
const { AuthenticationError } = require('../../middleware/errorHandler');

function makeReq(headers = {}) {
  return { headers };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authenticate middleware', () => {
  it('forwards AuthenticationError when no Authorization header', async () => {
    const req = makeReq();
    const next = jest.fn();
    await authenticate(req, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.message).toMatch(/No token/);
  });

  it('forwards AuthenticationError when scheme is not Bearer', async () => {
    const req = makeReq({ authorization: 'Basic abc' });
    const next = jest.fn();
    await authenticate(req, {}, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AuthenticationError);
  });

  it('forwards JWT error for malformed token', async () => {
    const req = makeReq({ authorization: 'Bearer not-a-jwt' });
    const next = jest.fn();
    await authenticate(req, {}, next);
    const err = next.mock.calls[0][0];
    // jsonwebtoken throws JsonWebTokenError; downstream errorHandler maps it
    expect(err).toBeDefined();
    expect(err.name).toMatch(/JsonWebTokenError|TokenExpiredError|JwtError/);
  });

  it('forwards AuthenticationError when user does not exist', async () => {
    const token = generateToken('ghost-user-id');
    prisma.user.findUnique.mockResolvedValue(null);
    const req = makeReq({ authorization: `Bearer ${token}` });
    const next = jest.fn();
    await authenticate(req, {}, next);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'ghost-user-id' },
      select: expect.objectContaining({ id: true, email: true, role: true, tier: true }),
    });
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.message).toMatch(/User not found/);
  });

  it('does not select passwordHash', async () => {
    const token = generateToken('user-id');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'a@b.com',
      role: 'USER',
      tier: 'FREE',
    });
    const req = makeReq({ authorization: `Bearer ${token}` });
    await authenticate(req, {}, jest.fn());
    const select = prisma.user.findUnique.mock.calls[0][0].select;
    expect(select.passwordHash).toBeUndefined();
  });

  it('attaches user to req and calls next() with no args on success', async () => {
    const token = generateToken('user-1');
    const userRecord = {
      id: 'user-1',
      email: 'a@b.com',
      name: 'Alice',
      role: 'USER',
      tier: 'FREE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.user.findUnique.mockResolvedValue(userRecord);
    const req = makeReq({ authorization: `Bearer ${token}` });
    const next = jest.fn();
    await authenticate(req, {}, next);
    expect(req.user).toEqual(userRecord);
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards db errors from prisma to next()', async () => {
    const token = generateToken('user-1');
    const dbErr = new Error('db down');
    prisma.user.findUnique.mockRejectedValue(dbErr);
    const req = makeReq({ authorization: `Bearer ${token}` });
    const next = jest.fn();
    await authenticate(req, {}, next);
    expect(next).toHaveBeenCalledWith(dbErr);
  });
});
