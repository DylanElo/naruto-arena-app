/**
 * NARUTO ARENA - GAME SIMULATION ENGINE
 * Data Models for Turn-Based State Machine
 */

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
            const randomColor = energyColors[Math.floor(Math.random() * energyColors.length)];
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
    canUseSkill(skillIndex) {
        if (!this.isAlive()) return false;
        if (this.statusEffects.stunned) return false;
        if (this.cooldowns[skillIndex] > 0) return false;
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

        // Parse damage from description
        this.damage = this.parseDamage(this.description);
        this.damageType = this.parseDamageType(this.description, this.classes);

        // Parse targeting
        this.targeting = this.parseTargeting(this.description);

        // Special flags
        this.ignoreInvulnerability = /ignore.*invulnerability|ignores invulnerability/i.test(this.description);
        this.cannotBeCountered = /cannot be countered/i.test(this.description);
        this.cannotBeReflected = /cannot be reflected/i.test(this.description);
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

    parseDamage(desc) {
        const damages = [];
        const damageRegex = /(\d+)\s*(?:piercing|affliction)?\s*damage/gi;
        let match;

        while ((match = damageRegex.exec(desc)) !== null) {
            damages.push(parseInt(match[1]));
        }

        return damages.length > 0 ? damages[0] : 0;
    }

    parseDamageType(desc, classes) {
        const lower = desc.toLowerCase();

        // Check for affliction damage
        if (lower.includes('affliction damage') || classes.includes('Affliction')) {
            return DamageType.AFFLICTION;
        }

        // Check for piercing damage
        if (lower.includes('piercing damage')) {
            return DamageType.PIERCING;
        }

        // Default to normal damage
        return DamageType.NORMAL;
    }

    parseTargeting(desc) {
        const lower = desc.toLowerCase();

        if (lower.includes('all enemies')) return 'aoe';
        if (lower.includes('one enemy')) return 'single';
        if (lower.includes('ally') || lower.includes('allies')) return 'ally';

        return 'self';
    }
}
