import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadCollection } from './collectionManager';

describe('CollectionManager Security', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('should handle corrupted localStorage data gracefully', () => {
        localStorage.setItem('narutoArena_ownedCharacters', 'INVALID_JSON_{{');
        // It should NOT throw now, and return empty array
        const result = loadCollection();
        expect(result).toEqual([]);
    });
});
