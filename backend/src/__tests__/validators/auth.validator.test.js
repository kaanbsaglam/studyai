/**
 * Auth Validators tests.
 */

const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  googleAuthSchema,
} = require('../../validators/auth.validator');

describe('auth.validator', () => {
  describe('registerSchema', () => {
    it('accepts valid email + password', () => {
      const data = registerSchema.parse({
        email: 'user@example.com',
        password: 'goodpassword',
      });
      expect(data.email).toBe('user@example.com');
    });

    it('lowercases email', () => {
      const data = registerSchema.parse({
        email: 'User@Example.COM',
        password: 'goodpassword',
      });
      expect(data.email).toBe('user@example.com');
    });

    it('trims whitespace from name', () => {
      const data = registerSchema.parse({
        email: 'user@example.com',
        password: 'goodpassword',
        name: '  Alice  ',
      });
      expect(data.name).toBe('Alice');
    });

    it('rejects malformed email', () => {
      expect(() => registerSchema.parse({
        email: 'not-an-email',
        password: 'goodpassword',
      })).toThrow();
    });

    it('rejects password shorter than 8 chars', () => {
      expect(() => registerSchema.parse({
        email: 'user@example.com',
        password: '1234567',
      })).toThrow(/at least 8/);
    });

    it('accepts exactly 8-char password (boundary)', () => {
      expect(() => registerSchema.parse({
        email: 'user@example.com',
        password: '12345678',
      })).not.toThrow();
    });

    it('rejects password longer than 64 chars', () => {
      expect(() => registerSchema.parse({
        email: 'user@example.com',
        password: 'a'.repeat(65),
      })).toThrow(/too long/);
    });

    it('accepts exactly 64-char password (boundary)', () => {
      expect(() => registerSchema.parse({
        email: 'user@example.com',
        password: 'a'.repeat(64),
      })).not.toThrow();
    });

    it('rejects missing email and missing password', () => {
      expect(() => registerSchema.parse({})).toThrow();
    });

    it('rejects empty name string', () => {
      expect(() => registerSchema.parse({
        email: 'user@example.com',
        password: 'goodpassword',
        name: '',
      })).toThrow();
    });

    it('rejects name longer than 100 chars', () => {
      expect(() => registerSchema.parse({
        email: 'user@example.com',
        password: 'goodpassword',
        name: 'a'.repeat(101),
      })).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('accepts any non-empty password (no min len at login)', () => {
      const data = loginSchema.parse({
        email: 'a@b.com',
        password: 'x',
      });
      expect(data.password).toBe('x');
    });

    it('rejects empty password', () => {
      expect(() => loginSchema.parse({
        email: 'a@b.com',
        password: '',
      })).toThrow();
    });

    it('rejects bad email', () => {
      expect(() => loginSchema.parse({
        email: 'nope',
        password: 'whatever',
      })).toThrow();
    });
  });

  describe('forgotPasswordSchema', () => {
    it('requires email', () => {
      expect(() => forgotPasswordSchema.parse({})).toThrow();
    });
    it('rejects invalid email', () => {
      expect(() => forgotPasswordSchema.parse({ email: 'no' })).toThrow();
    });
    it('accepts valid email', () => {
      expect(forgotPasswordSchema.parse({ email: 'A@B.com' }).email).toBe('a@b.com');
    });
  });

  describe('resetPasswordSchema', () => {
    it('requires token and newPassword', () => {
      expect(() => resetPasswordSchema.parse({})).toThrow();
      expect(() => resetPasswordSchema.parse({ token: 't' })).toThrow();
      expect(() => resetPasswordSchema.parse({ newPassword: 'goodpassword' })).toThrow();
    });

    it('enforces 8-char minimum on newPassword', () => {
      expect(() => resetPasswordSchema.parse({
        token: 't',
        newPassword: 'short',
      })).toThrow();
    });

    it('accepts a valid payload', () => {
      const data = resetPasswordSchema.parse({
        token: 'abc',
        newPassword: 'newgoodpassword',
      });
      expect(data.token).toBe('abc');
    });
  });

  describe('changePasswordSchema', () => {
    it('requires both currentPassword and newPassword', () => {
      expect(() => changePasswordSchema.parse({})).toThrow();
      expect(() => changePasswordSchema.parse({ currentPassword: 'x' })).toThrow();
    });

    it('rejects newPassword shorter than 8 chars', () => {
      expect(() => changePasswordSchema.parse({
        currentPassword: 'old',
        newPassword: 'short',
      })).toThrow();
    });

    it('does not impose min length on currentPassword', () => {
      expect(() => changePasswordSchema.parse({
        currentPassword: 'x',
        newPassword: 'goodpassword',
      })).not.toThrow();
    });
  });

  describe('googleAuthSchema', () => {
    it('requires non-empty idToken', () => {
      expect(() => googleAuthSchema.parse({})).toThrow();
      expect(() => googleAuthSchema.parse({ idToken: '' })).toThrow();
    });

    it('accepts a non-empty idToken', () => {
      expect(googleAuthSchema.parse({ idToken: 'abc' }).idToken).toBe('abc');
    });
  });
});
