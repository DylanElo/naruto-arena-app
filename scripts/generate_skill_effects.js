/**
 * SKILL EFFECTS GENERATOR v2.0
 * 
 * Generates structured skill_effects.json from characters.json
 * Enhanced with comprehensive effect taxonomy from naruto-unison reference.
 * 
 * Run with: node scripts/generate_skill_effects.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Effect Detection (Enhanced from naruto-unison Effect.hs) ---

/**
 * Damage type detection
 */
function detectDamageType(desc) {
    const d = desc.toLowerCase();
    if (/affliction damage/i.test(d)) return 'affliction';
    if (/piercing damage/i.test(d)) return 'piercing';
    if (/steal(?:s|ing)?\s+\d+\s+health|health\s+is\s+stolen/i.test(d)) return 'healthSteal';
    if (/\d+\s+damage/i.test(d)) return 'normal';
    return null;
}

function extractDamageValue(desc) {
    // Get primary damage value
    const match = desc.match(/(\d+)\s*(?:affliction|piercing)?\s*damage/i);
    return match ? parseInt(match[1]) : 0;
}

function extractConditionalDamage(desc) {
    // Look for "X additional damage" patterns
    const additionalMatch = desc.match(/(\d+)\s+additional\s+damage/i);
    if (additionalMatch) {
        const bonus = parseInt(additionalMatch[1]);
        let condition = 'unknown';

        // Extract condition type
        if (/during\s+\[([^\]]+)\]/i.test(desc)) {
            const m = desc.match(/during\s+\[([^\]]+)\]/i);
            condition = `during_${m[1].trim().toLowerCase().replace(/\s+/g, '_')}`;
        } else if (/affected\s+by\s+\[([^\]]+)\]/i.test(desc)) {
            const m = desc.match(/affected\s+by\s+\[([^\]]+)\]/i);
            condition = `target_has_${m[1].trim().toLowerCase().replace(/\s+/g, '_')}`;
        } else if (/if.*stunned/i.test(desc)) {
            condition = 'target_stunned';
        }

        return { condition, bonus };
    }
    return null;
}

/**
 * Targeting detection (enhanced)
 */
function detectTarget(desc) {
    const d = desc.toLowerCase();

    // Self-targeting
    if (/gains?\s+\d+\s+points?\s+of/i.test(d) && !/enemy|enemies/i.test(d.split(/gains?\s+\d+/)[0])) {
        return 'self';
    }
    if (/makes?\s+\w+\s+invulnerable/i.test(d) && !/enemy|enemies/i.test(d)) {
        return 'self';
    }

    // AoE
    if (/all\s+enemies?/i.test(d)) return 'allEnemies';
    if (/all\s+allies|(?:his|her|their)\s+team/i.test(d)) return 'allAllies';

    // Single target
    if (/random\s+enemy/i.test(d)) return 'randomEnemy';
    if (/one\s+ally|an?\s+ally|herself?\s+or\s+an\s+ally|himself?\s+or\s+an\s+ally/i.test(d)) return 'ally';
    if (/one\s+enemy|an?\s+enemy/i.test(d)) return 'enemy';

    return 'enemy'; // default
}

/**
 * Duration and DoT detection
 */
function hasDot(desc) {
    // DoT = damage + duration
    return /for\s+\d+\s+turns?/i.test(desc) && /damage/i.test(desc);
}

function isBurst(damageValue, desc) {
    return damageValue >= 40 && !hasDot(desc) && !/all\s+enemies/i.test(desc);
}

function isAoE(desc) {
    return /all\s+enemies|all\s+allies/i.test(desc);
}

function extractDuration(desc, classes) {
    const classesLower = (classes || '').toLowerCase();

    let type = 'instant';
    if (classesLower.includes('action')) type = 'action';
    else if (classesLower.includes('control')) type = 'control';

    let turns = 0;
    const turnMatch = desc.match(/for\s+(\d+)\s+turns?/i);
    if (turnMatch) turns = parseInt(turnMatch[1]);

    // Permanent detection
    if (/permanent/i.test(desc)) turns = -1; // -1 = permanent

    return { type, turns };
}

/**
 * COMPREHENSIVE STATUS EFFECT EXTRACTION
 * Enhanced with full taxonomy from naruto-unison Effect.hs
 */
function extractStatusEffects(desc) {
    const effects = {
        appliesTo: 'target',

        // === HELPFUL EFFECTS ===
        absorb: null,           // Gain chakra when targeted
        antiChannel: null,      // Ignore ongoing channel damage
        antiCounter: null,      // Cannot be countered/reflected
        bless: null,            // Adds to healing
        boost: null,            // Multiplies ally effects
        build: null,            // Adds to destructible defense
        bypass: null,           // Skills ignore invuln
        damageToDefense: null,  // Convert damage to defense
        endure: null,           // Health can't drop below 1
        enrage: null,           // Ignore harmful effects
        focus: null,            // Immune to stuns/disable
        heal: null,             // Restore health
        invulnerable: null,     // Immune to skill classes
        limit: null,            // Cap max damage received
        nullify: null,          // Ignore enemy skills
        pierce: null,           // All damage piercing
        redirect: null,         // Redirect skills
        reduce: null,           // Reduce damage received
        reflect: null,          // Reflect first skill
        reflectAll: null,       // Reflect all of a class
        strengthen: null,       // Deal more damage
        threshold: null,        // Nullify low damage

        // === HARMFUL EFFECTS ===
        afflict: null,          // Take affliction each turn
        alone: null,            // Can't be targeted by allies
        bleed: null,            // Take extra damage
        blockAllies: null,      // Can't affect allies
        blockEnemies: null,     // Can't affect enemies
        disable: null,          // Prevent applying effects
        exhaust: null,          // Skills cost +1 random
        expose: null,           // Can't reduce/invuln
        noIgnore: null,         // Can't ignore harm
        plague: null,           // Can't be healed/cured
        restrict: null,         // AoE must be single-target
        reveal: null,           // Invisible visible to enemy
        seal: null,             // Ignore helpful effects
        share: null,            // Damage shared to ally
        silence: null,          // No non-damage effects
        snare: null,            // Increase cooldowns
        stun: null,             // Disable skill class
        swap: null,             // Target opposite team
        taunt: null,            // Can only affect one target
        throttle: null,         // Effects last fewer turns
        uncounter: null,        // Can't counter/reflect
        undefend: null,         // No destructible defense
        unreduce: null,         // Reduce DR effectiveness
        weaken: null,           // Deal less damage

        // === LEGACY (backwards compat) ===
        damageReduction: null,
        destructibleDefense: null,
        damageIncrease: null,
        damageDecrease: null,
        energyRemoval: null,
        energyGain: null,
        mark: null
    };

    // Determine who effects apply to
    if (/makes?\s+\w+\s+invulnerable|gains?\s+\d+\s+points/i.test(desc) && !/enemy|enemies/i.test(desc)) {
        effects.appliesTo = 'self';
    } else if (/all\s+enemies/i.test(desc)) {
        effects.appliesTo = 'allEnemies';
    } else if (/all\s+allies|(?:her|his|their)\s+team/i.test(desc)) {
        effects.appliesTo = 'allAllies';
    }

    // --- STUN (with type detection) ---
    const stunMatch = desc.match(/stun.*for\s+(\d+)\s+turns?/i) || desc.match(/stunned\s+for\s+(\d+)\s+turns?/i);
    if (stunMatch) {
        effects.stun = { duration: parseInt(stunMatch[1]), type: detectStunType(desc) };
    } else if (/stuns?\s+(?:their|one\s+enemy|all\s+enemies|an\s+enemy)/i.test(desc)) {
        effects.stun = { duration: 1, type: detectStunType(desc) };
    }

    // --- INVULNERABLE ---
    const invulnMatch = desc.match(/invulnerable\s+for\s+(\d+)\s+turns?/i);
    if (invulnMatch) {
        effects.invulnerable = { duration: parseInt(invulnMatch[1]), class: detectInvulnClass(desc) };
    } else if (/becomes?\s+invulnerable/i.test(desc)) {
        effects.invulnerable = { duration: 1, class: 'all' };
    }

    // --- DAMAGE REDUCTION ---
    const drMatch = desc.match(/(\d+)\s+points?\s+of\s+damage\s+reduction/i);
    if (drMatch) {
        effects.damageReduction = { amount: parseInt(drMatch[1]) };
        effects.reduce = { amount: parseInt(drMatch[1]), type: 'flat' };
        const drDuration = desc.match(/damage\s+reduction\s+for\s+(\d+)\s+turns?/i);
        if (drDuration) {
            effects.damageReduction.duration = parseInt(drDuration[1]);
            effects.reduce.duration = parseInt(drDuration[1]);
        }
    }

    // --- DESTRUCTIBLE DEFENSE ---
    const ddMatch = desc.match(/(\d+)\s+(?:points?\s+of\s+)?(?:permanent\s+)?destructible\s+defense/i);
    if (ddMatch) {
        effects.destructibleDefense = {
            amount: parseInt(ddMatch[1]),
            permanent: /permanent/i.test(desc)
        };
    }

    // --- EXPOSE (cannot reduce/invuln) ---
    if (/(?:unable\s+to|cannot|can't)\s+reduce\s+damage\s+or\s+become\s+invulnerable/i.test(desc) ||
        /prevent(?:s|ing)?\s+them\s+from\s+reducing\s+damage\s+or\s+becoming\s+invulnerable/i.test(desc)) {
        effects.expose = { duration: extractEffectDuration(desc) };
        effects.mark = { type: 'vulnerable' };
    }

    // --- ENRAGE (ignore harmful) ---
    if (/ignores?\s+(?:all\s+)?harmful\s+(?:status\s+)?effects?/i.test(desc) ||
        /ignore[s]?\s+(?:all\s+)?enemy\s+stun\s+effects?/i.test(desc)) {
        effects.enrage = { duration: extractEffectDuration(desc) };
    }

    // --- FOCUS (immune to stun/disable) ---
    if (/immune\s+to\s+stun/i.test(desc) || /ignores?\s+stuns?\s+and\s+disabling/i.test(desc)) {
        effects.focus = { duration: extractEffectDuration(desc) };
    }

    // --- HEAL ---
    // Multiple patterns to catch various heal descriptions:
    // "heals X health", "heal them for X health", "healing X health", "restore X health", etc.
    const healMatch = desc.match(/(?:heal(?:s|ing)?|restore(?:s|ing)?|recover(?:s|ing)?)\s+(\d+)\s+health/i) ||
        desc.match(/(?:heal(?:s|ing)?|restore(?:s|ing)?|recover(?:s|ing)?)\s+(?:\w+\s+)?(?:for\s+)?(\d+)\s+health/i) ||
        desc.match(/(\d+)\s+health\s+(?:to|is\s+restored|is\s+healed)/i) ||
        desc.match(/heal(?:s|ing)?\s+(?:them|him|her|one\s+ally|an\s+ally|himself|herself|itself)\s+(?:for\s+)?(\d+)\s+health/i) ||
        desc.match(/heal(?:s|ing)?\s+(?:them|him|her|one\s+ally|an\s+ally|himself|herself|itself|all\s+allies)\s+(?:for\s+)?(\d+)/i);
    if (healMatch) {
        effects.heal = { amount: parseInt(healMatch[1]) };
    }

    // --- AFFLICT (damage over time) ---
    const afflictMatch = desc.match(/(\d+)\s+affliction\s+damage/i);
    if (afflictMatch && /for\s+\d+\s+turns?/i.test(desc)) {
        effects.afflict = {
            amount: parseInt(afflictMatch[1]),
            duration: extractEffectDuration(desc)
        };
    }

    // --- STRENGTHEN (deal more damage) ---
    const strengthenMatch = desc.match(/deal(?:s|ing)?\s+(\d+)\s+(?:additional|more|extra)\s+damage/i);
    if (strengthenMatch) {
        effects.strengthen = { amount: parseInt(strengthenMatch[1]) };
        effects.damageIncrease = { amount: parseInt(strengthenMatch[1]) };
    }

    // --- WEAKEN (deal less damage) ---
    const weakenMatch = desc.match(/deal(?:s|ing)?\s+(\d+)\s+less\s+damage/i) ||
        desc.match(/damage\s+(?:is\s+)?(?:lowered|reduced|weakened)\s+by\s+(\d+)/i) ||
        desc.match(/weaken(?:s|ing)?\s+(?:their\s+)?damage\s+by\s+(\d+)/i);
    if (weakenMatch) {
        effects.weaken = { amount: parseInt(weakenMatch[1]) };
        effects.damageDecrease = { amount: parseInt(weakenMatch[1]) };
    }

    // --- ENERGY REMOVAL ---
    const energyRemMatch = desc.match(/(?:remove|drain|deplete|steal)s?\s+(\d+)\s+(?:random\s+)?(?:chakra|energy)/i) ||
        desc.match(/(?:lose|loses)\s+(\d+)\s+(?:random\s+)?(?:chakra|energy)/i);
    if (energyRemMatch) {
        effects.energyRemoval = { amount: parseInt(energyRemMatch[1]) };
    }

    // --- ENERGY GAIN ---
    const energyGainMatch = desc.match(/gain(?:s|ing)?\s+(\d+)\s+(?:random\s+)?(?:chakra|energy)/i);
    if (energyGainMatch) {
        effects.energyGain = { amount: parseInt(energyGainMatch[1]) };
    }

    // --- ABSORB (gain chakra when targeted) ---
    if (/absorb(?:s|ing)?\s+(?:all\s+)?chakra/i.test(desc) ||
        /gain(?:s|ing)?\s+chakra\s+(?:equal|when)/i.test(desc)) {
        effects.absorb = true;
    }

    // --- SNARE (increase cooldowns) ---
    const snareMatch = desc.match(/(?:increase|extend)s?\s+(?:their\s+)?cooldowns?\s+by\s+(\d+)/i);
    if (snareMatch) {
        effects.snare = { amount: parseInt(snareMatch[1]) };
    }

    // --- PLAGUE (can't be healed) ---
    if (/cannot\s+be\s+healed|unable\s+to\s+(?:be\s+)?heal/i.test(desc)) {
        effects.plague = true;
    }

    // --- SILENCE (no non-damage effects) ---
    if (/(?:disables?|prevents?)\s+non-damage\s+effects?/i.test(desc)) {
        effects.silence = { duration: extractEffectDuration(desc) };
    }

    // --- REFLECT ---
    if (/reflects?\s+the\s+first\s+(?:harmful\s+)?skill/i.test(desc)) {
        effects.reflect = true;
    }
    if (/reflects?\s+(?:all\s+)?(?:physical|chakra|mental)/i.test(desc)) {
        effects.reflectAll = { class: detectSkillClass(desc) };
    }

    // --- ENDURE ---
    if (/health\s+cannot\s+(?:drop|go)\s+below\s+1/i.test(desc) ||
        /cannot\s+die|prevents?\s+death/i.test(desc)) {
        effects.endure = true;
    }

    // --- BYPASS ---
    if (/(?:bypass|ignore)s?\s+invulnerability/i.test(desc)) {
        effects.bypass = true;
    }

    // --- COUNTER ---
    if (/counter(?:s|ing)?.*first/i.test(desc) || /if\s+.*uses?\s+a\s+skill\s+on/i.test(desc)) {
        effects.counter = true;
    }

    // --- CLEANSE (remove harmful effects) ---
    if (/remov(?:es?|ing)\s+(?:all\s+)?harmful/i.test(desc) ||
        /cur(?:es?|ing)\s+(?:all\s+)?(?:status\s+)?effects?/i.test(desc)) {
        effects.cleanse = true;
    }

    return effects;
}

/**
 * Helper: Detect stun type from description
 */
function detectStunType(desc) {
    const d = desc.toLowerCase();
    if (/stun(?:s|ning)?\s+(?:all\s+)?(?:their\s+)?skills?/i.test(d) && !/physical|mental|chakra|non-/i.test(d)) {
        return 'all';
    }
    if (/physical\s+(?:and\s+mental\s+)?skills?/i.test(d)) return 'physical';
    if (/mental\s+(?:and\s+physical\s+)?skills?/i.test(d)) return 'mental';
    if (/chakra\s+skills?/i.test(d)) return 'chakra';
    if (/non-mental/i.test(d)) return 'nonMental';
    if (/non-physical/i.test(d)) return 'nonPhysical';
    return 'all';
}

/**
 * Helper: Detect invulnerability class
 */
function detectInvulnClass(desc) {
    const d = desc.toLowerCase();
    if (/physical\s+skills?/i.test(d)) return 'physical';
    if (/mental\s+skills?/i.test(d)) return 'mental';
    if (/chakra\s+skills?/i.test(d)) return 'chakra';
    return 'all';
}

/**
 * Helper: Extract effect duration from description
 */
function extractEffectDuration(desc) {
    const match = desc.match(/for\s+(\d+)\s+turns?/i);
    return match ? parseInt(match[1]) : 1;
}

/**
 * Helper: Detect skill class from description
 */
function detectSkillClass(desc) {
    const d = desc.toLowerCase();
    if (/physical/i.test(d)) return 'physical';
    if (/mental/i.test(d)) return 'mental';
    if (/chakra/i.test(d)) return 'chakra';
    return 'all';
}

/**
 * FLAGS EXTRACTION (enhanced)
 */
function extractFlags(desc, classes) {
    const classesLower = (classes || '').toLowerCase();
    const damageValue = extractDamageValue(desc);

    return {
        // Combat modifiers
        ignoresInvulnerability: /(?:ignore|bypass)s?\s+invulnerability/i.test(desc),
        cannotBeCountered: /cannot\s+be\s+countered/i.test(desc),
        cannotBeReflected: /cannot\s+be\s+reflected/i.test(desc),
        piercesDamageReduction: /piercing/i.test(desc),

        // Class flags
        isBypassing: classesLower.includes('bypassing'),
        isSoulbound: classesLower.includes('soulbound'),
        isInvisible: classesLower.includes('invisible'),
        isUnremovable: classesLower.includes('unremovable'),
        isUncounterable: classesLower.includes('uncounterable'),
        isUnreflectable: classesLower.includes('unreflectable'),

        // Pattern flags
        isAoE: isAoE(desc),
        isDot: hasDot(desc),
        isBurst: isBurst(damageValue, desc),
        isInstant: classesLower.includes('instant'),
        requiresCondition: /(?:this\s+skill\s+)?requires?|can\s+only\s+be\s+used/i.test(desc),
        stacks: /this\s+skill\s+stacks|stacks/i.test(desc),
        kills: /kills?\s+(?:one\s+)?enemy/i.test(desc),

        // Trigger patterns
        hasTrap: /if\s+(?:they|an?\s+enemy)\s+(?:uses?|targets?)/i.test(desc),
        hasCounter: /counter(?:s|ing)?/i.test(desc) || /if\s+.*uses?\s+a\s+skill\s+on/i.test(desc)
    };
}

/**
 * PARSE HELPERS
 */
function parseEnergy(energyArray) {
    if (!Array.isArray(energyArray)) return { colors: [], total: 0 };
    const colors = energyArray.filter(e => e && e.toLowerCase() !== 'none');
    return {
        colors,
        total: colors.length
    };
}

function parseCooldown(cd) {
    if (cd === 'None' || cd === 'none' || !cd) return 0;
    return parseInt(cd) || 0;
}

function parseClasses(classesStr) {
    if (!classesStr) return [];
    return classesStr.split(',').map(c => c.trim()).filter(c => c);
}

// --- Main Generation Logic ---

function generateSkillEffect(character, skill, skillIndex) {
    const desc = skill.description || '';

    const damageValue = extractDamageValue(desc);
    const damageType = detectDamageType(desc);
    const conditionalDamage = extractConditionalDamage(desc);

    return {
        characterId: character.id,
        characterName: character.name,
        skillIndex,
        name: skill.name,

        damage: damageValue > 0 || conditionalDamage ? {
            base: damageValue,
            type: damageType || 'normal',
            conditional: conditionalDamage
        } : null,

        targeting: {
            type: detectTarget(desc),
            count: /all\s+enemies|all\s+allies/i.test(desc) ? 3 : 1
        },

        duration: extractDuration(desc, skill.classes),

        effects: extractStatusEffects(desc),

        flags: extractFlags(desc, skill.classes),

        cost: parseEnergy(skill.energy),

        cooldown: parseCooldown(skill.cooldown),

        classes: parseClasses(skill.classes),

        _originalDescription: desc
    };
}

function generateAllSkillEffects(characters) {
    const skillEffects = {};
    let totalSkills = 0;
    let damageSkills = 0;
    let effectSkills = 0;
    let countersReflects = 0;
    let stunSkills = 0;
    let healSkills = 0;

    for (const character of characters) {
        if (!character.skills) continue;

        for (let i = 0; i < character.skills.length; i++) {
            const skill = character.skills[i];
            const key = `${character.id}_${i}`;
            const effect = generateSkillEffect(character, skill, i);
            skillEffects[key] = effect;
            totalSkills++;

            // Stats
            if (effect.damage?.base > 0) damageSkills++;
            if (effect.effects.stun) stunSkills++;
            if (effect.effects.heal) healSkills++;
            if (effect.flags.hasCounter || effect.effects.reflect) countersReflects++;
            if (Object.values(effect.effects).some(v => v !== null && v !== 'target')) effectSkills++;
        }
    }

    console.log(`\n📊 Generation Statistics (v2.0):`);
    console.log(`   Total characters: ${characters.length}`);
    console.log(`   Total skills: ${totalSkills}`);
    console.log(`   Damage skills: ${damageSkills}`);
    console.log(`   Effect skills: ${effectSkills}`);
    console.log(`   Stun skills: ${stunSkills}`);
    console.log(`   Heal skills: ${healSkills}`);
    console.log(`   Counter/Reflect skills: ${countersReflects}`);

    return {
        version: '2.0.0',
        generatedAt: new Date().toISOString(),
        characterCount: characters.length,
        skillCount: totalSkills,
        skills: skillEffects
    };
}

// --- Main Execution ---

async function main() {
    console.log('🎮 Naruto Arena - Skill Effects Generator v2.0\n');
    console.log('==============================================\n');
    console.log('📚 Enhanced with naruto-unison effect taxonomy\n');

    // Load characters.json
    const dataPath = path.join(__dirname, '..', 'src', 'data', 'characters.json');
    console.log(`📂 Loading characters from: ${dataPath}`);

    if (!fs.existsSync(dataPath)) {
        console.error('❌ characters.json not found!');
        process.exit(1);
    }

    const charactersRaw = fs.readFileSync(dataPath, 'utf-8');
    const characters = JSON.parse(charactersRaw);
    console.log(`✅ Loaded ${characters.length} characters\n`);

    // Generate skill effects
    console.log('⚙️  Generating skill effects with enhanced taxonomy...');
    const skillEffects = generateAllSkillEffects(characters);

    // Write output
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'skill_effects.json');
    fs.writeFileSync(outputPath, JSON.stringify(skillEffects, null, 2));
    console.log(`\n✅ Written to: ${outputPath}`);

    // Show sample output
    console.log('\n📋 Sample output (first character - skill 0):');
    const firstKey = Object.keys(skillEffects.skills)[0];
    if (firstKey) {
        console.log(JSON.stringify(skillEffects.skills[firstKey], null, 2));
    }

    console.log('\n🎉 Done!');
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
