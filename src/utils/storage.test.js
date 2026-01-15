import { describe, it, expect, beforeEach, vi } from 'vitest';
import { safeGet, safeSet } from './storage';

describe('storage utils', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('safeSet stores value correctly', () => {
        const data = { foo: 'bar' };
        safeSet('test_key', data);
        expect(localStorage.getItem('test_key')).toBe(JSON.stringify(data));
    });

    it('safeGet retrieves value correctly', () => {
        const data = { foo: 'bar' };
        localStorage.setItem('test_key', JSON.stringify(data));
        expect(safeGet('test_key')).toEqual(data);
    });

    it('safeGet returns fallback if key does not exist', () => {
        expect(safeGet('non_existent', 'default')).toBe('default');
    });

    it('safeGet returns fallback and does not crash on invalid JSON', () => {
        // Simulating data corruption or manipulation
        localStorage.setItem('test_key', '{invalid_json');

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = safeGet('test_key', 'fallback_value');

        expect(result).toBe('fallback_value');
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Error reading test_key from localStorage'),
            expect.any(Error)
        );
    });
});
