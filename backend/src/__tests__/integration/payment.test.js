/**
 * Payment / account integration tests.
 *
 * The current controller is a "mock" upgrade flow (no Stripe), so we focus on:
 * - usage shape returned to clients
 * - guards against double-upgrade / double-downgrade
 * - that DB tier mutation only happens when the guard passes
 */

const request = require('supertest');
const prisma = require('../../lib/prisma');
const {
  getUsage,
  upgradeToPremium,
  downgradeToFree,
} = require('../../controllers/payment.controller');
const {
  buildApp,
  injectUser,
  FREE_USER,
  PREMIUM_USER,
} = require('../helpers/app');

function makeApp(user = FREE_USER) {
  return buildApp((app) => {
    app.use(injectUser(user));
    app.get('/account/usage', getUsage);
    app.post('/account/upgrade', upgradeToPremium);
    app.post('/account/downgrade', downgradeToFree);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.classroom.count.mockResolvedValue(2);
  prisma.document.aggregate.mockResolvedValue({ _sum: { size: 1024 * 1024 } });
  prisma.dailyUsage.findUnique.mockResolvedValue({ tokensUsed: 5000 });
});

describe('GET /account/usage', () => {
  it('returns usage relative to FREE limits', async () => {
    const res = await request(makeApp(FREE_USER)).get('/account/usage');
    expect(res.status).toBe(200);
    expect(res.body.data.tier).toBe('FREE');
    expect(res.body.data.usage.classrooms).toBe(2);
    expect(res.body.data.usage.maxClassrooms).toBe(5);
    expect(res.body.data.usage.storageBytes).toBe(1024 * 1024);
    expect(res.body.data.usage.storageFormatted).toBe('1.0 MB');
    expect(res.body.data.usage.tokensToday).toBe(5000);
    expect(res.body.data.usage.maxTokensPerDay).toBe(50_000);
  });

  it('returns usage relative to PREMIUM limits', async () => {
    const res = await request(makeApp(PREMIUM_USER)).get('/account/usage');
    expect(res.body.data.tier).toBe('PREMIUM');
    expect(res.body.data.usage.maxClassrooms).toBe(50);
  });
});

describe('POST /account/upgrade', () => {
  it('rejects when already PREMIUM (no DB write)', async () => {
    const res = await request(makeApp(PREMIUM_USER)).post('/account/upgrade');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/already.*Premium/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('updates tier to PREMIUM for FREE user and returns new limits', async () => {
    prisma.user.update.mockResolvedValue({});
    const res = await request(makeApp(FREE_USER)).post('/account/upgrade');
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: FREE_USER.id },
      data: { tier: 'PREMIUM' },
    });
    expect(res.body.data.tier).toBe('PREMIUM');
    expect(res.body.data.limits.maxClassrooms).toBe(50);
  });
});

describe('POST /account/downgrade', () => {
  it('rejects when already FREE (no DB write)', async () => {
    const res = await request(makeApp(FREE_USER)).post('/account/downgrade');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/already.*Free/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('updates PREMIUM user back to FREE', async () => {
    prisma.user.update.mockResolvedValue({});
    const res = await request(makeApp(PREMIUM_USER)).post('/account/downgrade');
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: PREMIUM_USER.id },
      data: { tier: 'FREE' },
    });
  });
});
