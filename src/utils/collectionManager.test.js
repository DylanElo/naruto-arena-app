import { describe, it, expect, vi } from 'vitest';
import { getCollectionStats } from './collectionManager';

// Mock loadCollection if needed
vi.mock('./collectionManager', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        loadCollection: vi.fn(() => []), // default mock
    };
});

describe('getCollectionStats', () => {
    const mockCharacters = [
        { id: '1', name: 'Naruto' },
        { id: '2', name: 'Sasuke' },
        { id: '3', name: 'Sakura' },
        { id: '4', name: 'Kakashi' }
    ];

    it('should correctly calculate stats when ownedIds is an Array', () => {
        const ownedIds = ['1', '2'];
        const stats = getCollectionStats(mockCharacters, ownedIds);

        expect(stats).toEqual({
            owned: 2,
            total: 4,
            percentage: 50
        });
    });

    it('should correctly calculate stats when ownedIds is a Set', () => {
        const ownedIds = new Set(['1', '2', '3']);
        const stats = getCollectionStats(mockCharacters, ownedIds);

        expect(stats).toEqual({
            owned: 3,
            total: 4,
            percentage: 75
        });
    });

    it('should correctly calculate stats when ownedIds is empty Array', () => {
        const ownedIds = [];
        const stats = getCollectionStats(mockCharacters, ownedIds);

        expect(stats).toEqual({
            owned: 0,
            total: 4,
            percentage: 0
        });
    });

    it('should correctly calculate stats when ownedIds is empty Set', () => {
        const ownedIds = new Set();
        const stats = getCollectionStats(mockCharacters, ownedIds);

        expect(stats).toEqual({
            owned: 0,
            total: 4,
            percentage: 0
        });
    });
});
