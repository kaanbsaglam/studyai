/**
 * admin.middleware tests.
 *
 * Verifies requireAdmin gates routes by req.user.role.
 */

const request = require('supertest');
const { requireAdmin } = require('../../middleware/admin.middleware');
const { buildApp, injectUser, FREE_USER, ADMIN_USER } = require('../helpers/app');

function appFor(user) {
  return buildApp((app) => {
    if (user) app.use(injectUser(user));
    app.get('/admin', requireAdmin, (req, res) => res.json({ ok: true }));
  });
}

describe('requireAdmin middleware', () => {
  it('returns 403 when no user', async () => {
    const res = await request(appFor(null)).get('/admin');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('returns 403 for plain USER role', async () => {
    const res = await request(appFor(FREE_USER)).get('/admin');
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/Admin/);
  });

  it('returns 403 for unknown role', async () => {
    const res = await request(appFor({ ...FREE_USER, role: 'MODERATOR' })).get('/admin');
    expect(res.status).toBe(403);
  });

  it('does not accept lowercase "admin" — exact-match only', async () => {
    const res = await request(appFor({ ...FREE_USER, role: 'admin' })).get('/admin');
    expect(res.status).toBe(403);
  });

  it('passes through for ADMIN role', async () => {
    const res = await request(appFor(ADMIN_USER)).get('/admin');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
