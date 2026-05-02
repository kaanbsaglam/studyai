/**
 * errorHandler middleware tests.
 */

const { z } = require('zod');
const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  errorHandler,
  asyncHandler,
} = require('../../middleware/errorHandler');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(overrides = {}) {
  return { path: '/x', method: 'GET', ...overrides };
}

describe('error classes', () => {
  it('AppError carries statusCode and code', () => {
    const e = new AppError('msg', 418, 'TEAPOT');
    expect(e.message).toBe('msg');
    expect(e.statusCode).toBe(418);
    expect(e.code).toBe('TEAPOT');
    expect(e.isOperational).toBe(true);
    expect(e instanceof Error).toBe(true);
  });

  it('ValidationError defaults to 400', () => {
    expect(new ValidationError('bad').statusCode).toBe(400);
    expect(new ValidationError('bad', { field: 'email' }).details).toEqual({ field: 'email' });
  });

  it('AuthenticationError defaults to 401', () => {
    expect(new AuthenticationError().statusCode).toBe(401);
  });

  it('AuthorizationError defaults to 403', () => {
    expect(new AuthorizationError().statusCode).toBe(403);
  });

  it('NotFoundError formats message with resource name', () => {
    const e = new NotFoundError('Classroom');
    expect(e.statusCode).toBe(404);
    expect(e.message).toBe('Classroom not found');
  });

  it('RateLimitError defaults to 429', () => {
    expect(new RateLimitError().statusCode).toBe(429);
  });
});

describe('errorHandler middleware', () => {
  let originalEnv;
  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
  });
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('responds with the AppError statusCode and code', () => {
    const res = makeRes();
    errorHandler(new ValidationError('bad input'), makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'bad input' },
    });
  });

  it('includes details when set on the error', () => {
    const res = makeRes();
    errorHandler(new ValidationError('bad', { x: 1 }), makeReq(), res, jest.fn());
    expect(res.json.mock.calls[0][0].error.details).toEqual({ x: 1 });
  });

  it('maps Prisma P2002 unique violation to 409', () => {
    const res = makeRes();
    const err = Object.assign(new Error('dup'), { code: 'P2002' });
    errorHandler(err, makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].error.code).toBe('DUPLICATE_ENTRY');
  });

  it('maps Prisma P2025 missing record to 404', () => {
    const res = makeRes();
    const err = Object.assign(new Error('missing'), { code: 'P2025' });
    errorHandler(err, makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].error.code).toBe('NOT_FOUND');
  });

  it('maps ZodError to 400 with details list', () => {
    const res = makeRes();
    let zodErr;
    try {
      z.object({ email: z.string().email() }).parse({ email: 'bad' });
    } catch (e) {
      zodErr = e;
    }
    errorHandler(zodErr, makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.error.details)).toBe(true);
    expect(body.error.details[0]).toMatchObject({ path: 'email' });
  });

  it('maps JsonWebTokenError to 401 INVALID_TOKEN', () => {
    const res = makeRes();
    const err = Object.assign(new Error('jwt malformed'), { name: 'JsonWebTokenError' });
    errorHandler(err, makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].error.code).toBe('INVALID_TOKEN');
  });

  it('maps TokenExpiredError to 401 TOKEN_EXPIRED', () => {
    const res = makeRes();
    const err = Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });
    errorHandler(err, makeReq(), res, jest.fn());
    expect(res.json.mock.calls[0][0].error.code).toBe('TOKEN_EXPIRED');
  });

  it('hides internal details for 500s in production', () => {
    process.env.NODE_ENV = 'production';
    const res = makeRes();
    const err = new Error('database password leak: super-secret');
    errorHandler(err, makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error.message).toBe('Internal server error');
    expect(res.json.mock.calls[0][0].error.message).not.toMatch(/super-secret/);
  });

  it('exposes 500 message in non-production', () => {
    process.env.NODE_ENV = 'test';
    const res = makeRes();
    errorHandler(new Error('boom'), makeReq(), res, jest.fn());
    expect(res.json.mock.calls[0][0].error.message).toBe('boom');
  });

  it('defaults statusCode to 500 and code to INTERNAL_ERROR for vanilla Error', () => {
    process.env.NODE_ENV = 'test';
    const res = makeRes();
    errorHandler(new Error('x'), makeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error.code).toBe('INTERNAL_ERROR');
  });
});

describe('asyncHandler', () => {
  it('forwards async errors to next()', async () => {
    const handler = asyncHandler(async () => {
      throw new Error('boom');
    });
    const next = jest.fn();
    await handler({}, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].message).toBe('boom');
  });

  it('does not call next() on success', async () => {
    const handler = asyncHandler(async (req, res) => {
      res.sent = true;
    });
    const res = {};
    const next = jest.fn();
    await handler({}, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.sent).toBe(true);
  });

});
