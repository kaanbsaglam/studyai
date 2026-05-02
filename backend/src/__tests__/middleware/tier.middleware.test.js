/**
 * tier.middleware tests.
 *
 * Verifies that requirePremium gates routes correctly based on req.user.tier
 * (set by authenticate upstream). We bypass authenticate by stamping req.user
 * directly to keep this focused on the middleware's authorization logic.
 */

const request = require('supertest');
const { requirePremium } = require('../../middleware/tier.middleware');
const { buildApp, injectUser, FREE_USER, PREMIUM_USER } = require('../helpers/app');

function appFor(user) {
  return buildApp((app) => {
    if (user) app.use(injectUser(user));
    app.get('/premium', requirePremium, (req, res) => res.json({ ok: true }));
  });
}

describe('requirePremium middleware', () => {
  it('returns 403 when no user is attached (defensive)', async () => {
    const res = await request(appFor(null)).get('/premium');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('returns 403 for FREE users', async () => {
    const res = await request(appFor(FREE_USER)).get('/premium');
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/PREMIUM|premium/i);
  });

  it('returns 403 for an unknown tier value', async () => {
    const res = await request(appFor({ ...FREE_USER, tier: 'GOLD' })).get('/premium');
    expect(res.status).toBe(403);
  });

  it('passes through for PREMIUM users', async () => {
    const res = await request(appFor(PREMIUM_USER)).get('/premium');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('does not leak unrelated user fields into the response', async () => {
    const res = await request(appFor(FREE_USER)).get('/premium');
    expect(res.body.error).not.toHaveProperty('user');
  });
});
