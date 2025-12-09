/**
 * MATCHUP LOGIC - Manual-based counter analysis
 * Uses game manual relationships instead of guessing
 */

import { buildCharacterProfile } from './skillTagger.js';

/**
 * MANUAL-BASED Counter Matrix
 * From game manual: what beats what
 */
const COUNTER_RULES = {
    // vs Damage Reduction
    vsDamageReduction: {
        affliction: 3,      // ignores it completely
        piercing: 2,        // ignores it
        healthSteal: 2,     // goes through it
        normal: 0           // blocked by it
    },

    // vs Destructible Defense
    vsDestructibleDefense: {
        affliction: 3,      // ignores it completely
        piercing: 1,        // must chew through it
        healthSteal: 0,     // blocked by it (can't steal from shields)
        normal: 1           // must chew through it
    },

    // vs Invulnerability
    vsInvulnerability: {
        control: 2,         // stun before they invul
        energyRemoval: 2,   // prevent them from using it
        reflect: 1          // bounce it back
    },

    // vs Stun
    vsStun: {
        invulnerable: 3,    // prevents stun from landing
        ignoreHarmful: 3,   // immunity
        counter: 2,         // negate the stun skill
        reflect: 2          // bounce it back
    },

    // vs Energy Drain
    vsEnergyDrain: {
        energyGain: 3,      // counteract the drain
        lowCost: 2,         // less reliant on energy
        energySteal: 2      // fight back
    },

    // vs Affliction
    vsAffliction: {
        cleanse: 3,         // remove it
        heal: 2,            // outheal it
        burst: 2            // kill source quickly
    }
};

/**
 * Analyze enemy team threats
 */
export function analyzeEnemyThreats(enemyTeam) {
    const threats = {
        damageReduction: 0,
        destructibleDefense: 0,
        invulnerable: 0,
        stun: 0,
        energyDrain: 0,
        affliction: 0,
        piercing: 0,
        burst: 0,
        heal: 0
    };

    enemyTeam.forEach(enemy => {
        const profile = buildCharacterProfile(enemy);
        if (!profile) return;

        threats.damageReduction += profile.mechanics.damageReduction;
        threats.destructibleDefense += profile.mechanics.destructibleDefense;
        threats.invulnerable += profile.mechanics.invulnerable;
        threats.stun += profile.mechanics.stun;
        threats.energyDrain += profile.mechanics.energyRemoval;
        threats.affliction += profile.mechanics.affliction;
        threats.piercing += profile.mechanics.piercing;
        threats.burst += profile.mechanics.burst;
        threats.heal += profile.mechanics.heal;
    });

    return threats;
}

/**
 * Calculate what the team NEEDS to counter enemy threats
 */
export function calculateNeeds(enemyThreats) {
    const needs = {
        affliction: 0,
        piercing: 0,
        healthSteal: 0,
        cleanse: 0,
        heal: 0,
        burst: 0,
        invulnerable: 0,
        ignoreHarmful: 0,
        reflect: 0,
        energyGain: 0,
        lowCost: 0,
        control: 0
    };

    // vs enemy DR + DD → need affliction/piercing
    if (enemyThreats.damageReduction + enemyThreats.destructibleDefense >= 3) {
        needs.affliction += 3;
        needs.piercing += 2;
        needs.healthSteal += 1;
    }

    // vs enemy affliction → need cleanse/heal/burst
    if (enemyThreats.affliction >= 3) {
        needs.cleanse += 3;
        needs.heal += 2;
        needs.burst += 2;
    }

    // vs enemy stun → need immunity/counter/reflect
    if (enemyThreats.stun >= 3) {
        needs.invulnerable += 3;
        needs.ignoreHarmful += 3;
        needs.reflect += 2;
    }

    // vs enemy energy drain → need energy gain/low cost
    if (enemyThreats.energyDrain >= 2) {
        needs.energyGain += 3;
        needs.lowCost += 2;
    }

    // vs enemy burst → need sustain
    if (enemyThreats.burst >= 2) {
        needs.heal += 2;
        needs.invulnerable += 2;
    }

    // vs enemy invul spam → need control/energy removal
    if (enemyThreats.invulnerable >= 3) {
        needs.control += 3;
    }

    return needs;
}

/**
 * Score a character against enemy needs
 */
export function scoreCounterMatch(characterProfile, needs) {
    let score = 0;

    // Affliction need
    score += Math.min(characterProfile.mechanics.affliction, needs.affliction) * 3;

    // Piercing need
    score += Math.min(characterProfile.mechanics.piercing, needs.piercing) * 2;

    // Health steal need
    score += Math.min(characterProfile.mechanics.healthSteal, needs.healthSteal) * 2;

    // Cleanse need
    score += Math.min(characterProfile.mechanics.cleanse, needs.cleanse) * 3;

    // Heal need
    score += Math.min(characterProfile.mechanics.heal, needs.heal) * 2;

    // Burst need
    score += Math.min(characterProfile.mechanics.burst, needs.burst) * 2;

    // Invulnerability need
    score += Math.min(characterProfile.mechanics.invulnerable, needs.invulnerable) * 3;

    // Ignore harmful need (immunity)
    const hasIgnoreHarmful = characterProfile.mechanics.invulnerable > 0 || characterProfile.mechanics.cleanse > 0;
    score += (hasIgnoreHarmful && needs.ignoreHarmful > 0) ? needs.ignoreHarmful * 3 : 0;

    // Reflect need
    score += Math.min(characterProfile.mechanics.reflect, needs.reflect) * 2;

    // Energy gain need
    score += Math.min(characterProfile.mechanics.energyGain, needs.energyGain) * 3;

    // Low cost need
    const hasLowCost = characterProfile.energy.avgCost <= 1.5;
    score += (hasLowCost && needs.lowCost > 0) ? needs.lowCost * 2 : 0;

    // Control need  
    score += Math.min(characterProfile.mechanics.stun + characterProfile.mechanics.energyRemoval, needs.control) * 3;

    return score;
}

/**
 * Generate counter explanation
 */
export function explainCounter(characterProfile, enemyThreats, needs) {
    const reasons = [];

    // Affliction advantage
    if (characterProfile.mechanics.affliction > 0 && (enemyThreats.damageReduction > 0 || enemyThreats.destructibleDefense > 0)) {
        reasons.push('✓ Affliction bypasses their defenses');
    }

    // Piercing advantage
    if (characterProfile.mechanics.piercing > 0 && enemyThreats.damageReduction > 0) {
        reasons.push('✓ Piercing ignores damage reduction');
    }

    // Cleanse vs affliction
    if (characterProfile.mechanics.cleanse > 0 && enemyThreats.affliction >= 2) {
        reasons.push('✓ Cleanse removes their affliction DoTs');
    }

    // Immunity vs stun
    if ((characterProfile.mechanics.invulnerable > 0 || characterProfile.mechanics.cleanse > 0) && enemyThreats.stun >= 2) {
        reasons.push('✓ Immunity/invul protects vs their stuns');
    }

    // Energy advantage
    if (characterProfile.mechanics.energyGain > 0 && enemyThreats.energyDrain >= 2) {
        reasons.push('✓ Energy generation counters their drain');
    }

    // Burst advantage
    if (characterProfile.mechanics.burst >= 2) {
        reasons.push(`✓ High burst threat`);
    }

    // Control advantage
    if (characterProfile.mechanics.stun > 0) {
        reasons.push('✓ Can disrupt with stuns');
    }

    return reasons.length > 0 ? reasons.join(' | ') : 'General advantage';
}

/**
 * Main counter builder using manual logic
 */
export function buildCounterTeamManual(enemyTeam, allCharacters, ownedIds = [], currentTeam = []) {
    if (!enemyTeam || enemyTeam.length === 0) {
        return [];
    }

    // 1. Analyze enemy threats
    const threats = analyzeEnemyThreats(enemyTeam);

    // 2. Calculate what we need
    const needs = calculateNeeds(threats);

    // 3. Score available characters
    const available = allCharacters.filter(c => {
        const isOwned = ownedIds.length === 0 || ownedIds.includes(c.id);
        const notInTeam = !currentTeam.find(t => t.id === c.id);
        return isOwned && notInTeam;
    });

    const scored = available.map(char => {
        const profile = buildCharacterProfile(char);
        if (!profile) return null;

        const counterScore = scoreCounterMatch(profile, needs);
        const counterReason = explainCounter(profile, threats, needs);

        // Add baseline strength (don't pick weak characters just because they counter)
        const baselineStrength =
            profile.mechanics.burst * 5 +
            profile.mechanics.stun * 3 +
            profile.mechanics.heal * 2;

        return {
            ...char,
            counterScore: counterScore + baselineStrength,
            counterReason,
            profile
        };
    }).filter(c => c !== null);

    return scored.sort((a, b) => b.counterScore - a.counterScore).slice(0, 10);
}
