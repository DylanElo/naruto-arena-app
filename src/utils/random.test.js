
import { describe, it, expect } from 'vitest';
import { getSecureRandomInt, getSecureRandomElement } from './random';

describe('Secure Random Utilities', () => {
    it('getSecureRandomInt generates numbers within range', () => {
        const min = 0;
        const max = 10;
        for (let i = 0; i < 100; i++) {
            const val = getSecureRandomInt(min, max);
            expect(val).toBeGreaterThanOrEqual(min);
            expect(val).toBeLessThan(max);
        }
    });

    it('getSecureRandomInt handles single value range', () => {
        const val = getSecureRandomInt(5, 6);
        expect(val).toBe(5);
    });

    it('getSecureRandomInt throws on invalid range', () => {
        expect(() => getSecureRandomInt(10, 0)).toThrow();
        expect(() => getSecureRandomInt(5, 5)).toThrow();
    });

    it('getSecureRandomElement returns an element from array', () => {
        const arr = ['a', 'b', 'c'];
        const val = getSecureRandomElement(arr);
        expect(arr).toContain(val);
    });

    it('getSecureRandomElement returns undefined for empty array', () => {
        expect(getSecureRandomElement([])).toBeUndefined();
        expect(getSecureRandomElement(null)).toBeUndefined();
    });
});
