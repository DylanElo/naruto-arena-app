/**
 * COUNTER BUILDER V2 - Powered by Simulation Engine
 * Uses actual damage calculations instead of heuristics
 */

import { GameState, Character } from '../engine/models.js';
import { calculateOutcome } from '../engine/resolution.js';
import { analyzeGameState } from '../engine/analyzer.js';

/**
 * Calculate counter score using SIMULATION ENGINE
 * This replaces the old heuristic-based scoring
 */
export const calculateCounterScore = (candidate, enemyTeam, currentTeam = []) => {
    // Create a temporary game state
    const gameState = new GameState();

    // Setup potential team (current + candidate)
    const potentialTeam = [...currentTeam, new Character(candidate)].map(c =>
        c instanceof Character ? c : new Character(c)
    );

    // Setup enemy team
    const enemies = enemyTeam.map(e => new Character(e));

    gameState.teams[0] = potentialTeam.slice(0, 3);
    gameState.teams[1] = enemies.slice(0, 3);

    // Analyze game state
    const analysis = analyzeGameState(gameState, 0);

    // Score is based on:
    // 1. Can we kill enemies? (Kill Threat)
    // 2. HP advantage (HP Delta) 
    // 3. Energy efficiency
    // 4. Cooldown pressure

    let score = 0;

    // Kill Threat (most important for counter picks)
    score += analysis.killThreat * 2;

    // HP Delta (normalized to 0-100 range)
    score += Math.min(50, analysis.hpDelta / 6);

    // Energy Efficiency
    score += Math.min(30, analysis.energyEfficiency / 10);

    // Cooldown Pressure
    score += Math.min(20, analysis.cooldownPressure * 2);

    return Math.round(Math.max(0, score));
};

/**
 * Get counter reason using ACTUAL MECHANICS
 */
export const getCounterReason = (candidate, enemyTeam) => {
    const reasons = [];
    const candidateChar = new Character(candidate);
    const enemies = enemyTeam.map(e => new Character(e));

    // Simulate damage against each enemy
    let maxDamage = 0;
    let vulnerableEnemies = 0;
    let canKill = false;

    enemies.forEach(enemy => {
        candidateChar.skills.forEach(skill => {
            if (skill.damage > 0) {
                // Simulate the outcome
                const outcome = calculateOutcome(candidateChar, enemy, skill);

                if (outcome.damageDealt > maxDamage) {
                    maxDamage = outcome.damageDealt;
                }

                if (outcome.killed) {
                    canKill = true;
                }

                // Check if skill ignores their defenses
                if (skill.damageType === 'affliction' && enemy.statusEffects.damageReduction > 0) {
                    vulnerableEnemies++;
                }

                if (skill.damageType === 'piercing') {
                    vulnerableEnemies++;
                }
            }
        });
    });

    // Build reasons based on actual calculations
    if (canKill) {
        reasons.push('✓ Can potentially one-shot enemies');
    } else if (maxDamage >= 40) {
        reasons.push(`✓ High burst damage (${maxDamage} per skill)`);
    }

    if (vulnerableEnemies > 0) {
        reasons.push('✓ Bypasses enemy defenses');
    }

    // Check for stun
    const hasStun = candidateChar.skills.some(s => /stun/i.test(s.description));
    if (hasStun) {
        reasons.push('✓ Provides crowd control');
    }

    // Check for invulnerability
    const hasInvuln = candidateChar.skills.some(s => s.classes.includes('Strategic') && /invulnerable/i.test(s.description));
    if (hasInvuln) {
        reasons.push('✓ Survivability tools');
    }

    return reasons.length > 0 ? reasons.join(' | ') : 'General matchup advantage';
};

/**
 * Build counter team using SIMULATION ENGINE
 */
export const buildCounterTeam = (enemyTeam, allCharacters, ownedCharacterIds = [], currentTeam = []) => {
    if (!enemyTeam || enemyTeam.length === 0) {
        return [];
    }

    // Filter to owned characters not in current team
    const availableChars = allCharacters.filter(c => {
        const isOwned = ownedCharacterIds.length === 0 || ownedCharacterIds.includes(c.id);
        const notInTeam = !currentTeam.find(t => t.id === c.id);
        return isOwned && notInTeam;
    });

    // Score each character using SIMULATION ENGINE
    const scoredChars = availableChars.map(char => ({
        ...char,
        counterScore: calculateCounterScore(char, enemyTeam, currentTeam),
        counterReason: getCounterReason(char, enemyTeam)
    }));

    // Sort by counter score
    return scoredChars
        .sort((a, b) => b.counterScore - a.counterScore)
        .slice(0, 10);
};
