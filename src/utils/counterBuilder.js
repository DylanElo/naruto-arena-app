/**
 * COUNTER BUILDER V3 - Manual-Based Logic
 * No simulation, just feature extraction + matchup rules from game manual
 */

import { buildCounterTeamManual } from './matchupLogic.js';

/**
 * Main counter builder - delegates to manual-based logic
 */
export const buildCounterTeam = (enemyTeam, allCharacters, ownedCharacterIds = [], currentTeam = []) => {
    return buildCounterTeamManual(enemyTeam, allCharacters, ownedCharacterIds, currentTeam);
};

// Export for backwards compatibility
export { buildCounterTeamManual };
