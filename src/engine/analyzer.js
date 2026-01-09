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
    metrics.killThreat = calculateKillThreat(myTeam, enemyTeam, gameState, teamIndex);

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
function calculateEnergyEfficiency(team) {
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

        if (char.energyProfile) {
            // OPTIMIZATION: Use pre-calculated energy profile
            energyGenerators[EnergyType.TAIJUTSU] += char.energyProfile[EnergyType.TAIJUTSU];
            energyGenerators[EnergyType.BLOODLINE] += char.energyProfile[EnergyType.BLOODLINE];
            energyGenerators[EnergyType.NINJUTSU] += char.energyProfile[EnergyType.NINJUTSU];
            energyGenerators[EnergyType.GENJUTSU] += char.energyProfile[EnergyType.GENJUTSU];
        } else {
            // Fallback
            char.skills.forEach(skill => {
                skill.energyCost.forEach(energyType => {
                    if (energyType !== EnergyType.RANDOM && energyGenerators[energyType] !== undefined) {
                        energyGenerators[energyType]++;
                    }
                });
            });
        }
    });

    // Calculate probability for each energy type
    Object.entries(energyGenerators).forEach(([, count]) => {
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
function calculateKillThreat(myTeam, enemyTeam, gameState, teamIndex) {
    let maxThreat = 0;

    // OPTIMIZATION: Calculate total potential damage once, as it's independent of the specific enemy
    // (unless target-specific logic exists, which is not the case for basic total sum here).
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

    // For each enemy character
    // We assume enemy has infinite/unknown energy for threat calculation to be safe, 
    // OR we can pass a dummy pool if we want to be realistic. 
    // For now, let's assuming they might have energy is safer (worst-case analysis).
    enemyTeam.forEach(enemy => {
        if (!enemy.isAlive()) return;

        // Check if enemy has counter skill available
        const hasCounter = enemy.skills.some((skill, index) => {
            const isCounter = skill.isCounter !== undefined
                ? skill.isCounter
                : /counter|reflect/i.test(skill.description);
            const isAvailable = enemy.canUseSkill(index, gameState.energyPools[1 - teamIndex]); // Approximation for enemy energy
            return isCounter && isAvailable;
        });

        // If enemy has counter, threat is 0
        if (hasCounter) return;

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
 * Helper to clone a character for simulation
 * Shallow copies mostly, deep copies mutable state
 */
function cloneCharacter(char) {
    // Create new object with same prototype
    const clone = Object.create(Object.getPrototypeOf(char));

    // Manual copy for performance (faster than Object.assign)
    clone.id = char.id;
    clone.name = char.name;
    clone.hp = char.hp;
    clone.maxHP = char.maxHP;
    clone.skills = char.skills; // Reference copy (immutable config)
    clone.energyProfile = char.energyProfile; // Reference copy (immutable config)

    // Deep copy mutable state
    clone.statusEffects = { ...char.statusEffects };
    clone.activeStatuses = new Set(char.activeStatuses);
    clone.cooldowns = [...char.cooldowns];

    return clone;
}

/**
 * OPTIMIZATION: Reusable state copy for simulation loop
 * Avoids object allocation/GC overhead by copying state into reusable objects
 */
function copyCharacterState(source, target) {
    target.id = source.id;
    target.name = source.name;
    target.hp = source.hp;
    target.maxHP = source.maxHP;
    target.skills = source.skills;

    // Robust copy of statusEffects
    // 1. Copy/Overwrite all keys from source
    for (const key in source.statusEffects) {
        target.statusEffects[key] = source.statusEffects[key];
    }
    // 2. Delete keys in target that are not in source to avoid state pollution
    for (const key in target.statusEffects) {
        if (!(key in source.statusEffects)) {
            delete target.statusEffects[key];
        }
    }

    // Optimized Set copy
    target.activeStatuses.clear();
    for (const status of source.activeStatuses) {
        target.activeStatuses.add(status);
    }

    // Robust Array copy for cooldowns
    // Handle potential length mismatches (though unlikely in this specific game logic)
    if (target.cooldowns.length !== source.cooldowns.length) {
        target.cooldowns = [...source.cooldowns];
    } else {
        for (let i = 0; i < source.cooldowns.length; i++) {
            target.cooldowns[i] = source.cooldowns[i];
        }
    }
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

    // Optimization: Create reusable objects once to avoid allocation inside the loop
    // Use the first alive character as a prototype template
    const templateChar = myTeam.find(c => c) || enemyTeam.find(c => c);

    // Fallback if teams are empty (shouldn't happen in valid game state)
    if (!templateChar) return bestMove;

    const simChar = cloneCharacter(templateChar);
    const simTarget = cloneCharacter(templateChar);

    // Evaluate all possible moves
    myTeam.forEach((char, charIndex) => {
        if (!char.isAlive()) return;

        char.skills.forEach((skill, skillIndex) => {
            if (!char.canUseSkill(skillIndex, gameState.energyPools[teamIndex])) return;

            // For each potential target
            enemyTeam.forEach((target, targetIndex) => {
                if (!target.isAlive()) return;

                // Optimization: reuse existing objects instead of creating new ones
                copyCharacterState(char, simChar);
                copyCharacterState(target, simTarget);

                // Simulate outcome
                const outcome = calculateOutcome(simChar, simTarget, skill);

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
