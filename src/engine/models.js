/**
 * NARUTO ARENA - GAME SIMULATION ENGINE
 * Data Models for Turn-Based State Machine
 * 
 * Updated to support structured skill effects from skill_effects.json
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
    DECREASE_DAMAGE: 'decreaseDamage',
    HEAL: 'heal',
    DRAIN: 'drain',
    LEECH: 'leech',
    REFLECT: 'reflect',
    COUNTER: 'counter'
};

/**
 * Structured skill effects cache
 * Loaded from skill_effects.json for accurate data
 */
let skillEffectsCache = null;

/**
 * Load structured skill effects data
 * Call this at app initialization with the contents of skill_effects.json
 */
export function loadSkillEffects(data) {
    skillEffectsCache = data?.skills || {};
    console.log(`[Models] Loaded ${Object.keys(skillEffectsCache).length} skill effects`);
}

/**
 * Check if structured skill effects are loaded
 */
export function hasSkillEffects() {
    return skillEffectsCache !== null && Object.keys(skillEffectsCache).length > 0;
}

/**
 * Get structured skill effect by character ID and skill index
 */
export function getSkillEffect(characterId, skillIndex) {
    if (!skillEffectsCache) return null;
    const key = `${characterId}_${skillIndex}`;
    return skillEffectsCache[key] || null;
}

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

        // Parse skills from character data, passing character ID for structured data lookup
        this.skills = (data.skills || []).map((skillData, index) =>
            new Skill(skillData, data.id, index)
        );
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
 * 
 * Uses structured data from skill_effects.json when available,
 * falls back to string parsing for backwards compatibility.
 */
export class Skill {
    /**
     * Create a skill from character data
     * @param {Object} data - Raw skill data from characters.json
     * @param {number} [characterId=null] - Character ID for structured data lookup
     * @param {number} [skillIndex=null] - Skill index for structured data lookup
     */
    constructor(data, characterId = null, skillIndex = null) {
        this.name = data.name;
        this.description = data.description || '';
        this.cooldown = this.parseCooldown(data.cooldown);
        this.energyCost = this.parseEnergy(data.energy);
        this.classes = this.parseClasses(data.classes);

        // Try to load structured effects data
        const structured = getSkillEffect(characterId, skillIndex);

        if (structured) {
            // Use structured data (preferred)
            this.damage = structured.damage?.base || 0;
            this.damageType = this.mapDamageType(structured.damage?.type);
            this.targeting = structured.targeting?.type || 'enemy';

            // Structured effect data
            this.effects = structured.effects || {};
            this.duration = structured.duration || { type: 'instant', turns: 0 };
            this.conditionalDamage = structured.damage?.conditional || null;

            // Flags from structured data
            this.flags = structured.flags || {};
            this.ignoreInvulnerability = structured.flags?.ignoresInvulnerability || false;
            this.cannotBeCountered = structured.flags?.cannotBeCountered || false;
            this.cannotBeReflected = structured.flags?.cannotBeReflected || false;

            // Mark as using structured data
            this._usingStructuredData = true;
        } else {
            // Fallback to string parsing (legacy behavior)
            this.damage = this.parseDamage(this.description);
            this.damageType = this.parseDamageType(this.description, this.classes);
            this.targeting = this.parseTargeting(this.description);

            // Empty structured data
            this.effects = {};
            this.duration = { type: 'instant', turns: 0 };
            this.conditionalDamage = null;

            // Parse flags from description
            this.flags = {};
            this.ignoreInvulnerability = /ignore.*invulnerability|ignores invulnerability/i.test(this.description);
            this.cannotBeCountered = /cannot be countered/i.test(this.description);
            this.cannotBeReflected = /cannot be reflected/i.test(this.description);

            // Mark as using legacy parsing
            this._usingStructuredData = false;
        }

        // Additions based on Haskell code analysis
        this.isCounter = /counter|reflect/i.test(this.description);
        this.isProtection = /invulnerable|damage reduction|destructible defense/i.test(this.description);
        this.hasSideEffect = /stun|heal|drain|leech/i.test(this.description);
    }

    /**
     * Map damage type string to DamageType enum
     */
    mapDamageType(typeStr) {
        switch (typeStr) {
            case 'affliction': return DamageType.AFFLICTION;
            case 'piercing': return DamageType.PIERCING;
            case 'normal':
            default: return DamageType.NORMAL;
        }
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

    // Legacy parsing methods (used when structured data not available)

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

        if (lower.includes('all enemies')) return 'allEnemies';
        if (lower.includes('one enemy')) return 'enemy';
        if (lower.includes('all allies')) return 'allAllies';
        if (lower.includes('ally') || lower.includes('allies')) return 'ally';

        return 'self';
    }
}
