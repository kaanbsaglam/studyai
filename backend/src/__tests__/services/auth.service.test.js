/**
 * Auth Service Tests
 *
 * Tests for authentication: password hashing and JWT token handling.
 */

const {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
} = require('../../services/auth.service');

describe('auth.service', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // bcrypt uses random salt, so hashes should differ
      expect(hash1).not.toBe(hash2);
    });

    it('should produce bcrypt formatted hash', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      // bcrypt hashes start with $2a$ or $2b$
      expect(hash).toMatch(/^\$2[ab]\$/);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await hashPassword(password);

      const result = await comparePassword(wrongPassword, hash);
      expect(result).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      const result = await comparePassword('', hash);
      expect(result).toBe(false);
    });

    it('should be case sensitive', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      const result = await comparePassword('testpassword123', hash);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      const userId = 'test-user-id-123';
      const token = generateToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken('user-1');
      const token2 = generateToken('user-2');

      expect(token1).not.toBe(token2);
    });

    it('should embed userId in token payload', () => {
      const userId = 'test-user-id-123';
      const token = generateToken(userId);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(userId);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const userId = 'test-user-id-123';
      const token = generateToken(userId);

      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(userId);
    });

    it('should include iat (issued at) in decoded token', () => {
      const token = generateToken('user-id');
      const decoded = verifyToken(token);

      expect(decoded.iat).toBeDefined();
      expect(typeof decoded.iat).toBe('number');
    });

    it('should include exp (expiration) in decoded token', () => {
      const token = generateToken('user-id');
      const decoded = verifyToken(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    it('should throw error for tampered token', () => {
      const token = generateToken('user-id');
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => verifyToken(tamperedToken)).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => verifyToken('')).toThrow();
    });
  });

  describe('password + token integration', () => {
    it('should work together for auth flow', async () => {
      // Simulate registration
      const password = 'userPassword123';
      const hash = await hashPassword(password);

      // Simulate login - verify password
      const passwordValid = await comparePassword(password, hash);
      expect(passwordValid).toBe(true);

      // Generate token after successful login
      const userId = 'new-user-uuid';
      const token = generateToken(userId);

      // Verify token on subsequent requests
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(userId);
    });
  });
});
