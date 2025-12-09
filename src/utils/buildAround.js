/**
 * BUILD AROUND - Find synergistic partners for a main character
 * Based on manual mechanics, not guessing
 */

import { getCharacterKnowledge } from './knowledgeEngine.js';

// Helper to get profile from knowledge engine
function buildCharacterProfile(char) {
    const knowledge = getCharacterKnowledge(char.id);
    return knowledge?.profile || null;
}

/**
 * Find best partners for a main character
 */
export function recommendPartners(mainChar, allChars, ownedIds = [], count = 5) {
    const main = buildCharacterProfile(mainChar);
    if (!main) return [];

    const candidates = allChars.filter(c => {
        if (c.id === mainChar.id) return false;
        const isOwned = ownedIds.length === 0 || ownedIds.includes(c.id);
        return isOwned;
    });

    const scored = candidates.map(c => {
        const profile = buildCharacterProfile(c);
        if (!profile) return null;

        const score = scoreSynergy(main, profile);
        const reason = explainSynergy(main, profile);

        return {
            ...c,
            synergyScore: score,
            synergyReason: reason,
            profile
        };
    }).filter(c => c !== null);

    return scored.sort((a, b) => b.synergyScore - a.synergyScore).slice(0, count);
}

/**
 * Score synergy between main and candidate
 */
function scoreSynergy(main, candidate) {
    let score = 0;

    // 1) ROLE COVERAGE
    // DPS needs support/tank
    if (main.roles.dps >= 3) {
        if (candidate.roles.support >= 2) score += 15;
        if (candidate.roles.tank >= 2) score += 10;
    }

    // Support needs DPS
    if (main.roles.support >= 3) {
        if (candidate.roles.dps >= 2) score += 15;
    }

    // Control needs DPS follow-up
    if (main.roles.control >= 3) {
        if (candidate.roles.dps >= 2) score += 12;
    }

    // 2) ENERGY COMPLEMENTARITY
    // Don't overlap expensive colors
    if (!sharesTooManyExpensiveColors(main, candidate)) {
        score += 10;
    }

    // Energy gain helps energy hungry
    if (candidate.mechanics.energyGain > 0 && main.isEnergyHungry) {
        score += 20;
    }

    if (main.mechanics.energyGain > 0 && candidate.isEnergyHungry) {
        score += 15;
    }

    // 3) HOOK SYNERGY (most important!)
    // Main needs stun → candidate provides stun
    if (main.hooks.needsStunnedTarget && candidate.hooks.createsStun) {
        score += 25;
    }

    // Main needs marks → candidate creates marks
    if (main.hooks.needsMarkedTarget && candidate.hooks.createsMark) {
        score += 25;
    }

    // Reverse: candidate needs what main provides
    if (candidate.hooks.needsStunnedTarget && main.hooks.createsStun) {
        score += 15;
    }

    if (candidate.hooks.needsMarkedTarget && main.hooks.createsMark) {
        score += 15;
    }

    // 4) PROTECTION for glass cannons
    if (main.isGlassCannon) {
        if (candidate.mechanics.invulnerable > 0) score += 15;
        if (candidate.mechanics.heal > 0) score += 10;
        if (candidate.mechanics.destructibleDefense > 0) score += 10;
    }

    // 5) ANTI-TANK need
    // If main has no anti-tank, value it highly
    if (main.mechanics.affliction === 0 && main.mechanics.piercing === 0) {
        if (candidate.mechanics.affliction > 0) score += 12;
        if (candidate.mechanics.piercing > 0) score += 8;
    }

    return score;
}

/**
 * Check if characters share too many expensive colors
 */
function sharesTooManyExpensiveColors(char1, char2) {
    const colors1 = char1.energy.colors;
    const colors2 = char2.energy.colors;

    let sharedExpensive = 0;
    ['green', 'red', 'blue', 'white'].forEach(color => {
        // If both use this color heavily (>= 2 skills each)
        if (colors1[color] >= 2 && colors2[color] >= 2) {
            sharedExpensive++;
        }
    });

    return sharedExpensive >= 2; // Problematic if 2+ color conflicts
}

/**
 * Explain why this is a good synergy
 */
function explainSynergy(main, candidate) {
    const reasons = [];

    // Role coverage
    if (main.roles.dps >= 3 && candidate.roles.support >= 2) {
        reasons.push('✓ Provides support for DPS');
    }

    if (main.roles.dps >= 3 && candidate.roles.tank >= 2) {
        reasons.push('✓ Protects DPS');
    }

    // Hook synergy (most exciting!)
    if (main.hooks.needsStunnedTarget && candidate.hooks.createsStun) {
        reasons.push(`✓ ${candidate.name} stuns for ${main.name}'s combo`);
    }

    if (main.hooks.needsMarkedTarget && candidate.hooks.createsMark) {
        reasons.push(`✓ ${candidate.name} marks for ${main.name}'s payoff`);
    }

    // Energy
    if (candidate.mechanics.energyGain > 0 && main.isEnergyHungry) {
        reasons.push('✓ Generates energy for expensive skills');
    }

    // Protection
    if (main.isGlassCannon && (candidate.mechanics.invulnerable > 0 || candidate.mechanics.heal > 0)) {
        reasons.push('✓ Keeps glass cannon alive');
    }

    // Anti-tank
    if (main.mechanics.affliction === 0 && candidate.mechanics.affliction > 0) {
        reasons.push('✓ Adds affliction to bypass defenses');
    }

    if (main.mechanics.piercing === 0 && candidate.mechanics.piercing > 0) {
        reasons.push('✓ Adds piercing damage');
    }

    return reasons.length > 0 ? reasons.join(' | ') : 'Solid teamwork';
}

/**
 * Build complete team around a main character
 * Finds 2 best partners that also synergize with each other
 */
export function buildAroundMain(mainChar, allChars, ownedIds = []) {
    // Get top partners
    const partners = recommendPartners(mainChar, allChars, ownedIds, 10);

    if (partners.length < 2) return partners;

    // Find best pair that also synergizes with each other
    let bestTeam = null;
    let bestScore = 0;

    for (let i = 0; i < Math.min(5, partners.length); i++) {
        for (let j = i + 1; j < Math.min(6, partners.length); j++) {
            const p1 = partners[i];
            const p2 = partners[j];

            // Score this team
            const teamScore =
                p1.synergyScore +
                p2.synergyScore +
                scoreSynergy(p1.profile, p2.profile); // Partners should synergize too!

            if (teamScore > bestScore) {
                bestScore = teamScore;
                bestTeam = [p1, p2];
            }
        }
    }

    return bestTeam || partners.slice(0, 2);
}
