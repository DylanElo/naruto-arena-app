/**
 * NARUTO ARENA - GAME SIMULATION ENGINE
 * Data Models for Turn-Based State Machine
 */

import { getSecureRandomElement } from '../utils/random';

// Energy Types (mapped to game terminology)
export const EnergyType = {
    TAIJUTSU: 'green',     // Physical
    BLOODLINE: 'red',      // Energy  
    NINJUTSU: 'blue',      // Ninjutsu
    GENJUTSU: 'white',     // Mental
    RANDOM: 'black'        // Any/Random
};

// Skill Classes
export const SkillClass = {
    PHYSICAL: 'Physical',
    ENERGY: 'Energy',
    MENTAL: 'Mental',
    AFFLICTION: 'Affliction',
    STRATEGIC: 'Strategic'
};

// Skill Types
export const SkillType = {
    INSTANT: 'Instant',
    ACTION: 'Action',
    CONTROL: 'Control'
};

// Damage Types (Critical for Resolution Engine)
export const DamageType = {
    NORMAL: 'normal',       // Subject to Damage Reduction + Destructible Defense
    PIERCING: 'piercing',   // Ignores Damage Reduction, applies to Defense then HP
    AFFLICTION: 'affliction' // Ignores ALL defenses, direct to HP
};

// Status Effects
export const StatusEffect = {
    STUNNED: 'stunned',
    INVULNERABLE: 'invulnerable',
    DAMAGE_REDUCTION: 'damageReduction',
    DESTRUCTIBLE_DEFENSE: 'destructibleDefense',
    INCREASE_DAMAGE: 'increaseDamage',
    DECREASE_DAMAGE: 'decreaseDamage'
};

/**
 * Global Game State
 */
export class GameState {
    constructor() {
        this.turnCounter = 0;
        this.activePlayer = 0; // 0 = Team A, 1 = Team B

        // Energy Pool for each team
        this.energyPools = [
            this.createEnergyPool(),
            this.createEnergyPool()
        ];

        this.teams = [
            [], // Team A (3 characters)
            []  // Team B (3 characters)
        ];
    }

    createEnergyPool() {
        return {
            [EnergyType.TAIJUTSU]: 0,
            [EnergyType.BLOODLINE]: 0,
            [EnergyType.NINJUTSU]: 0,
            [EnergyType.GENJUTSU]: 0,
            [EnergyType.RANDOM]: 0
        };
    }

    /**
     * Generate random energy based on alive characters
     * Each alive character contributes 1 random energy (25% each color)
     */
    generateEnergy(teamIndex) {
        const team = this.teams[teamIndex];
        const pool = this.energyPools[teamIndex];

        // Count alive characters
        const aliveCount = team.filter(char => char.isAlive()).length;

        // Each alive character contributes 1 random energy
        const energyColors = [
            EnergyType.TAIJUTSU,   // green
            EnergyType.BLOODLINE,  // red
            EnergyType.NINJUTSU,   // blue
            EnergyType.GENJUTSU    // white
        ];

        for (let i = 0; i < aliveCount; i++) {
            const randomColor = getSecureRandomElement(energyColors);
            pool[randomColor]++;
        }
    }
}

/**
 * Character State
 */
export class Character {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.hp = 100;
        this.maxHP = 100;

        this.activeStatuses = new Set();

        // Status Effects (active modifiers)
        this.statusEffects = {
            stunned: false,
            invulnerable: false,
            damageReduction: 0,
            destructibleDefense: 0,
            increaseDamage: 0,      // Flat increase
            decreaseDamage: 0,      // Flat decrease
            increaseDamagePercent: 0,
            decreaseDamagePercent: 0
        };

        // Cooldowns (one per skill)
        this.cooldowns = [0, 0, 0, 0];

        // Parse skills from character data
        this.skills = (data.skills || []).map(skillData => new Skill(skillData));
    }

    isAlive() {
        return this.hp > 0;
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
    }

    heal(amount) {
        this.hp = Math.min(this.maxHP, this.hp + amount);
    }

    /**
     * Check if character can use a skill
     */
    /**
     * Check if character can use a skill
     * @param {number} skillIndex
     * @param {Object} [energyPool=null] - Optional team energy pool to check costs
     */
    canUseSkill(skillIndex, energyPool = null) {
        if (!this.isAlive()) return false;
        if (this.statusEffects.stunned) return false;
        if (this.cooldowns[skillIndex] > 0) return false;

        // Energy Check
        if (energyPool) {
            const skill = this.skills[skillIndex];
            if (!skill) return false;

            // Simplified pool check (doesn't handle 'random' cost well yet, but sufficient for strict colors)
            // Clone pool to simulate cost deduction without modifying it
            const tempPool = { ...energyPool };

            for (const requiredEnergy of skill.energyCost) {
                const type = requiredEnergy.toLowerCase();

                if (type === 'random' || type === 'any') {
                    // Logic for random energy is complex (can use any), skipping strict check for now
                    // or assume we always have "random" energy available if pool > 0, 
                    // but for now let's just checking strict colors.
                    continue;
                }

                if (!tempPool[type] || tempPool[type] <= 0) {
                    return false;
                }
                tempPool[type]--;
            }
        }

        return true;
    }
}

/**
 * Skill Definition
 */
export class Skill {
    constructor(data) {
        this.name = data.name;
        this.description = data.description || '';
        this.cooldown = this.parseCooldown(data.cooldown);
        this.energyCost = this.parseEnergy(data.energy);
        this.classes = this.parseClasses(data.classes);

        // Store structured effects or parse them from text
        this.effects = (data.effects && data.effects.length > 0)
            ? data.effects
            : this.parseEffectsFromDescription(this.description);
    }

    parseCooldown(cd) {
        if (cd === 'None' || cd === 'none') return 0;
        return parseInt(cd) || 0;
    }

    parseEnergy(energyArray) {
        if (!Array.isArray(energyArray)) return [];
        return energyArray.filter(e => e !== 'none');
    }

    parseClasses(classesStr) {
        if (!classesStr) return [];
        return classesStr.split(',').map(c => c.trim());
    }

    parseEffectsFromDescription(description) {
        const effects = [];
        const desc = description.toLowerCase();

        // Damage
        const damageMatches = desc.match(/deals (\d+) damage/g) || [];
        for (const match of damageMatches) {
            const amount = parseInt(match.match(/(\d+)/)[0], 10);
            const isPiercing = desc.includes('piercing');
            const isAffliction = desc.includes('affliction');
            effects.push({
                type: 'damage',
                amount: amount,
                damageType: isPiercing ? DamageType.PIERCING : (isAffliction ? DamageType.AFFLICTION : DamageType.NORMAL)
            });
        }

        // Stun
        if (desc.includes('stun')) {
            effects.push({ type: 'stun', duration: 1 });
        }

        // Damage Reduction
        const drMatch = desc.match(/(\d+) damage reduction/);
        if (drMatch) {
            effects.push({ type: 'damage_reduction', amount: parseInt(drMatch[1], 10) });
        }

        // Invulnerability
        if (desc.includes('invulnerable') || desc.includes('invulnerability')) {
            effects.push({ type: 'invulnerability', duration: 1 });
        }

        return effects;
    }
}
