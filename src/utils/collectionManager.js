// Collection Manager - Maps missions to characters
import missionsData from '../../../naruto-arena-scraper/data/missions.json';

/**
 * Extract character name from mission rewards
 * Returns null if mission doesn't unlock a character
 */
const extractCharacterFromMission = (mission) => {
    if (!mission.rewards || !mission.rewards.startsWith('Character:')) {
        return null;
    }
    return mission.rewards.replace('Character: ', '').trim();
};

/**
 * Get all characters unlockable up to a given level
 */
export const getCharactersByLevel = (userLevel) => {
    const unlockedCharacters = [];

    missionsData.forEach(mission => {
        // Skip if mission is above user level
        if (mission.level > userLevel) return;

        // Extract character if exists
        const charName = extractCharacterFromMission(mission);
        if (charName) {
            unlockedCharacters.push(charName);
        }
    });

    return unlockedCharacters;
};

/**
 * Map character name to ID from characters.json
 */
export const mapNameToId = (charName, allCharacters) => {
    const char = allCharacters.find(c =>
        c.name.toLowerCase() === charName.toLowerCase()
    );
    return char ? char.id : null;
};

/**
 * Initialize collection based on user level
 */
export const initializeCollectionByLevel = (userLevel, allCharacters) => {
    const characterNames = getCharactersByLevel(userLevel);
    const characterIds = characterNames
        .map(name => mapNameToId(name, allCharacters))
        .filter(id => id !== null);

    saveCollection(characterIds);
    return characterIds;
};

/**
 * Save collection to localStorage
 */
export const saveCollection = (ownedCharacterIds) => {
    localStorage.setItem('ownedCharacters', JSON.stringify(ownedCharacterIds));
    localStorage.setItem('collectionLastUpdated', new Date().toISOString());
};

/**
 * Load collection from localStorage
 */
export const loadCollection = () => {
    const stored = localStorage.getItem('ownedCharacters');
    return stored ? JSON.parse(stored) : [];
};

/**
 * Toggle character ownership
 */
export const toggleCharacter = (characterId) => {
    const owned = loadCollection();
    const index = owned.indexOf(characterId);

    if (index > -1) {
        owned.splice(index, 1);
    } else {
        owned.push(characterId);
    }

    saveCollection(owned);
    return owned;
};

/**
 * Get collection stats
 */
export const getCollectionStats = (allCharacters) => {
    const owned = loadCollection();
    return {
        owned: owned.length,
        total: allCharacters.length,
        percentage: Math.round((owned.length / allCharacters.length) * 100)
    };
};
