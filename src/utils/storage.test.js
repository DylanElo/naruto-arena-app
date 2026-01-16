import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeGet, safeSet, safeRemove } from './storage';

describe('Storage Utils', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        Storage.prototype.getItem = vi.fn();
        Storage.prototype.setItem = vi.fn();
        Storage.prototype.removeItem = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('safeGet', () => {
        it('should return parsed value when JSON is valid', () => {
            const mockValue = { foo: 'bar' };
            Storage.prototype.getItem.mockReturnValue(JSON.stringify(mockValue));

            const result = safeGet('testKey');
            expect(result).toEqual(mockValue);
        });

        it('should return fallback when key does not exist', () => {
            Storage.prototype.getItem.mockReturnValue(null);

            const result = safeGet('testKey', 'fallback');
            expect(result).toBe('fallback');
        });

        it('should return fallback when JSON is invalid', () => {
            Storage.prototype.getItem.mockReturnValue('invalid json');

            const result = safeGet('testKey', 'fallback');
            expect(result).toBe('fallback');
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('safeSet', () => {
        it('should save stringified value', () => {
            const mockValue = { foo: 'bar' };
            safeSet('testKey', mockValue);

            expect(Storage.prototype.setItem).toHaveBeenCalledWith(
                'testKey',
                JSON.stringify(mockValue)
            );
        });

        it('should catch errors during setItem', () => {
            Storage.prototype.setItem.mockImplementation(() => {
                throw new Error('Quota exceeded');
            });

            safeSet('testKey', 'value');
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('safeRemove', () => {
        it('should remove item', () => {
            safeRemove('testKey');
            expect(Storage.prototype.removeItem).toHaveBeenCalledWith('testKey');
        });
    });
});
