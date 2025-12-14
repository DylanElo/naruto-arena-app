/**
 * NARUTO ARENA - RESOLUTION ENGINE
 * Implements the exact damage hierarchy from game rules
 */

import { DamageType, StatusEffect } from './models.js';

/**
 * Calculate outcome of a skill being used
 * Implements the strict hierarchy:
 * 1. Check Invulnerability
 * 2. Base Damage
 * 3. Apply Modifiers (Increase/Decrease)
 * 4. Apply Defense (3-Tier System)
 */
export function calculateOutcome(source, target, skill) {
    const result = {
        damageDealt: 0,
        defenseRemoved: 0,
        blocked: false,
        killed: false
    };

    // Skip if no damage
    if (skill.damage <= 0) {
        return result;
    }

    // STEP 1: Check Invulnerability
    if (target.statusEffects.invulnerable && !skill.ignoreInvulnerability) {
        result.blocked = true;
        return result;
    }

    // STEP 2: Base Calculation
    let finalDamage = skill.damage;

    // STEP 3: Apply Modifiers
    finalDamage = applyDamageModifiers(finalDamage, source, target);

    // STEP 4: Apply Defense (3-Tier System)
    const damageResult = applyDefense(finalDamage, target, skill.damageType);

    result.damageDealt = damageResult.hpDamage;
    result.defenseRemoved = damageResult.defenseDamage;

    // Apply damage to target
    target.takeDamage(damageResult.hpDamage);
    target.statusEffects.destructibleDefense = Math.max(0,
        target.statusEffects.destructibleDefense - damageResult.defenseDamage
    );

    if (!target.isAlive()) {
        result.killed = true;
    }

    return result;
}

/**
 * Apply damage increase/decrease modifiers
 */
function applyDamageModifiers(baseDamage, source, target) {
    let damage = baseDamage;

    // Apply flat increases from source
    damage += source.statusEffects.increaseDamage;

    // Apply flat decreases from target
    damage -= target.statusEffects.decreaseDamage;

    // Apply percentage increases
    damage *= (1 + source.statusEffects.increaseDamagePercent / 100);

    // Apply percentage decreases
    damage *= (1 - target.statusEffects.decreaseDamagePercent / 100);

    return Math.max(0, Math.floor(damage));
}

/**
 * THE 3-TIER DEFENSE SYSTEM (Critical for accuracy)
 * 
 * Affliction Damage: Ignores Damage Reduction AND Destructible Defense → Direct to HP
 * Piercing Damage: Ignores Damage Reduction → Applies to Defense first, then HP
 * Normal Damage: Subject to Damage Reduction → Applies to Defense first, then HP
 */
function applyDefense(damage, target, damageType) {
    const result = {
        hpDamage: 0,
        defenseDamage: 0
    };

    switch (damageType) {
        case DamageType.AFFLICTION:
            // AFFLICTION: Ignores ALL defenses, goes straight to HP
            result.hpDamage = damage;
            break;

        case DamageType.PIERCING:
            // PIERCING: Ignores Damage Reduction, but hits Defense first
            if (target.statusEffects.destructibleDefense > 0) {
                const defenseAbsorbed = Math.min(damage, target.statusEffects.destructibleDefense);
                result.defenseDamage = defenseAbsorbed;
                result.hpDamage = damage - defenseAbsorbed;
            } else {
                result.hpDamage = damage;
            }
            break;

        case DamageType.NORMAL:
        default: {
            // NORMAL: Subject to Damage Reduction, then Defense, then HP
            const reducedDamage = Math.max(0, damage - target.statusEffects.damageReduction);

            if (reducedDamage > 0 && target.statusEffects.destructibleDefense > 0) {
                const defenseAbsorbed = Math.min(reducedDamage, target.statusEffects.destructibleDefense);
                result.defenseDamage = defenseAbsorbed;
                result.hpDamage = reducedDamage - defenseAbsorbed;
            } else {
                result.hpDamage = reducedDamage;
            }
            break;
        }
    }

    return result;
}

/**
 * Health Steal Logic
 * Constraint: Cannot drain health from shields
 */
export function calculateHealthSteal(source, target, stealAmount) {
    // If target has destructible defense, steal fails (cannot drain from shield)
    if (target.statusEffects.destructibleDefense > 0) {
        return 0;
    }

    // Can only steal up to current HP
    const actualSteal = Math.min(target.hp, stealAmount);

    target.takeDamage(actualSteal);
    source.heal(actualSteal);

    return actualSteal;
}

/**
 * Status Effect Application
 */
export function applyStun(target) {
    target.statusEffects.stunned = true;
    // In a full implementation, duration would be tracked here.
}

export function applyInvulnerability(target) {
    target.statusEffects.invulnerable = true;
    // In a full implementation, duration would be tracked here.
}

export function applyDamageReduction(target, amount) {
    target.statusEffects.damageReduction += amount;
}

export function applyDestructibleDefense(target, amount) {
    target.statusEffects.destructibleDefense += amount;
}

/**
 * Process cooldowns at turn end
 */
export function processCooldowns(character) {
    character.cooldowns = character.cooldowns.map(cd => Math.max(0, cd - 1));
}

/**
 * Use a skill and trigger cooldown
 */
export function useSkill(character, skillIndex) {
    const skill = character.skills[skillIndex];
    if (skill.cooldown > 0) {
        character.cooldowns[skillIndex] = skill.cooldown;
    }
}
