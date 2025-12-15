/**
 * MATCHUP LOGIC - Manual-based counter analysis
 * Uses game manual relationships instead of guessing
 */

import { analyzeCharacter } from './recommendationEngine.js';

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
        const analysis = analyzeCharacter(enemy);
        const mechanics = analysis.mechanics;

        threats.damageReduction += mechanics.damage_reduction || 0;
        threats.destructibleDefense += mechanics.defense || 0; // mapped from ancient field?
        threats.invulnerable += mechanics.invulnerable || 0;
        threats.stun += mechanics.stun || 0;
        threats.energyDrain += mechanics.skillSteal || 0; // rough mapping
        threats.affliction += mechanics.stacking || 0;    // 'stacking' is our main dot/affliction metric
        threats.piercing += mechanics.piercing || 0;
        threats.burst += mechanics.punisher || 0;         // approximation
        threats.heal += mechanics.heal || 0;
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
    // Map from analyzeCharacter mechanics to needs
    const m = characterProfile.mechanics;

    // Affliction need (uses stacking)
    score += Math.min(m.stacking || 0, needs.affliction) * 3;

    // Piercing need
    score += Math.min(m.piercing || 0, needs.piercing) * 2;

    // Health steal need (uses heal as proxy or specific if available)
    score += Math.min(m.heal || 0, needs.healthSteal) * 2;

    // Cleanse need
    score += Math.min(m.cleanse || 0, needs.cleanse) * 3;

    // Heal need
    score += Math.min(m.heal || 0, needs.heal) * 2;

    // Burst need (uses punisher/burst damage proxy)
    score += Math.min(m.punisher || 0, needs.burst) * 2;

    // Invulnerability need
    score += Math.min(m.invulnerable || 0, needs.invulnerable) * 3;

    // Ignore harmful need (immunity)
    const hasIgnoreHarmful = (m.invulnerable || 0) > 0 || (m.cleanse || 0) > 0; // simplified
    score += (hasIgnoreHarmful && needs.ignoreHarmful > 0) ? needs.ignoreHarmful * 3 : 0;

    // Reflect need (uses counter)
    score += Math.min(m.counter || 0, needs.reflect) * 2;

    // Energy gain need
    score += Math.min(m.energyGen || 0, needs.energyGain) * 3;

    // Low cost need (uses avgDPE or energy profile?)
    // This is tricky without the full profile object if we just have mechanics
    // But analyzeCharacter returns the whole object, so check energy
    // const hasLowCost = characterProfile.energy?.avgCost <= 1.5; 
    // score += (hasLowCost && needs.lowCost > 0) ? needs.lowCost * 2 : 0;

    // Control need  (stun)
    score += Math.min((m.stun || 0) + (m.skillSteal || 0), needs.control) * 3;

    return score;
}

/**
 * Generate counter explanation
 */
export function explainCounter(characterProfile, enemyThreats) {
    const reasons = [];
    const m = characterProfile.mechanics;

    // Affliction advantage (stacking)
    if ((m.stacking || 0) > 0 && (enemyThreats.damageReduction > 0 || enemyThreats.destructibleDefense > 0)) {
        reasons.push('✓ Affliction bypasses their defenses');
    }

    // Piercing advantage
    if ((m.piercing || 0) > 0 && enemyThreats.damageReduction > 0) {
        reasons.push('✓ Piercing ignores damage reduction');
    }

    // Cleanse vs affliction
    if ((m.cleanse || 0) > 0 && enemyThreats.affliction >= 2) {
        reasons.push('✓ Cleanse removes their affliction DoTs');
    }

    // Immunity vs stun
    if (((m.invulnerable || 0) > 0 || (m.cleanse || 0) > 0) && enemyThreats.stun >= 2) {
        reasons.push('✓ Immunity/invul protects vs their stuns');
    }

    // Energy advantage
    if ((m.energyGen || 0) > 0 && enemyThreats.energyDrain >= 2) {
        reasons.push('✓ Energy generation counters their drain');
    }

    // Burst advantage
    if ((m.punisher || 0) >= 2) { // punisher as burst proxy
        reasons.push(`✓ High burst threat`);
    }

    // Control advantage
    if ((m.stun || 0) > 0) {
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
        const counterReason = explainCounter(profile, threats);

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
