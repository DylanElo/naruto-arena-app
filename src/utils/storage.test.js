import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeGet, safeSet, safeRemove } from './storage';

describe('Storage Utils', () => {
    beforeEach(() => {
        vi.spyOn(Storage.prototype, 'getItem');
        vi.spyOn(Storage.prototype, 'setItem');
        vi.spyOn(Storage.prototype, 'removeItem');
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('safeSet', () => {
        it('should save valid JSON data', () => {
            const result = safeSet('testKey', { foo: 'bar' });
            expect(result).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalledWith('testKey', '{"foo":"bar"}');
        });

        it('should handle quota exceeded errors gracefully', () => {
            localStorage.setItem.mockImplementation(() => {
                throw new Error('QuotaExceededError');
            });
            const result = safeSet('testKey', { foo: 'bar' });
            expect(result).toBe(false);
        });
    });

    describe('safeGet', () => {
        it('should retrieve and parse valid JSON data', () => {
            localStorage.setItem('testKey', '{"foo":"bar"}');
            const result = safeGet('testKey');
            expect(result).toEqual({ foo: 'bar' });
        });

        it('should return fallback if key does not exist', () => {
            const result = safeGet('missingKey', 'default');
            expect(result).toBe('default');
        });

        it('should return fallback and clear storage if JSON is malformed', () => {
            // Bypass JSON.stringify to simulate corruption
            // We use the mocked behavior or just set it directly if not mocked to throw
            // But since we are mocking/spying prototype, we can just use the real setItem
            // but wait, we need to inject bad string.
            // Let's use a mock implementation for getItem to return bad JSON
            localStorage.getItem.mockReturnValue('{bad json');

            const result = safeGet('corruptKey', 'fallback');

            expect(result).toBe('fallback');
            expect(localStorage.removeItem).toHaveBeenCalledWith('corruptKey');
        });
    });

    describe('safeRemove', () => {
        it('should remove item', () => {
            safeRemove('testKey');
            expect(localStorage.removeItem).toHaveBeenCalledWith('testKey');
        });
    });
});
