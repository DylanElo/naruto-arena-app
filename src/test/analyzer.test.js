import { describe, it, expect } from 'vitest';
import { analyzeGameState, findBestMove } from '../engine/analyzer.js';

// Mock character factory for controlled testing
const createMockCharacter = (id, hp, skills = [], cooldowns = [0, 0, 0, 0], statusEffects = {}) => ({
    id,
    hp,
    skills,
    cooldowns,
    statusEffects: { stunned: false, ...statusEffects },
    isAlive: () => hp > 0,
    // Simplified skill check for threat calculation
    canUseSkill: (skillIndex, energyPool) => {
        if (statusEffects.stunned || (cooldowns && cooldowns[skillIndex] > 0)) {
            return false;
        }
        return true;
    }
});

// Mock skill factory
const createMockSkill = (damage, hasSideEffect = false) => ({
    damage: damage || 0,
    hasSideEffect,
});

describe('analyzeGameState', () => {

    it('should return a score of 0 for a perfectly balanced game state', () => {
        const teamA = [
            createMockCharacter('charA1', 100),
            createMockCharacter('charA2', 100),
            createMockCharacter('charA3', 100),
        ];
        const teamB = [
            createMockCharacter('charB1', 100),
            createMockCharacter('charB2', 100),
            createMockCharacter('charB3', 100),
        ];

        const gameState = {
            teams: [teamA, teamB],
            energyPools: [
                { green: 0, red: 0, blue: 0, white: 0, black: 0 },
                { green: 0, red: 0, blue: 0, white: 0, black: 0 },
            ],
        };

        const metrics = analyzeGameState(gameState, 0);

        expect(metrics.hpAdvantage).toBe(0);
        expect(metrics.energyAdvantage).toBe(0);
        expect(metrics.controlAdvantage).toBe(0);
        expect(metrics.threatAdvantage).toBe(0);
        expect(metrics.overallScore).toBe(0);
    });

    it('should calculate a positive HP advantage when Team A has a higher HP percentage', () => {
        const teamA = [
            createMockCharacter('charA1', 100),
            createMockCharacter('charA2', 100),
            createMockCharacter('charA3', 100), // Total HP: 300/300 = 100%
        ];
        const teamB = [
            createMockCharacter('charB1', 50),
            createMockCharacter('charB2', 50),
            createMockCharacter('charB3', 50), // Total HP: 150/300 = 50%
        ];
        const gameState = { teams: [teamA, teamB], energyPools: [{}, {}] };

        const metrics = analyzeGameState(gameState, 0);
        // Expected: (1.0 - 0.5) * 100 = 50
        expect(metrics.hpAdvantage).toBeCloseTo(50);
        expect(metrics.overallScore).toBeGreaterThan(0);
    });

    it('should calculate a negative HP advantage when Team A has a lower HP percentage', () => {
        const teamA = [
            createMockCharacter('charA1', 25),
            createMockCharacter('charA2', 25), // Total HP: 50/300
            createMockCharacter('charA3', 0),
        ];
        const teamB = [
            createMockCharacter('charB1', 100), // Total HP: 100/300
            createMockCharacter('charB2', 0),
            createMockCharacter('charB3', 0),
        ];
        const gameState = { teams: [teamA, teamB], energyPools: [{}, {}] };

        const metrics = analyzeGameState(gameState, 0);
        // Expected: (50/300 - 100/300) * 100 = -16.67
        expect(metrics.hpAdvantage).toBeCloseTo(-16.67);
        expect(metrics.overallScore).toBeLessThan(0);
    });

    it('should calculate a positive control advantage when the enemy is stunned', () => {
        const teamA = [createMockCharacter('charA1', 100)];
        const teamB = [createMockCharacter('charB1', 100, [], [0], { stunned: true })];
        const gameState = { teams: [teamA, teamB], energyPools: [{}, {}] };

        const metrics = analyzeGameState(gameState, 0);
        expect(metrics.controlAdvantage).toBe(20); // 20 points for a stun
        expect(metrics.overallScore).toBeGreaterThan(0);
    });

    it('should calculate a positive control advantage when the enemy has longer cooldowns', () => {
        const teamA = [createMockCharacter('charA1', 100, [], [0, 0])];
        const teamB = [createMockCharacter('charB1', 100, [], [3, 4])]; // total cooldowns = 7
        const gameState = { teams: [teamA, teamB], energyPools: [{}, {}] };

        const metrics = analyzeGameState(gameState, 0);
        // Expected: (7 - 0) * 2 = 14
        expect(metrics.controlAdvantage).toBe(14);
        expect(metrics.overallScore).toBeGreaterThan(0);
    });

    it('should calculate a positive threat advantage when Team A has more damage potential', () => {
        const teamA = [createMockCharacter('charA1', 100, [createMockSkill(40), createMockSkill(50, true)])];
        const teamB = [createMockCharacter('charB1', 100, [createMockSkill(20)])];
        const gameState = { teams: [teamA, teamB], energyPools: [ { green: 5 }, { green: 5 }] };

        const metrics = analyzeGameState(gameState, 0);
        // My threat: 40 + 50 + 10 (side effect) = 100
        // Enemy threat: 20
        // Differential = 100 - 20 = 80
        // Threat Advantage = 80 / 2 = 40
        expect(metrics.threatAdvantage).toBe(40);
        expect(metrics.overallScore).toBeGreaterThan(0);
    });

    it('should correctly weigh multiple factors in the overall score', () => {
        // Team A: Lower HP
        const teamA = [ createMockCharacter('charA1', 40, [createMockSkill(50)]) ];
        // Team B: Higher HP, but one char is stunned and has cooldowns
        const teamB = [
            createMockCharacter('charB1', 100, [createMockSkill(20)], [3], { stunned: true }),
            createMockCharacter('charB2', 90, [createMockSkill(20)]),
        ];

        const gameState = {
            teams: [teamA, teamB],
            energyPools: [ { generic: 2 }, { generic: 2 } ],
        };

        const metrics = analyzeGameState(gameState, 0);

        // HP Advantage: A = 40/100=40%, B = 190/200=95%. Advantage = (0.4 - 0.95)*100 = -55
        expect(metrics.hpAdvantage).toBeCloseTo(-55);

        // Energy Advantage (based on current implementation, only looks at my team)
        // 2 energy * 5 = 10
        expect(metrics.energyAdvantage).toBe(10);

        // Control Advantage: Enemy has 3 cooldown + 20 for stun. My cooldowns are 0.
        // Advantage = (3 - 0) * 2 + 20 = 26
        expect(metrics.controlAdvantage).toBe(26);

        // Threat Advantage: My threat = 50. Enemy threat = B1 is stunned, B2 can use skill = 20.
        // Differential = 50 - 20 = 30. Advantage = 30/2 = 15.
        expect(metrics.threatAdvantage).toBe(15);

        // Overall Score:
        // (-55 * 0.4) + (10 * 0.15) + (26 * 0.25) + (15 * 0.2)
        // -22 + 1.5 + 6.5 + 3 = -11
        expect(metrics.overallScore).toBeCloseTo(-11);
    });
});

describe('findBestMove', () => {
    it('should prioritize a killing blow over a higher-damage non-lethal attack', () => {
        const myTeam = [createMockCharacter('hero', 100, [createMockSkill(25), createMockSkill(45)])];
        const enemyTeam = [
            createMockCharacter('strong_enemy', 50), // Cannot be killed by the 45-dmg skill
            createMockCharacter('weak_enemy', 20),   // Can be killed by the 25-dmg skill
        ];
        const gameState = { teams: [myTeam, enemyTeam], energyPools: [{}] };

        const bestMove = findBestMove(gameState, 0);

        // Analysis of best possible moves:
        // 1. Highest damage non-lethal move: Use skill 1 (45 dmg) on strong_enemy (50 hp). Score = 45.
        // 2. Lethal move: Use skill 0 (25 dmg) on weak_enemy (20 hp). Score = 25 (dmg) + 75 (kill bonus) - 0.5 (overkill) = 99.5.
        // The AI should clearly prefer the lethal move.
        expect(bestMove.characterId).toBe('hero');
        expect(bestMove.skillId).toBe(0); // The 25-damage skill is the correct choice
        expect(bestMove.targetId).toBe('weak_enemy');
    });

    it('should choose the highest damage move if no kill is possible', () => {
        const myTeam = [createMockCharacter('hero', 100, [createMockSkill(30), createMockSkill(40)])];
        const enemyTeam = [createMockCharacter('enemy1', 100)];
        const gameState = { teams: [myTeam, enemyTeam], energyPools: [{}] };

        const bestMove = findBestMove(gameState, 0);

        // Both skills target the same enemy, neither can kill.
        // It should pick the one with higher damage.
        expect(bestMove.skillId).toBe(1); // The 40 damage skill
    });

    it('should prefer a skill with a side effect if damage is equal', () => {
        const myTeam = [createMockCharacter('hero', 100, [createMockSkill(30, false), createMockSkill(30, true)])];
        const enemyTeam = [createMockCharacter('enemy1', 100)];
        const gameState = { teams: [myTeam, enemyTeam], energyPools: [{}] };

        const bestMove = findBestMove(gameState, 0);
        // Score skill 0: 30
        // Score skill 1: 30 + 15 (side effect) = 45
        expect(bestMove.skillId).toBe(1);
    });

    it('should select the target that results in the highest score', () => {
        const myTeam = [createMockCharacter('hero', 100, [createMockSkill(30, true)])]; // Skill has side effect
        const enemyTeam = [
            createMockCharacter('enemy1', 30), // Can be killed
            createMockCharacter('enemy2', 40), // Cannot be killed
        ];
        const gameState = { teams: [myTeam, enemyTeam], energyPools: [{}] };

        const bestMove = findBestMove(gameState, 0);
        // Score vs enemy1: 30 (dmg) + 15 (side effect) + 75 (kill) = 120
        // Score vs enemy2: 30 (dmg) + 15 (side effect) = 45
        expect(bestMove.targetId).toBe('enemy1');
    });

    it('should return a PASS action if no moves are possible', () => {
        const myTeam = [createMockCharacter('hero', 100, [createMockSkill(50)], [1])]; // Skill is on cooldown
        const enemyTeam = [createMockCharacter('enemy1', 100)];
        const gameState = { teams: [myTeam, enemyTeam], energyPools: [{}] };

        const bestMove = findBestMove(gameState, 0);
        expect(bestMove.type).toBe('PASS');
    });

    it('should ignore dead enemies when selecting a target', () => {
        const myTeam = [createMockCharacter('hero', 100, [createMockSkill(30)])];
        const enemyTeam = [
            createMockCharacter('dead', 0),
            createMockCharacter('alive', 50),
        ];
        const gameState = { teams: [myTeam, enemyTeam], energyPools: [{}] };

        const bestMove = findBestMove(gameState, 0);
        expect(bestMove.targetId).toBe('alive');
    });

    it('should choose the move with less overkill if both are lethal', () => {
        const myTeam = [createMockCharacter('hero', 100, [createMockSkill(25), createMockSkill(50)])];
        const enemyTeam = [createMockCharacter('enemy1', 20)];
        const gameState = { teams: [myTeam, enemyTeam], energyPools: [{}] };

        const bestMove = findBestMove(gameState, 0);

        // With the new overkill penalty (1.5):
        // Score for skill 0 (25 dmg): 25 + 75 - (5 * 1.5) = 92.5
        // Score for skill 1 (50 dmg): 50 + 75 - (30 * 1.5) = 80
        // The AI should now prefer the more efficient, lower-damage kill.
        expect(bestMove.skillId).toBe(0); // Prefers 25 damage
    });
});
