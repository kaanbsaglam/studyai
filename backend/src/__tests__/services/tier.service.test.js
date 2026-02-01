/**
 * Tier Service Tests
 *
 * Tests for tier limits, usage checks, and utility functions.
 */

const {
  TIER_LIMITS,
  getTierLimits,
  canUploadAudio,
  formatBytes,
} = require('../../services/tier.service');

describe('tier.service', () => {
  describe('TIER_LIMITS', () => {
    it('should have FREE tier limits defined', () => {
      expect(TIER_LIMITS.FREE).toBeDefined();
      expect(TIER_LIMITS.FREE.maxClassrooms).toBe(5);
      expect(TIER_LIMITS.FREE.maxStorageBytes).toBe(100 * 1024 * 1024); // 100 MB
      expect(TIER_LIMITS.FREE.maxTokensPerDay).toBe(50000);
    });

    it('should have PREMIUM tier limits defined', () => {
      expect(TIER_LIMITS.PREMIUM).toBeDefined();
      expect(TIER_LIMITS.PREMIUM.maxClassrooms).toBe(50);
      expect(TIER_LIMITS.PREMIUM.maxStorageBytes).toBe(2 * 1024 * 1024 * 1024); // 2 GB
      expect(TIER_LIMITS.PREMIUM.maxTokensPerDay).toBe(1000000);
    });

    it('should have PREMIUM limits higher than FREE', () => {
      expect(TIER_LIMITS.PREMIUM.maxClassrooms).toBeGreaterThan(TIER_LIMITS.FREE.maxClassrooms);
      expect(TIER_LIMITS.PREMIUM.maxStorageBytes).toBeGreaterThan(TIER_LIMITS.FREE.maxStorageBytes);
      expect(TIER_LIMITS.PREMIUM.maxTokensPerDay).toBeGreaterThan(TIER_LIMITS.FREE.maxTokensPerDay);
    });
  });

  describe('getTierLimits', () => {
    it('should return FREE tier limits', () => {
      const limits = getTierLimits('FREE');
      expect(limits).toEqual(TIER_LIMITS.FREE);
    });

    it('should return PREMIUM tier limits', () => {
      const limits = getTierLimits('PREMIUM');
      expect(limits).toEqual(TIER_LIMITS.PREMIUM);
    });

    it('should default to FREE tier for unknown tier', () => {
      const limits = getTierLimits('UNKNOWN');
      expect(limits).toEqual(TIER_LIMITS.FREE);
    });

    it('should default to FREE tier for undefined', () => {
      const limits = getTierLimits(undefined);
      expect(limits).toEqual(TIER_LIMITS.FREE);
    });

    it('should default to FREE tier for null', () => {
      const limits = getTierLimits(null);
      expect(limits).toEqual(TIER_LIMITS.FREE);
    });
  });

  describe('canUploadAudio', () => {
    it('should allow audio upload for PREMIUM tier', () => {
      const result = canUploadAudio('PREMIUM');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny audio upload for FREE tier', () => {
      const result = canUploadAudio('FREE');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('premium');
    });

    it('should deny audio upload for unknown tier', () => {
      const result = canUploadAudio('UNKNOWN');
      expect(result.allowed).toBe(false);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
      expect(formatBytes(100 * 1024 * 1024)).toBe('100.0 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.0 GB');
    });

    it('should handle zero bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should handle edge case at KB boundary', () => {
      expect(formatBytes(1023)).toBe('1023 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
    });

    it('should handle edge case at MB boundary', () => {
      expect(formatBytes(1024 * 1024 - 1)).toMatch(/KB$/);
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    });

    it('should handle edge case at GB boundary', () => {
      expect(formatBytes(1024 * 1024 * 1024 - 1)).toMatch(/MB$/);
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    });
  });
});
