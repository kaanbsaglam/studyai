/**
 * Tier Service - DB-backed checks (canCreateClassroom, canUploadDocument,
 * canUseChat, recordTokenUsage, getUserUsage).
 *
 * Prisma is mocked globally via jest.setup.js -> mocks/prisma.
 */

const prisma = require('../../lib/prisma');
const {
  getUserUsage,
  canCreateClassroom,
  canUploadDocument,
  canUseChat,
  recordTokenUsage,
  TIER_LIMITS,
} = require('../../services/tier.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('tier.service - getUserUsage', () => {
  it('aggregates classroom count, storage, and tokens', async () => {
    prisma.classroom.count.mockResolvedValue(3);
    prisma.document.aggregate.mockResolvedValue({ _sum: { size: 12345 } });
    prisma.dailyUsage.findUnique.mockResolvedValue({ tokensUsed: 1500 });

    const usage = await getUserUsage('user-1');

    expect(usage).toEqual({
      classrooms: 3,
      storageBytes: 12345,
      tokensToday: 1500,
    });
    expect(prisma.classroom.count).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('handles null storage sum and missing daily usage row', async () => {
    prisma.classroom.count.mockResolvedValue(0);
    prisma.document.aggregate.mockResolvedValue({ _sum: { size: null } });
    prisma.dailyUsage.findUnique.mockResolvedValue(null);

    const usage = await getUserUsage('user-1');

    expect(usage).toEqual({
      classrooms: 0,
      storageBytes: 0,
      tokensToday: 0,
    });
  });

  it('queries dailyUsage at midnight (start of today)', async () => {
    prisma.classroom.count.mockResolvedValue(0);
    prisma.document.aggregate.mockResolvedValue({ _sum: { size: 0 } });
    prisma.dailyUsage.findUnique.mockResolvedValue(null);

    await getUserUsage('user-1');

    const arg = prisma.dailyUsage.findUnique.mock.calls[0][0];
    expect(arg.where.userId_date.userId).toBe('user-1');
    const d = arg.where.userId_date.date;
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });
});

describe('tier.service - canCreateClassroom', () => {
  beforeEach(() => {
    prisma.document.aggregate.mockResolvedValue({ _sum: { size: 0 } });
    prisma.dailyUsage.findUnique.mockResolvedValue(null);
  });

  it('allows when below limit', async () => {
    prisma.classroom.count.mockResolvedValue(2);
    const result = await canCreateClassroom('user-1', 'FREE');
    expect(result.allowed).toBe(true);
  });

  it('denies exactly at limit', async () => {
    prisma.classroom.count.mockResolvedValue(TIER_LIMITS.FREE.maxClassrooms);
    const result = await canCreateClassroom('user-1', 'FREE');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('5');
    expect(result.reason).toContain('FREE');
  });

  it('denies above limit', async () => {
    prisma.classroom.count.mockResolvedValue(99);
    const result = await canCreateClassroom('user-1', 'FREE');
    expect(result.allowed).toBe(false);
  });

  it('PREMIUM allows higher count than FREE limit', async () => {
    prisma.classroom.count.mockResolvedValue(TIER_LIMITS.FREE.maxClassrooms + 1);
    const result = await canCreateClassroom('user-1', 'PREMIUM');
    expect(result.allowed).toBe(true);
  });
});

describe('tier.service - canUploadDocument', () => {
  beforeEach(() => {
    prisma.classroom.count.mockResolvedValue(0);
    prisma.dailyUsage.findUnique.mockResolvedValue(null);
  });

  it('allows when total stays under limit', async () => {
    prisma.document.aggregate.mockResolvedValue({ _sum: { size: 1024 } });
    const result = await canUploadDocument('user-1', 'FREE', 1024);
    expect(result.allowed).toBe(true);
  });

  it('denies when total would exceed limit', async () => {
    prisma.document.aggregate.mockResolvedValue({
      _sum: { size: TIER_LIMITS.FREE.maxStorageBytes },
    });
    const result = await canUploadDocument('user-1', 'FREE', 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Storage limit/);
  });

  it('allows total exactly at the limit boundary', async () => {
    prisma.document.aggregate.mockResolvedValue({
      _sum: { size: TIER_LIMITS.FREE.maxStorageBytes - 100 },
    });
    const result = await canUploadDocument('user-1', 'FREE', 100);
    expect(result.allowed).toBe(true);
  });

  it('denies one byte over the limit', async () => {
    prisma.document.aggregate.mockResolvedValue({
      _sum: { size: TIER_LIMITS.FREE.maxStorageBytes - 100 },
    });
    const result = await canUploadDocument('user-1', 'FREE', 101);
    expect(result.allowed).toBe(false);
  });

  it('PREMIUM has much more headroom', async () => {
    prisma.document.aggregate.mockResolvedValue({
      _sum: { size: TIER_LIMITS.FREE.maxStorageBytes },
    });
    const result = await canUploadDocument('user-1', 'PREMIUM', 1024 * 1024);
    expect(result.allowed).toBe(true);
  });
});

describe('tier.service - canUseChat', () => {
  beforeEach(() => {
    prisma.classroom.count.mockResolvedValue(0);
    prisma.document.aggregate.mockResolvedValue({ _sum: { size: 0 } });
  });

  it('allows when tokens remain', async () => {
    prisma.dailyUsage.findUnique.mockResolvedValue({ tokensUsed: 1000 });
    const result = await canUseChat('user-1', 'FREE');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(TIER_LIMITS.FREE.maxTokensPerDay - 1000);
  });

  it('denies when at limit (remaining 0)', async () => {
    prisma.dailyUsage.findUnique.mockResolvedValue({
      tokensUsed: TIER_LIMITS.FREE.maxTokensPerDay,
    });
    const result = await canUseChat('user-1', 'FREE');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('denies when over limit (negative remaining)', async () => {
    prisma.dailyUsage.findUnique.mockResolvedValue({
      tokensUsed: TIER_LIMITS.FREE.maxTokensPerDay + 5000,
    });
    const result = await canUseChat('user-1', 'FREE');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('with no usage record yet, full quota remains', async () => {
    prisma.dailyUsage.findUnique.mockResolvedValue(null);
    const result = await canUseChat('user-1', 'FREE');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(TIER_LIMITS.FREE.maxTokensPerDay);
  });
});

describe('tier.service - recordTokenUsage', () => {
  it('uses weightedTokens when provided', async () => {
    prisma.dailyUsage.upsert.mockResolvedValue({});
    await recordTokenUsage('user-1', 1000, 350);
    const arg = prisma.dailyUsage.upsert.mock.calls[0][0];
    expect(arg.update.tokensUsed).toEqual({ increment: 350 });
    expect(arg.create).toMatchObject({ userId: 'user-1', tokensUsed: 350 });
  });

  it('falls back to raw tokensUsed when weightedTokens omitted', async () => {
    prisma.dailyUsage.upsert.mockResolvedValue({});
    await recordTokenUsage('user-1', 1000);
    const arg = prisma.dailyUsage.upsert.mock.calls[0][0];
    expect(arg.update.tokensUsed).toEqual({ increment: 1000 });
  });

  it('treats weightedTokens=0 as a real value (does not fall back)', async () => {
    prisma.dailyUsage.upsert.mockResolvedValue({});
    await recordTokenUsage('user-1', 1000, 0);
    const arg = prisma.dailyUsage.upsert.mock.calls[0][0];
    expect(arg.update.tokensUsed).toEqual({ increment: 0 });
  });
});
