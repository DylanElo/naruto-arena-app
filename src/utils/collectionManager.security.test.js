import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadCollection } from './collectionManager';

describe('collectionManager security', () => {
    let originalLocalStorage;

    beforeEach(() => {
        // Mock localStorage
        originalLocalStorage = window.localStorage;
        const store = {};
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn((key) => store[key] || null),
                setItem: vi.fn((key, value) => {
                    store[key] = value.toString();
                }),
                clear: vi.fn(() => {
                    for (const key in store) delete store[key];
                }),
            },
            writable: true,
        });
    });

    afterEach(() => {
        // Restore localStorage
        Object.defineProperty(window, 'localStorage', {
            value: originalLocalStorage,
            writable: true
        });
        vi.restoreAllMocks();
    });

    it('loadCollection should handle corrupted JSON gracefully', () => {
        // Simulate corrupted data
        window.localStorage.getItem.mockReturnValue('{invalid-json');

        const result = loadCollection();

        expect(result).toEqual([]);
        expect(window.localStorage.getItem).toHaveBeenCalledWith('narutoArena_ownedCharacters');
    });

    it('loadCollection should return empty array when localStorage is null', () => {
        window.localStorage.getItem.mockReturnValue(null);

        const result = loadCollection();

        expect(result).toEqual([]);
    });

    it('loadCollection should return parsed data when JSON is valid', () => {
        const validData = JSON.stringify(['naruto', 'sasuke']);
        window.localStorage.getItem.mockReturnValue(validData);

        const result = loadCollection();

        expect(result).toEqual(['naruto', 'sasuke']);
    });
});
