/**
 * SKILL EFFECTS GENERATOR
 * 
 * Generates structured skill_effects.json from characters.json
 * Uses skillTagger.js extraction logic to bootstrap accurate data.
 * 
 * Run with: node scripts/generate_skill_effects.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Extraction functions (adapted from skillTagger.js) ---

function detectDamageType(desc) {
    desc = desc.toLowerCase();
    if (/affliction damage/i.test(desc)) return 'affliction';
    if (/piercing damage/i.test(desc)) return 'piercing';
    if (/steal \d+ health|health is stolen/i.test(desc)) return 'healthSteal';
    if (/\d+ damage/i.test(desc)) return 'normal';
    return null;
}

function extractDamageValue(desc) {
    // Get all damage mentions and take the first (primary) one
    const match = desc.match(/(\d+)\s*(?:affliction|piercing)?\s*damage/i);
    return match ? parseInt(match[1]) : 0;
}

function extractConditionalDamage(desc) {
    // Look for "X additional damage" patterns
    const additionalMatch = desc.match(/(\d+)\s+additional\s+damage/i);
    if (additionalMatch) {
        const bonus = parseInt(additionalMatch[1]);

        // Try to extract the condition
        let condition = 'unknown';
        if (/during\s+['"]?([^'"]+)['"]?/i.test(desc)) {
            const condMatch = desc.match(/during\s+['"]?([^'",.]+)['"]?/i);
            condition = condMatch ? `during_${condMatch[1].trim().toLowerCase().replace(/\s+/g, '_')}` : 'during_buff';
        } else if (/if.*affected by/i.test(desc)) {
            condition = 'target_affected';
        } else if (/if.*stunned/i.test(desc)) {
            condition = 'target_stunned';
        }

        return { condition, bonus };
    }
    return null;
}

function detectTarget(desc) {
    const d = desc.toLowerCase();
    if (/all enemies|all characters/.test(d)) return 'allEnemies';
    if (/all allies/.test(d)) return 'allAllies';
    if (/one ally|target ally|an ally|himself or an ally|herself or an ally/.test(d)) return 'ally';
    if (/one enemy|target enemy|an enemy/.test(d)) return 'enemy';
    if (/random enemy/.test(d)) return 'randomEnemy';
    if (/this skill makes .* invulnerable|gains? \d+ points of/.test(d)) return 'self';
    return 'enemy'; // default
}

function hasDot(desc) {
    return /for \d+ turns/i.test(desc) && /damage/i.test(desc);
}

function isBurst(damageValue, desc) {
    return damageValue >= 40 && !hasDot(desc) && !/all enemies/i.test(desc);
}

function isAoE(desc) {
    return /all enemies|all allies/i.test(desc);
}

function extractDuration(desc, classes) {
    const classesLower = (classes || '').toLowerCase();

    // Check persistence type
    let type = 'instant';
    if (classesLower.includes('action')) type = 'action';
    else if (classesLower.includes('control')) type = 'control';

    // Extract turn count
    let turns = 0;
    const turnMatch = desc.match(/for (\d+) turns?/i);
    if (turnMatch) {
        turns = parseInt(turnMatch[1]);
    }

    return { type, turns };
}

function extractStatusEffects(desc) {
    const effects = {
        appliesTo: 'target',
        stun: null,
        invulnerable: null,
        damageReduction: null,
        destructibleDefense: null,
        damageIncrease: null,
        damageDecrease: null,
        energyRemoval: null,
        energyGain: null,
        heal: null,
        mark: null
    };

    // Determine who effects apply to
    if (/makes .* invulnerable|gains? \d+ points/i.test(desc) && !/enemy|enemies/i.test(desc)) {
        effects.appliesTo = 'self';
    } else if (/all enemies/i.test(desc)) {
        effects.appliesTo = 'allEnemies';
    } else if (/all allies|her team|his team|their team/i.test(desc)) {
        effects.appliesTo = 'allAllies';
    }

    // Stun
    const stunMatch = desc.match(/stun.*for (\d+) turns?/i) || desc.match(/stunned for (\d+) turns?/i);
    if (stunMatch) {
        effects.stun = { duration: parseInt(stunMatch[1]) };
    } else if (/stuns? (their|one enemy|all enemies)/i.test(desc)) {
        effects.stun = { duration: 1 };
    }

    // Invulnerable
    const invulnMatch = desc.match(/invulnerable for (\d+) turns?/i);
    if (invulnMatch) {
        effects.invulnerable = { duration: parseInt(invulnMatch[1]) };
    }

    // Damage Reduction
    const drMatch = desc.match(/(\d+) points? of damage reduction/i);
    if (drMatch) {
        effects.damageReduction = { amount: parseInt(drMatch[1]) };
        const drDuration = desc.match(/damage reduction for (\d+) turns?/i);
        if (drDuration) {
            effects.damageReduction.duration = parseInt(drDuration[1]);
        }
    }

    // Destructible Defense
    const ddMatch = desc.match(/(\d+) points? of (?:permanent )?destructible defense/i);
    if (ddMatch) {
        effects.destructibleDefense = {
            amount: parseInt(ddMatch[1]),
            permanent: /permanent/i.test(desc)
        };
    }

    // Damage Increase/Decrease
    const dmgIncMatch = desc.match(/deal (\d+) (additional|more) damage/i);
    if (dmgIncMatch) {
        effects.damageIncrease = { amount: parseInt(dmgIncMatch[1]) };
    }

    const dmgDecMatch = desc.match(/deal (\d+) less damage/i) || desc.match(/damage.*lowered by (\d+)/i);
    if (dmgDecMatch) {
        effects.damageDecrease = { amount: parseInt(dmgDecMatch[1]) };
    }

    // Energy Removal
    const energyRemMatch = desc.match(/remove[s]? (\d+) (?:random )?energy/i) || desc.match(/lose[s]? (\d+) (?:random )?energy/i);
    if (energyRemMatch) {
        effects.energyRemoval = { amount: parseInt(energyRemMatch[1]) };
    }

    // Energy Gain
    const energyGainMatch = desc.match(/gain[s]? (\d+) (?:random )?energy/i);
    if (energyGainMatch) {
        effects.energyGain = { amount: parseInt(energyGainMatch[1]) };
    }

    // Heal
    const healMatch = desc.match(/heal[s]? .*for (\d+) health/i) || desc.match(/heal[s]? (\d+) health/i) || desc.match(/recover[s]? (\d+) health/i);
    if (healMatch) {
        effects.heal = { amount: parseInt(healMatch[1]) };
    }

    // Mark (for conditional effects)
    if (/unable to reduce damage or become invulnerable/i.test(desc)) {
        effects.mark = { type: 'vulnerable' };
    }

    return effects;
}

function extractFlags(desc, classes) {
    return {
        ignoresInvulnerability: /ignore[s]? invulnerability/i.test(desc),
        cannotBeCountered: /cannot be countered/i.test(desc),
        cannotBeReflected: /cannot be reflected/i.test(desc),
        piercesDamageReduction: /piercing/i.test(desc),
        isAoE: isAoE(desc),
        isDot: hasDot(desc),
        isBurst: isBurst(extractDamageValue(desc), desc),
        isInstant: (classes || '').toLowerCase().includes('instant'),
        requiresCondition: /this skill requires|can only be used/i.test(desc),
        stacks: /this skill stacks|stacks/i.test(desc),
        kills: /kills one enemy/i.test(desc)
    };
}

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
    const key = `${character.id}_${skillIndex}`;

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
            count: /all enemies|all allies/i.test(desc) ? 3 : 1
        },

        duration: extractDuration(desc, skill.classes),

        effects: extractStatusEffects(desc),

        flags: extractFlags(desc, skill.classes),

        cost: parseEnergy(skill.energy),

        cooldown: parseCooldown(skill.cooldown),

        classes: parseClasses(skill.classes),

        // Keep original description for reference
        _originalDescription: desc
    };
}

function generateAllSkillEffects(characters) {
    const skillEffects = {};
    let totalSkills = 0;
    let damageSkills = 0;
    let effectSkills = 0;

    for (const character of characters) {
        if (!character.skills) continue;

        for (let i = 0; i < character.skills.length; i++) {
            const skill = character.skills[i];
            const key = `${character.id}_${i}`;
            const effect = generateSkillEffect(character, skill, i);
            skillEffects[key] = effect;
            totalSkills++;

            if (effect.damage?.base > 0) damageSkills++;
            if (Object.values(effect.effects).some(v => v !== null && v !== 'target')) effectSkills++;
        }
    }

    console.log(`\n📊 Generation Statistics:`);
    console.log(`   Total characters: ${characters.length}`);
    console.log(`   Total skills: ${totalSkills}`);
    console.log(`   Damage skills: ${damageSkills}`);
    console.log(`   Effect skills: ${effectSkills}`);

    return {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        characterCount: characters.length,
        skillCount: totalSkills,
        skills: skillEffects
    };
}

// --- Main Execution ---

async function main() {
    console.log('🎮 Naruto Arena - Skill Effects Generator\n');
    console.log('=========================================\n');

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
    console.log('⚙️  Generating skill effects...');
    const skillEffects = generateAllSkillEffects(characters);

    // Write output
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'skill_effects.json');
    fs.writeFileSync(outputPath, JSON.stringify(skillEffects, null, 2));
    console.log(`\n✅ Written to: ${outputPath}`);

    // Show sample output
    console.log('\n📋 Sample output (Uzumaki Naruto - Uzumaki Naruto Combo):');
    console.log(JSON.stringify(skillEffects.skills['1_0'], null, 2));

    console.log('\n🎉 Done!');
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
