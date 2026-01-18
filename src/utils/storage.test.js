import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeGet, safeSet, safeRemove } from './storage';

describe('storage utils', () => {
  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'getItem');
    vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(Storage.prototype, 'removeItem');
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('safeGet', () => {
    it('returns parsed value for valid JSON', () => {
      localStorage.setItem('testKey', JSON.stringify({ foo: 'bar' }));
      const result = safeGet('testKey');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('returns fallback if item does not exist', () => {
      const result = safeGet('missingKey', 'default');
      expect(result).toBe('default');
    });

    it('returns fallback and does not crash on invalid JSON', () => {
      // Manually set invalid JSON
      // localStorage.setItem would stringify, so we mock getItem to return invalid JSON string
      vi.mocked(localStorage.getItem).mockReturnValue('{ invalid json }');

      const result = safeGet('corruptKey', 'fallback');
      expect(result).toBe('fallback');
    });

    it('returns fallback on localStorage access error', () => {
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        throw new Error('Access denied');
      });
      const result = safeGet('protectedKey', 'fallback');
      expect(result).toBe('fallback');
    });
  });

  describe('safeSet', () => {
    it('saves value as JSON string', () => {
      safeSet('testKey', { foo: 'bar' });
      expect(localStorage.getItem('testKey')).toBe(JSON.stringify({ foo: 'bar' }));
    });

    it('handles errors gracefully (e.g., quota exceeded)', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => safeSet('bigKey', 'data')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('safeRemove', () => {
    it('removes the item', () => {
      localStorage.setItem('testKey', 'value');
      safeRemove('testKey');
      expect(localStorage.getItem('testKey')).toBeNull();
    });

    it('handles errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(localStorage.removeItem).mockImplementation(() => {
        throw new Error('Access denied');
      });

      expect(() => safeRemove('testKey')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
