/**
 * NARUTO ARENA - ANALYSIS & SCORING ENGINE
 * Evaluates game states and calculates advantage
 */

import { StatusEffect } from './models.js';

const SCORE_WEIGHTS = {
    HP: 0.4,
    ENERGY: 0.15,
    CONTROL: 0.25,
    THREAT: 0.2,
};

/**
 * Analyze current game state and return a score
 * Higher score = better position for Team A
 */
export function analyzeGameState(gameState, teamIndex = 0) {
    const myTeam = gameState.teams[teamIndex];
    const enemyTeam = gameState.teams[1 - teamIndex];

    const metrics = {
        hpAdvantage: calculateHpAdvantage(myTeam, enemyTeam),
        energyAdvantage: calculateEnergyAdvantage(myTeam, gameState.energyPools[teamIndex]),
        controlAdvantage: calculateControlAdvantage(myTeam, enemyTeam),
        threatAdvantage: calculateThreatAdvantage(myTeam, enemyTeam, gameState.energyPools[teamIndex], gameState.energyPools[1 - teamIndex]),
        overallScore: 0
    };

    // Calculate Overall Score (weighted sum)
    // Weights are chosen to prioritize long-term advantage over immediate threats.
    // HP advantage is the most significant factor, as it represents the overall game state.
    // Control and threat advantage are also important, but less so than HP.
    // Energy advantage is the least important, as it is the most volatile.
    metrics.overallScore =
        (metrics.hpAdvantage * SCORE_WEIGHTS.HP) +
        (metrics.energyAdvantage * SCORE_WEIGHTS.ENERGY) +
        (metrics.controlAdvantage * SCORE_WEIGHTS.CONTROL) +
        (metrics.threatAdvantage * SCORE_WEIGHTS.THREAT);

    return metrics;
}

function calculateHpAdvantage(myTeam, enemyTeam) {
    const myTotalHp = myTeam.reduce((sum, char) => sum + char.hp, 0);
    const enemyTotalHp = enemyTeam.reduce((sum, char) => sum + char.hp, 0);
    const myMaxHp = myTeam.reduce((sum, char) => sum + 100, 0);
    const enemyMaxHp = enemyTeam.reduce((sum, char) => sum + 100, 0);

    const myHpPercentage = myTotalHp / myMaxHp;
    const enemyHpPercentage = enemyTotalHp / enemyMaxHp;

    return (myHpPercentage - enemyHpPercentage) * 100;
}

function calculateEnergyAdvantage(team, energyPool) {
    let energyScore = 0;
    energyScore += Object.values(energyPool).reduce((sum, val) => sum + val, 0) * 5;

    team.forEach(char => {
        if (!char.isAlive()) return;
        char.skills.forEach(skill => {
            if (skill.effects && skill.effects.energyGain) {
                energyScore += skill.effects.energyGain.amount * 5;
            }
        });
    });

    return Math.min(energyScore, 100);
}

function calculateControlAdvantage(myTeam, enemyTeam) {
    let controlScore = 0;

    // Cooldown pressure
    const myCooldowns = myTeam.reduce((sum, char) => sum + char.cooldowns.reduce((a, b) => a + b, 0), 0);
    const enemyCooldowns = enemyTeam.reduce((sum, char) => sum + char.cooldowns.reduce((a, b) => a + b, 0), 0);
    controlScore += (enemyCooldowns - myCooldowns) * 2;

    // Stun and debuff pressure
    enemyTeam.forEach(char => {
        if (char.statusEffects.stunned) {
            controlScore += 20;
        }
    });

    return Math.max(0, controlScore);
}

function calculateThreatAdvantage(myTeam, enemyTeam, myEnergy, enemyEnergy) {
    let myThreat = 0;
    let enemyThreat = 0;

    myTeam.forEach(char => {
        if (!char.isAlive()) return;
        char.skills.forEach((skill, index) => {
            if (char.canUseSkill(index, myEnergy)) {
                myThreat += skill.damage || 0;
                if (skill.hasSideEffect) myThreat += 10;
            }
        });
    });

    enemyTeam.forEach(char => {
        if (!char.isAlive()) return;
        char.skills.forEach((skill, index) => {
            if (char.canUseSkill(index, enemyEnergy)) {
                enemyThreat += skill.damage || 0;
                if (skill.hasSideEffect) enemyThreat += 10;
            }
        });
    });

    const threatDifferential = myThreat - enemyThreat;
    return Math.max(0, threatDifferential / 2);
}

/**
 * Find the best move for the current team.
 * This function evaluates all possible skill uses against all possible targets
 * and selects the one with the highest strategic score.
 */
export function findBestMove(gameState, teamIndex = 0) {
    const myTeam = gameState.teams[teamIndex];
    const enemyTeam = gameState.teams[1 - teamIndex];
    const energy = gameState.energyPools[teamIndex];
    let bestMove = { score: -Infinity, action: null };

    myTeam.forEach(char => {
        if (!char.isAlive()) return;

        char.skills.forEach((skill, skillIndex) => {
            if (char.canUseSkill(skillIndex, energy)) {
                // For now, we assume all skills target enemies. A more complex model
                // would differentiate between buffs, heals, and attacks.
                enemyTeam.forEach(target => {
                    if (!target.isAlive()) return;

                    // Score the move based on a heuristic
                    let score = 0;
                    const damage = skill.damage || 0;

                    // Base score from damage and side effects
                    score += damage;
                    if (skill.hasSideEffect) {
                        score += 15; // Side effects are valuable
                    }

                    // Significant bonus for a killing blow
                    if (target.hp > 0 && target.hp <= damage) {
                        score += 75; // Prioritize removing enemies
                    }

                    // Penalize overkill to prefer efficient lethal moves
                    score -= Math.max(0, damage - target.hp) * 1.5;

                    if (score > bestMove.score) {
                        bestMove = {
                            score,
                            action: {
                                type: 'SKILL',
                                characterId: char.id,
                                skillId: skillIndex,
                                targetId: target.id, // Correctly identify the target
                            },
                        };
                    }
                });
            }
        });
    });

    if (bestMove.action) {
        return bestMove.action;
    }

    return { type: 'PASS' }; // No available moves
}

/**
 * Calculate win probability based on game state score
 * Uses a logistic function for a smooth curve
 */
export function calculateWinProbability(score) {
    // Sigmoid function to map score (-100 to 100) to a probability (0 to 1)
    const k = 0.025; // Steepness of the curve
    return 1 / (1 + Math.exp(-k * score));
}
