/**
 * Auth Service - additional tests for reset token helpers.
 */

const {
  generateResetToken,
  hashResetToken,
} = require('../../services/auth.service');

describe('auth.service - reset tokens', () => {
  describe('generateResetToken', () => {
    it('returns token, tokenHash, and expiresAt', () => {
      const result = generateResetToken();
      expect(result.token).toEqual(expect.any(String));
      expect(result.tokenHash).toEqual(expect.any(String));
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('produces a 64-char hex token (32 random bytes)', () => {
      const { token } = generateResetToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces a sha256 hex digest as tokenHash (64 chars)', () => {
      const { tokenHash } = generateResetToken();
      expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('hashes match: hashResetToken(token) === tokenHash', () => {
      const { token, tokenHash } = generateResetToken();
      expect(hashResetToken(token)).toBe(tokenHash);
    });

    it('expires roughly 1 hour in the future', () => {
      const before = Date.now();
      const { expiresAt } = generateResetToken();
      const delta = expiresAt.getTime() - before;
      // 1 hour = 3,600,000 ms; allow a generous window
      expect(delta).toBeGreaterThan(3590_000);
      expect(delta).toBeLessThan(3610_000);
    });

    it('produces unique tokens on consecutive calls', () => {
      const a = generateResetToken();
      const b = generateResetToken();
      expect(a.token).not.toBe(b.token);
      expect(a.tokenHash).not.toBe(b.tokenHash);
    });
  });

  describe('hashResetToken', () => {
    it('is deterministic for the same input', () => {
      expect(hashResetToken('abc')).toBe(hashResetToken('abc'));
    });

    it('produces different hashes for different inputs', () => {
      expect(hashResetToken('abc')).not.toBe(hashResetToken('abcd'));
    });

    it('returns a 64-char hex string', () => {
      expect(hashResetToken('whatever')).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
