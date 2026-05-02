/**
 * Admin controller integration tests.
 *
 * Covers self-protection invariants (cannot delete/demote self, cannot delete
 * another admin) and validation of tier/role inputs.
 */

const request = require('supertest');
const prisma = require('../../lib/prisma');
const {
  getUsers,
  getUser,
  updateUserTier,
  updateUserRole,
  deleteUser,
  getStats,
} = require('../../controllers/admin.controller');
const {
  buildApp,
  injectUser,
  ADMIN_USER,
} = require('../helpers/app');

function makeApp(user = ADMIN_USER) {
  return buildApp((app) => {
    app.use(injectUser(user));
    app.get('/admin/users', getUsers);
    app.get('/admin/users/:id', getUser);
    app.patch('/admin/users/:id/tier', updateUserTier);
    app.patch('/admin/users/:id/role', updateUserRole);
    app.delete('/admin/users/:id', deleteUser);
    app.get('/admin/stats', getStats);
  });
}

beforeEach(() => jest.clearAllMocks());

describe('GET /admin/users', () => {
  it('paginates results with totalPages', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(45);
    const res = await request(makeApp()).get('/admin/users?page=2&limit=20');
    expect(res.status).toBe(200);
    expect(res.body.data.pagination).toEqual({
      page: 2, limit: 20, total: 45, totalPages: 3,
    });
    expect(prisma.user.findMany.mock.calls[0][0].skip).toBe(20);
    expect(prisma.user.findMany.mock.calls[0][0].take).toBe(20);
  });

  it('applies tier filter only for valid values', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);
    await request(makeApp()).get('/admin/users?tier=GOLD').expect(200);
    expect(prisma.user.findMany.mock.calls[0][0].where.tier).toBeUndefined();

    jest.clearAllMocks();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);
    await request(makeApp()).get('/admin/users?tier=PREMIUM').expect(200);
    expect(prisma.user.findMany.mock.calls[0][0].where.tier).toBe('PREMIUM');
  });

  it('applies role filter only for valid values', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);
    await request(makeApp()).get('/admin/users?role=MODERATOR').expect(200);
    expect(prisma.user.findMany.mock.calls[0][0].where.role).toBeUndefined();

    jest.clearAllMocks();
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);
    await request(makeApp()).get('/admin/users?role=ADMIN').expect(200);
    expect(prisma.user.findMany.mock.calls[0][0].where.role).toBe('ADMIN');
  });

  it('applies search filter on email and name (insensitive OR)', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);
    await request(makeApp()).get('/admin/users?search=alice').expect(200);
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { email: { contains: 'alice', mode: 'insensitive' } },
      { name: { contains: 'alice', mode: 'insensitive' } },
    ]);
  });
});

describe('PATCH /admin/users/:id/tier', () => {
  it('rejects invalid tier', async () => {
    const res = await request(makeApp())
      .patch('/admin/users/u-other/tier')
      .send({ tier: 'GOLD' });
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects when target user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(makeApp())
      .patch('/admin/users/u-other/tier')
      .send({ tier: 'PREMIUM' });
    expect(res.status).toBe(404);
  });

  it('refuses to change own tier', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: ADMIN_USER.id, tier: 'FREE', role: 'ADMIN' });
    const res = await request(makeApp())
      .patch(`/admin/users/${ADMIN_USER.id}/tier`)
      .send({ tier: 'PREMIUM' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/own tier/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('updates tier of another user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-other', tier: 'FREE', role: 'USER' });
    prisma.user.update.mockResolvedValue({});
    const res = await request(makeApp())
      .patch('/admin/users/u-other/tier')
      .send({ tier: 'PREMIUM' });
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u-other' }, data: { tier: 'PREMIUM' },
    });
  });
});

describe('PATCH /admin/users/:id/role', () => {
  it('rejects invalid role', async () => {
    const res = await request(makeApp())
      .patch('/admin/users/u-other/role')
      .send({ role: 'SUPERADMIN' });
    expect(res.status).toBe(400);
  });

  it('rejects when target user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(makeApp())
      .patch('/admin/users/u-other/role')
      .send({ role: 'ADMIN' });
    expect(res.status).toBe(404);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses to demote self', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: ADMIN_USER.id, role: 'ADMIN' });
    const res = await request(makeApp())
      .patch(`/admin/users/${ADMIN_USER.id}/role`)
      .send({ role: 'USER' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Cannot demote yourself/);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('allows reaffirming own role as ADMIN (no-op)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: ADMIN_USER.id, role: 'ADMIN' });
    prisma.user.update.mockResolvedValue({});
    const res = await request(makeApp())
      .patch(`/admin/users/${ADMIN_USER.id}/role`)
      .send({ role: 'ADMIN' });
    expect(res.status).toBe(200);
  });

  it('promotes another user to ADMIN', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-other', role: 'USER' });
    prisma.user.update.mockResolvedValue({});
    await request(makeApp())
      .patch('/admin/users/u-other/role')
      .send({ role: 'ADMIN' })
      .expect(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u-other' }, data: { role: 'ADMIN' },
    });
  });
});

describe('DELETE /admin/users/:id', () => {
  it('refuses to delete self', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: ADMIN_USER.id, role: 'ADMIN' });
    const res = await request(makeApp()).delete(`/admin/users/${ADMIN_USER.id}`);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Cannot delete yourself/);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete another admin', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-other-admin', role: 'ADMIN' });
    const res = await request(makeApp()).delete('/admin/users/u-other-admin');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Cannot delete another admin/);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('returns 404 when target user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(makeApp()).delete('/admin/users/ghost');
    expect(res.status).toBe(404);
  });

  it('deletes a regular USER', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-other', role: 'USER' });
    prisma.user.delete.mockResolvedValue({});
    const res = await request(makeApp()).delete('/admin/users/u-other');
    expect(res.status).toBe(200);
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u-other' } });
  });
});

describe('GET /admin/stats', () => {
  it('aggregates user/content counts and storage', async () => {
    prisma.user.count
      .mockResolvedValueOnce(100)   // total
      .mockResolvedValueOnce(80)    // free
      .mockResolvedValueOnce(15)    // premium
      .mockResolvedValueOnce(5);    // admins
    prisma.classroom.count.mockResolvedValue(200);
    prisma.document.count.mockResolvedValue(500);
    prisma.document.aggregate.mockResolvedValue({ _sum: { size: 5 * 1024 * 1024 } });

    const res = await request(makeApp()).get('/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.users).toEqual({ total: 100, free: 80, premium: 15, admins: 5 });
    expect(res.body.data.content.classrooms).toBe(200);
    expect(res.body.data.content.documents).toBe(500);
    expect(res.body.data.content.storageFormatted).toBe('5.0 MB');
  });
});

describe('GET /admin/users/:id', () => {
  it('returns 404 when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(makeApp()).get('/admin/users/ghost');
    expect(res.status).toBe(404);
  });

  it('returns user with usage block', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: 'A',
      role: 'USER', tier: 'FREE',
      classrooms: [],
      createdAt: new Date(), updatedAt: new Date(),
    });
    prisma.classroom.count.mockResolvedValue(2);
    prisma.document.aggregate.mockResolvedValue({ _sum: { size: 0 } });
    prisma.dailyUsage.findUnique.mockResolvedValue(null);

    const res = await request(makeApp()).get('/admin/users/u1');
    expect(res.status).toBe(200);
    expect(res.body.data.user.usage.classrooms).toBe(2);
    expect(res.body.data.user.usage.maxClassrooms).toBe(5);
  });
});
