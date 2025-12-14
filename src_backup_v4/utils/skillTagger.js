/**
 * SKILL TAGGER - Extract features from skill descriptions
 * Based on Naruto Arena game manual specifications
 */

/**
 * Damage Types (from manual)
 * - Normal: blocked by DR + DD
 * - Piercing: ignores DR, blocked by DD
 * - Affliction: ignores DR + DD
 * - Health Steal: goes through DR, blocked by DD, heals user
 */
export function detectDamageType(desc) {
    desc = desc.toLowerCase();

    if (/affliction damage/i.test(desc)) return 'affliction';
    if (/piercing damage/i.test(desc)) return 'piercing';
    if (/steal \d+ health|health is stolen/i.test(desc)) return 'healthSteal';
    if (/\d+ damage/i.test(desc)) return 'normal';

    return null;
}

/**
 * Extract damage value
 */
export function extractDamageValue(desc) {
    const match = desc.match(/(\d+)\s*(?:affliction|piercing)?\s*damage/i);
    return match ? parseInt(match[1]) : 0;
}

/**
 * Detect if skill has damage-over-time
 */
export function hasDot(desc) {
    return /for \d+ turns/i.test(desc) && /damage/i.test(desc);
}

/**
 * Detect if skill is burst (high single-target damage)
 */
export function isBurst(desc, damageValue) {
    return damageValue >= 40 && !hasDot(desc) && !/all enemies/i.test(desc);
}

/**
 * Detect targeting type
 */
export function detectTarget(desc) {
    const d = desc.toLowerCase();
    if (/all enemies|all characters/.test(d)) return 'allEnemies';
    if (/all allies/.test(d)) return 'allAllies';
    if (/one ally|target ally|an ally/.test(d)) return 'ally';
    if (/self|user/.test(d)) return 'self';
    return 'enemy';
}

/**
 * Detect if skill is AoE (Legacy wrapper)
 */
export function isAoE(desc) {
    return detectTarget(desc) === 'allEnemies' || detectTarget(desc) === 'allAllies';
}

/**
 * DEFENSIVE MECHANICS (from manual)
 */
export const DEFENSE_PATTERNS = {
    damageReduction: /damage reduction/i,
    unpierceableDR: /unpierceable damage reduction/i,
    destructibleDefense: /destructible defense/i,
    invulnerable: /invulnerable for \d+ turn/i,
    selfInvul: /this (skill|character) makes .* invulnerable/i,
    teamInvul: /(one ally|all allies).*invulnerable/i,
    heal: /heal[s]? .* for \d+ health|heal \d+ health|recover[s]? \d+ health/i,
    cleanse: /remove[s]? all harmful effects|remove[s]? harmful effects/i,
    lifelink: /lifelink/i,
    ignoreHarmful: /ignore[s]? (all )?harmful effects/i,
    ignoreHelpful: /ignore[s]? (all )?helpful effects/i
};

/**
 * CONTROL & DISRUPTION (from manual)
 */
export const CONTROL_PATTERNS = {
    hardStun: /stunned for \d+ turn|this character is stunned/i,
    classStun: /stunned.*(physical|energy|mental|strategic|affliction)/i,
    aoeStun: /all enemies.*stunned/i,
    energyRemoval: /remove[s]? \d+ .* energy|lose[s]? \d+ .* energy/i,
    energySteal: /(steal|drain)s? \d+ .* energy/i,
    counter: /counter|will be countered/i,
    reflect: /reflect/i,
    skillRemoval: /remove[s]? .* (skill|effect)/i,
    cdIncrease: /cooldown[s]? .* increased/i,
    cdDecrease: /cooldown[s]? .* decreased/i
};

/**
 * RESOURCE MECHANICS (from manual)
 */
export const RESOURCE_PATTERNS = {
    energyGain: /gain[s]? \d+ random energy|gain[s]? \d+ .* energy/i,
    usesRandom: (energy) => energy.includes('black'),
    usesColor: (energy, color) => energy.includes(color)
};

/**
 * SYNERGY HOOKS
 */
export const HOOK_PATTERNS = {
    needsStunnedTarget: /if.*target is stunned|if.*enemy is stunned/i,
    needsMarkedTarget: /if.*marked|if.*seal is active|affected by/i,
    createsStun: /stun[s]? .* for \d+ turn/i,
    createsMark: /mark|seal|tag/i,
    punishesSkillUse: /if.*uses a new skill/i,
    punishesActionOverTime: /each turn.*uses a skill/i
};

/**
 * Extract all tags from a skill
 */
export function extractSkillTags(skill) {
    const desc = skill.description || '';
    const classes = (skill.classes || '').toLowerCase();
    const energy = skill.energy || [];

    const tags = {
        // Damage
        damageType: detectDamageType(desc),
        damageValue: extractDamageValue(desc),
        hasDot: hasDot(desc),
        isBurst: false, // set below
        isAoE: isAoE(desc),

        // Defense
        defense: {},

        // Control
        control: {},

        // Resource
        resource: {
            energyGain: 0,
            usesRandom: energy.includes('black'),
            energyColors: energy.filter(e => e !== 'none' && e !== 'black')
        },

        // Hooks
        hooks: {},

        // Skill type
        mainClass: null,
        persistence: null,

        // Targeting
        target: detectTarget(desc)
    };

    // Set burst flag
    tags.isBurst = isBurst(desc, tags.damageValue);

    // Detect defense mechanics
    Object.entries(DEFENSE_PATTERNS).forEach(([key, pattern]) => {
        tags.defense[key] = pattern.test(desc);
    });

    // Detect control mechanics
    Object.entries(CONTROL_PATTERNS).forEach(([key, pattern]) => {
        tags.control[key] = pattern.test(desc);
    });

    // Detect energy gain
    if (RESOURCE_PATTERNS.energyGain.test(desc)) {
        const match = desc.match(/gain[s]? (\d+)/i);
        tags.resource.energyGain = match ? parseInt(match[1]) : 1;
    }

    // Detect synergy hooks
    Object.entries(HOOK_PATTERNS).forEach(([key, pattern]) => {
        tags.hooks[key] = pattern.test(desc);
    });

    // Skill class
    if (classes.includes('physical')) tags.mainClass = 'physical';
    else if (classes.includes('energy')) tags.mainClass = 'energy';
    else if (classes.includes('mental')) tags.mainClass = 'mental';
    else if (classes.includes('affliction')) tags.mainClass = 'affliction';
    else if (classes.includes('strategic')) tags.mainClass = 'strategic';
    else if (classes.includes('achievement')) tags.mainClass = 'achievement';

    // Persistence
    if (classes.includes('instant')) tags.persistence = 'instant';
    else if (classes.includes('action')) tags.persistence = 'action';
    else if (classes.includes('control')) tags.persistence = 'control';

    return tags;
}

/**
 * Aggregate skill tags to character profile
 */
export function buildCharacterProfile(character) {
    if (!character.skills || character.skills.length === 0) {
        return null;
    }

    const profile = {
        id: character.id,
        name: character.name,

        // Roles
        roles: { dps: 0, tank: 0, support: 0, control: 0 },

        // Mechanics counts
        mechanics: {
            affliction: 0,
            piercing: 0,
            normal: 0,
            healthSteal: 0,
            burst: 0,
            dot: 0,
            aoe: 0,

            damageReduction: 0,
            destructibleDefense: 0,
            invulnerable: 0,
            heal: 0,
            cleanse: 0,

            stun: 0,
            energyRemoval: 0,
            counter: 0,
            reflect: 0,

            energyGain: 0
        },

        // Aggregated hooks
        hooks: {
            needsStunnedTarget: false,
            createsStun: false,
            needsMarkedTarget: false,
            createsMark: false,
            punishesSkillUse: false
        },

        // Energy profile
        energy: {
            avgCost: 0,
            colors: { green: 0, red: 0, blue: 0, white: 0, black: 0 },
            usesRandom: false
        },

        // Special flags
        isGlassCannon: false,
        isEnergyHungry: false,

        // Targeting Analysis
        targeting: {
            self: 0,
            ally: 0,
            allAllies: 0,
            enemy: 0,
            allEnemies: 0
        }
    };

    // Analyze each skill
    character.skills.forEach(skill => {
        const tags = extractSkillTags(skill);

        // ONLY count damage types if targeting enemies (not self-damage!)
        const isOffensive = tags.target === 'enemy' || tags.target === 'allEnemies';

        if (isOffensive) {
            if (tags.damageType === 'affliction') profile.mechanics.affliction++;
            if (tags.damageType === 'piercing') profile.mechanics.piercing++;
            if (tags.damageType === 'normal') profile.mechanics.normal++;
            if (tags.damageType === 'healthSteal') profile.mechanics.healthSteal++;
            if (tags.isBurst) profile.mechanics.burst++;
            if (tags.hasDot) profile.mechanics.dot++;
            if (tags.isAoE) profile.mechanics.aoe++;
        }

        // Count defense
        if (tags.defense.damageReduction) profile.mechanics.damageReduction++;
        if (tags.defense.destructibleDefense) profile.mechanics.destructibleDefense++;
        if (tags.defense.invulnerable) profile.mechanics.invulnerable++;
        if (tags.defense.heal) profile.mechanics.heal++;
        if (tags.defense.cleanse) profile.mechanics.cleanse++;

        // Count control
        if (tags.control.hardStun || tags.control.classStun) profile.mechanics.stun++;
        if (tags.control.energyRemoval) profile.mechanics.energyRemoval++;
        if (tags.control.counter) profile.mechanics.counter++;
        if (tags.control.reflect) profile.mechanics.reflect++;

        // Energy gain
        if (tags.resource.energyGain > 0) profile.mechanics.energyGain += tags.resource.energyGain;

        // Aggregate hooks
        Object.keys(tags.hooks).forEach(hook => {
            if (tags.hooks[hook]) profile.hooks[hook] = true;
        });

        // Energy tracking
        if (tags.resource.usesRandom) profile.energy.usesRandom = true;
        tags.resource.energyColors.forEach(color => {
            profile.energy.colors[color]++;
        });

        // Targeting tracking
        if (tags.target) {
            profile.targeting[tags.target]++;
        }
    });

    // Calculate roles
    character.skills.forEach(skill => {
        const tags = extractSkillTags(skill);

        if (tags.control.hardStun || tags.control.energyRemoval || tags.control.counter || tags.control.reflect) {
            profile.roles.control++;
        }

        if (tags.damageType || tags.isBurst) {
            profile.roles.dps++;
        }

        if (tags.defense.damageReduction || tags.defense.destructibleDefense || tags.defense.invulnerable) {
            profile.roles.tank++;
        }

        if (tags.defense.heal || tags.defense.cleanse || tags.resource.energyGain > 0) {
            profile.roles.support++;
        }
    });

    // Calculate energy stats
    const totalEnergyCost = Object.values(profile.energy.colors).reduce((a, b) => a + b, 0);
    const skillCount = character.skills.length;
    profile.energy.avgCost = skillCount > 0 ? totalEnergyCost / skillCount : 0;

    // Special flags
    profile.isGlassCannon = (profile.roles.dps >= 3 && profile.roles.tank === 0);
    profile.isEnergyHungry = profile.energy.avgCost >= 2;

    return profile;
}
