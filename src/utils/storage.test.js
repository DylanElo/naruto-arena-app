import { describe, it, expect, beforeEach, vi } from 'vitest';
import { safeGet, safeSet, safeRemove } from './storage';

describe('Storage Utilities', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('safeSet saves data correctly', () => {
        const key = 'test_key';
        const data = { foo: 'bar' };
        safeSet(key, data);
        expect(localStorage.getItem(key)).toBe(JSON.stringify(data));
    });

    it('safeGet retrieves valid data', () => {
        const key = 'test_key';
        const data = { foo: 'bar' };
        localStorage.setItem(key, JSON.stringify(data));
        expect(safeGet(key)).toEqual(data);
    });

    it('safeGet returns fallback for missing key', () => {
        const key = 'missing_key';
        const fallback = 'default';
        expect(safeGet(key, fallback)).toBe(fallback);
    });

    it('safeGet returns fallback for corrupted JSON', () => {
        const key = 'corrupt_key';
        localStorage.setItem(key, '{invalid_json');

        // Suppress console.error for this test
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(safeGet(key, 'fallback')).toBe('fallback');
        expect(spy).toHaveBeenCalled();
    });

    it('safeRemove removes data', () => {
        const key = 'test_key';
        localStorage.setItem(key, 'value');
        safeRemove(key);
        expect(localStorage.getItem(key)).toBeNull();
    });
});
