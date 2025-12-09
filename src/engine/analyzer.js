/**
 * NARUTO ARENA - ANALYSIS & SCORING ENGINE
 * Evaluates game states and calculates advantage
 */

import { StatusEffect } from './models.js';

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
        threatAdvantage: calculateThreatAdvantage(myTeam, enemyTeam, gameState.energyPools[teamIndex]),
        overallScore: 0
    };

    // Calculate Overall Score (weighted sum)
    metrics.overallScore =
        (metrics.hpAdvantage * 0.4) +
        (metrics.energyAdvantage * 0.15) +
        (metrics.controlAdvantage * 0.25) +
        (metrics.threatAdvantage * 0.2);

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
            if (skill.description.includes('gain 1 random energy')) {
                energyScore += 5;
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

function calculateThreatAdvantage(myTeam, enemyTeam, myEnergy) {
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
        char.skills.forEach(skill => {
            enemyThreat += skill.damage || 0;
            if (skill.hasSideEffect) enemyThreat += 10;
        });
    });

    const threatDifferential = myThreat - enemyThreat;
    return Math.max(0, threatDifferential / 2);
}
