import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadCollection } from './collectionManager';

describe('collectionManager Security', () => {
    beforeEach(() => {
        vi.spyOn(Storage.prototype, 'getItem');
        // Mock console.error to prevent pollution during test
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
        // Mock localStorage to return invalid JSON
        Storage.prototype.getItem.mockReturnValue('INVALID_JSON_DATA');

        // Expectation: it should NOT throw, and return empty array
        const result = loadCollection();
        expect(result).toEqual([]);

        // Verify that error was logged (optional but good for debugging check)
        expect(console.error).toHaveBeenCalled();
    });
});
