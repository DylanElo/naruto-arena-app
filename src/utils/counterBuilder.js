/**
 * COUNTER BUILDER - Manual-Based Logic
 * Uses tag-based counter logic from recommendationEngine
 */

import { recommendCounterCandidatesByTags } from './recommendationEngine.js';

/**
 * Main counter builder - uses manual-based tag logic
 */
export const buildCounterTeam = (enemyTeam, allCharacters, ownedCharacterIds = [], currentTeam = []) => {
    const results = recommendCounterCandidatesByTags(
        enemyTeam,
        allCharacters,
        ownedCharacterIds,
        currentTeam,
        10
    );

    // Map to expected format (counterScore, counterReason)
    return results.map(char => ({
        ...char,
        counterScore: char.counterScoreByTags,
        counterReason: char.counterReasonByTags
    }));
};
