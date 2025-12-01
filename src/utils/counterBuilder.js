import { analyzeTeam, analyzeCharacter } from './recommendationEngine';

/**
 * Calculate counter score for a character against an enemy team
 * Higher score = better counter
 */
export const calculateCounterScore = (character, enemyAnalysis) => {
    let score = 0;
    const charAnalysis = analyzeCharacter(character);

    // EXPLOIT ENEMY WEAKNESSES (30 pts each)

    // Enemy has no immunity → Our stun is valuable
    if (enemyAnalysis.mechanics.immunity === 0 && charAnalysis.mechanics.stun > 0) {
        score += 30;
    }

    // Enemy has no anti-tank/piercing → Our invulnerability/tank is safe
    if (enemyAnalysis.mechanics.antiTank === 0 && enemyAnalysis.mechanics.piercing === 0) {
        if (charAnalysis.mechanics.invulnerable > 0) score += 25;
    }

    // Enemy has low control → Our setup skills can safely activate
    if (enemyAnalysis.roles.control < 1 && charAnalysis.mechanics.setup > 0) {
        score += 20;
    }

    // NEGATE ENEMY STRENGTHS (25 pts each)

    // Enemy has high stun → Our immunity negates it
    if (enemyAnalysis.mechanics.stun >= 3 && charAnalysis.mechanics.immunity > 0) {
        score += 25;
    }

    // Enemy has high piercing → Our cleanse helps
    if (enemyAnalysis.mechanics.piercing >= 2 && charAnalysis.mechanics.cleanse > 0) {
        score += 15;
    }

    // ENERGY ADVANTAGE (20 pts)  
    const enemyAvgCost = 2.5; // Simplified for now
    const charAvgCost = 2; // Simplified for now

    if (enemyAvgCost > 3 && charAvgCost <= 1.5) {
        score += 20;
    }

    // TEMPO ADVANTAGE (15 pts)
    if (enemyAnalysis.tempo && enemyAnalysis.tempo.estimatedKillTurns > 5) {
        const charBurst = estimateCharacterBurst(character);
        if (charBurst > 60) score += 15;
    }

    return Math.round(score);
};

/**
 * Helper: Estimate character burst damage
 */
const estimateCharacterBurst = (character) => {
    if (!character.skills) return 0;

    let burst = 0;
    character.skills.forEach(skill => {
        const desc = skill.description || '';
        const damageMatch = desc.match(/(\d+)\s*damage/i);
        if (damageMatch) {
            burst += parseInt(damageMatch[1]);
        }
    });

    return burst;
};

/**
 * Get counter reason explanation
 */
export const getCounterReason = (character, enemyAnalysis) => {
    const reasons = [];
    const charAnalysis = analyzeCharacter(character);

    if (enemyAnalysis.mechanics.immunity === 0 && charAnalysis.mechanics.stun > 0) {
        reasons.push('✓ Stuns counter their lack of immunity');
    }

    if (enemyAnalysis.mechanics.stun >= 3 && charAnalysis.mechanics.immunity > 0) {
        reasons.push('✓ Immunity negates their stun pressure');
    }

    if (enemyAnalysis.roles.control < 1 && charAnalysis.mechanics.setup > 0) {
        reasons.push('✓ Can safely setup without control');
    }

    if (enemyAnalysis.mechanics.piercing >= 2 && charAnalysis.mechanics.cleanse > 0) {
        reasons.push('✓ Cleanse helps vs piercing');
    }

    return reasons.length > 0 ? reasons.join(' | ') : 'General synergy';
};

/**
 * Build counter team suggestions
 * @param {Array} enemyTeam - Enemy team (3 characters)
 * @param {Array} allCharacters - Full character pool
 * @param {Array} ownedCharacterIds - IDs of owned characters
 * @param {Array} currentTeam - Currently selected team
 * @returns {Array} Top counter picks with scores and reasons
 */
export const buildCounterTeam = (enemyTeam, allCharacters, ownedCharacterIds = [], currentTeam = []) => {
    if (!enemyTeam || enemyTeam.length === 0) {
        return [];
    }

    // Analyze enemy team
    const enemyAnalysis = analyzeTeam(enemyTeam);

    // Filter to owned characters not already in current team
    const availableChars = allCharacters.filter(c => {
        const isOwned = ownedCharacterIds.length === 0 || ownedCharacterIds.includes(c.id);
        const notInTeam = !currentTeam.find(t => t.id === c.id);
        return isOwned && notInTeam;
    });

    // Score and rank
    const scoredChars = availableChars.map(char => ({
        ...char,
        counterScore: calculateCounterScore(char, enemyAnalysis),
        counterReason: getCounterReason(char, enemyAnalysis)
    }));

    // Sort by counter score descending
    return scoredChars
        .sort((a, b) => b.counterScore - a.counterScore)
        .slice(0, 10); // Top 10  
};
