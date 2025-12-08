/**
 * NARUTO ARENA - ANALYSIS & SCORING ENGINE
 * Evaluates game states and calculates advantage
 */

import { EnergyType } from './models.js';
import { calculateOutcome } from './resolution.js';

/**
 * Analyze current game state and return a score
 * Higher score = better position for Team A
 */
export function analyzeGameState(gameState, teamIndex = 0) {
    const myTeam = gameState.teams[teamIndex];
    const enemyTeam = gameState.teams[1 - teamIndex];

    const metrics = {
        hpDelta: 0,
        energyEfficiency: 0,
        cooldownPressure: 0,
        killThreat: 0,
        overallScore: 0
    };

    // 1. HP DELTA
    metrics.hpDelta = calculateHPDelta(myTeam, enemyTeam);

    // 2. ENERGY EFFICIENCY
    metrics.energyEfficiency = calculateEnergyEfficiency(myTeam, gameState.energyPools[teamIndex]);

    // 3. COOLDOWN PRESSURE
    metrics.cooldownPressure = calculateCooldownPressure(myTeam, enemyTeam);

    // 4. KILL THREAT (Lethal Check)
    metrics.killThreat = calculateKillThreat(myTeam, enemyTeam);

    // Calculate Overall Score (weighted sum)
    metrics.overallScore =
        (metrics.hpDelta * 1.0) +
        (metrics.energyEfficiency * 0.5) +
        (metrics.cooldownPressure * 0.3) +
        (metrics.killThreat * 2.0);

    return metrics;
}

/**
 * 1. HP DELTA
 * (My Team Total HP) - (Enemy Team Total HP)
 */
function calculateHPDelta(myTeam, enemyTeam) {
    const myHP = myTeam.reduce((sum, char) => sum + char.hp, 0);
    const enemyHP = enemyTeam.reduce((sum, char) => sum + char.hp, 0);

    return myHP - enemyHP;
}

/**
 * 2. ENERGY EFFICIENCY
 * Probability of drawing required energy
 * Formula: P(energy E) = 1 - (0.75)^N, where N = number of chars generating E
 */
function calculateEnergyEfficiency(team, energyPool) {
    let efficiencyScore = 0;

    // Count energy-generating characters for each type
    const energyGenerators = {
        [EnergyType.TAIJUTSU]: 0,
        [EnergyType.BLOODLINE]: 0,
        [EnergyType.NINJUTSU]: 0,
        [EnergyType.GENJUTSU]: 0
    };

    team.forEach(char => {
        if (!char.isAlive()) return;

        char.skills.forEach(skill => {
            skill.energyCost.forEach(energyType => {
                if (energyType !== EnergyType.RANDOM && energyGenerators[energyType] !== undefined) {
                    energyGenerators[energyType]++;
                }
            });
        });
    });

    // Calculate probability for each energy type
    Object.entries(energyGenerators).forEach(([energyType, count]) => {
        if (count > 0) {
            const probability = 1 - Math.pow(0.75, count);
            efficiencyScore += probability * 100; // Scale to 0-100 range
        }
    });

    return efficiencyScore;
}

/**
 * 3. COOLDOWN PRESSURE
 * Sum of (Enemy Cooldowns) - Sum of (My Cooldowns)
 * Higher is better (enemy has more skills on cooldown)
 */
function calculateCooldownPressure(myTeam, enemyTeam) {
    const myCooldowns = myTeam.reduce((sum, char) =>
        sum + char.cooldowns.reduce((a, b) => a + b, 0), 0
    );

    const enemyCooldowns = enemyTeam.reduce((sum, char) =>
        sum + char.cooldowns.reduce((a, b) => a + b, 0), 0
    );

    return enemyCooldowns - myCooldowns;
}

/**
 * 4. KILL THREAT (Lethal Check)
 * Can we kill an enemy this turn?
 * Warning: Must check for Counter skills
 */
function calculateKillThreat(myTeam, enemyTeam) {
    let maxThreat = 0;

    // For each enemy character
    // We assume enemy has infinite/unknown energy for threat calculation to be safe, 
    // OR we can pass a dummy pool if we want to be realistic. 
    // For now, let's assuming they might have energy is safer (worst-case analysis).
    enemyTeam.forEach(enemy => {
        if (!enemy.isAlive()) return;

        // Check if enemy has counter skill available
        const hasCounter = enemy.skills.some((skill, index) => {
            const isCounter = /counter|reflect/i.test(skill.description);
            const isAvailable = enemy.canUseSkill(index, gameState.energyPools[1 - teamIndex]); // Approximation for enemy energy
            return isCounter && isAvailable;
        });

        // If enemy has counter, threat is 0
        if (hasCounter) return;

        // Calculate total instant damage we can deal
        let totalInstantDamage = 0;
        let totalPiercingDamage = 0;

        myTeam.forEach(char => {
            if (!char.isAlive()) return;

            char.skills.forEach((skill, index) => {
                if (!char.canUseSkill(index, gameState.energyPools[teamIndex])) return;

                // Only count instant skills
                if (skill.classes.includes('Instant')) {
                    if (skill.damageType === 'piercing') {
                        totalPiercingDamage += skill.damage;
                    } else {
                        totalInstantDamage += skill.damage;
                    }
                }
            });
        });

        const combinedDamage = totalInstantDamage + totalPiercingDamage;

        // Check if we can kill this enemy
        if (enemy.hp < combinedDamage) {
            // Higher threat if enemy is lower HP (prioritize finishing kills)
            const threat = 100 - enemy.hp;
            maxThreat = Math.max(maxThreat, threat);
        }
    });

    return maxThreat;
}

/**
 * Find best move for current game state
 * Returns { characterIndex, skillIndex, targetIndex, expectedValue }
 */
export function findBestMove(gameState, teamIndex) {
    const myTeam = gameState.teams[teamIndex];
    const enemyTeam = gameState.teams[1 - teamIndex];

    let bestMove = {
        characterIndex: -1,
        skillIndex: -1,
        targetIndex: -1,
        expectedValue: -Infinity
    };

    // Evaluate all possible moves
    myTeam.forEach((char, charIndex) => {
        if (!char.isAlive()) return;

        char.skills.forEach((skill, skillIndex) => {
            if (!char.canUseSkill(skillIndex, gameState.energyPools[teamIndex])) return;

            // For each potential target
            enemyTeam.forEach((target, targetIndex) => {
                if (!target.isAlive()) return;

                // Simulate outcome
                const outcome = calculateOutcome(char, target, skill);

                // Simple value function: damage dealt + kill bonus
                let value = outcome.damageDealt;
                if (outcome.killed) {
                    value += 100; // Big bonus for kills
                }

                if (value > bestMove.expectedValue) {
                    bestMove = {
                        characterIndex: charIndex,
                        skillIndex,
                        targetIndex,
                        expectedValue: value
                    };
                }
            });
        });
    });

    return bestMove;
}

/**
 * Calculate win probability based on current state
 * Returns probability (0 to 1) that Team A wins
 */
export function calculateWinProbability(gameState, teamIndex = 0) {
    const metrics = analyzeGameState(gameState, teamIndex);

    // Simple logistic function based on overall score
    // This is a heuristic and can be tuned
    const score = metrics.overallScore;
    const probability = 1 / (1 + Math.exp(-score / 50));

    return probability;
}
