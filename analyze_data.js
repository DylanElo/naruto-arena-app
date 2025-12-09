import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../naruto-arena-scraper/data/characters.json');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const characters = JSON.parse(rawData);

// ============================================
// SKILL MECHANICS EXTRACTION ENGINE
// ============================================

/**
 * Extract numeric damage values from skill description
 */
const extractDamage = (description) => {
    const damages = [];

    // Match patterns like "35 damage", "20 piercing damage", "5 additional damage"
    const damageRegex = /(\d+)\s*(?:additional\s+)?(?:piercing\s+|affliction\s+)?damage/gi;
    let match;

    while ((match = damageRegex.exec(description)) !== null) {
        damages.push(parseInt(match[1]));
    }

    return damages;
};

/**
 * Detect control mechanics
 */
const detectControls = (description) => {
    const desc = description.toLowerCase();
    const controls = {
        stun: /stun/i.test(desc),
        counter: /counter/i.test(desc),
        disable: /unable to/i.test(desc) || /cannot/i.test(desc),
        invulnerable: /invulnerable/i.test(desc),
        immunity: /ignore.*harm|ignore.*effect/i.test(desc),
    };

    return controls;
};

/**
 * Detect damage modifiers
 */
const detectDamageTypes = (description) => {
    const desc = description.toLowerCase();

    return {
        piercing: /piercing\s+damage/i.test(desc),
        affliction: /affliction\s+damage/i.test(desc),
        conditional: /additional\s+damage.*if|additional\s+damage.*affected/i.test(desc),
    };
};

/**
 * Extract duration (turns)
 */
const extractDuration = (description) => {
    const match = description.match(/for\s+(\d+)\s+turns?/i);
    if (match) return parseInt(match[1]);

    if (/rest of the game/i.test(description)) return 999;
    if (/permanent/i.test(description)) return 999;

    return 1; // Default
};

/**
 * Detect targeting
 */
const detectTargeting = (description) => {
    const desc = description.toLowerCase();

    if (desc.includes('all enemies')) return 'aoe';
    if (desc.includes('one enemy') || desc.includes('targets one')) return 'single';
    if (desc.includes('allies') || desc.includes('ally')) return 'ally';

    return 'self';
};

/**
 * Detect synergy keywords (e.g., "affected by X", "if used on")
 */
const extractSynergies = (description, characterName) => {
    const synergies = [];

    // Pattern: "affected by 'Skill Name'"
    const affectedByMatch = description.match(/affected by ['"]([^'"]+)['"]/gi);
    if (affectedByMatch) {
        affectedByMatch.forEach(match => {
            const skillName = match.match(/['"]([^'"]+)['"]/)[1];
            synergies.push({
                type: 'requires_status',
                skill: skillName,
                character: characterName
            });
        });
    }

    // Pattern: "if used on" (targeting synergy)
    if (/if used on/i.test(description)) {
        synergies.push({
            type: 'conditional_targeting',
            description: description.match(/if used on[^.]+/i)?.[0]
        });
    }

    return synergies;
};

/**
 * Analyze a single skill comprehensively
 */
const analyzeSkill = (skill, characterName) => {
    const description = skill.description || '';
    const damages = extractDamage(description);

    return {
        name: skill.name,
        classes: skill.classes ? skill.classes.split(',').map(c => c.trim()) : [],

        // Damage analysis
        baseDamage: damages.length > 0 ? damages[0] : 0,
        totalPotentialDamage: damages.reduce((a, b) => a + b, 0),
        damageCount: damages.length,

        // Damage types
        ...detectDamageTypes(description),

        // Control mechanics
        controls: detectControls(description),

        // Timing
        duration: extractDuration(description),
        targeting: detectTargeting(description),

        // Synergies
        synergies: extractSynergies(description, characterName),

        // Flags
        isInvisible: /invisible/i.test(description),
        cannotBeCountered: /cannot be countered/i.test(description),
        cannotBeReflected: /cannot be reflected/i.test(description),

        // Raw description for reference
        description: description.substring(0, 200) // Truncate for space
    };
};

/**
 * Analyze entire character
 */
const analyzeCharacterData = (character) => {
    if (!character.skills || character.skills.length === 0) {
        return null;
    }

    const skills = character.skills.map(skill => analyzeSkill(skill, character.name));

    // Aggregate stats
    const totalDamage = skills.reduce((sum, s) => sum + s.totalPotentialDamage, 0);
    const hasStun = skills.some(s => s.controls.stun);
    const hasInvuln = skills.some(s => s.controls.invulnerable);
    const hasImmunity = skills.some(s => s.controls.immunity);
    const hasPiercing = skills.some(s => s.piercing);
    const hasAOE = skills.some(s => s.targeting === 'aoe');

    return {
        id: character.id,
        name: character.name,
        skills: skills,

        // Summary stats
        summary: {
            burstPotential: totalDamage,
            avgDamagePerSkill: Math.round(totalDamage / skills.length),
            controlTools: hasStun ? 'stun' : (hasInvuln ? 'invuln' : 'none'),
            hasPiercing,
            hasAOE,
            hasImmunity,
            synergyCount: skills.reduce((sum, s) => sum + s.synergies.length, 0)
        }
    };
};

// ============================================
// ANALYZE ALL CHARACTERS
// ============================================

console.log('🔍 Analyzing character data...');
const analyzedCharacters = characters
    .map(analyzeCharacterData)
    .filter(c => c !== null);

// ============================================
// BUILD META INSIGHTS
// ============================================

const metaInsights = {
    totalCharacters: analyzedCharacters.length,

    // Top burst damage characters
    topBurstCharacters: analyzedCharacters
        .sort((a, b) => b.summary.burstPotential - a.summary.burstPotential)
        .slice(0, 20)
        .map(c => ({
            name: c.name,
            burstDamage: c.summary.burstPotential
        })),

    // Control specialists
    controlSpecialists: analyzedCharacters
        .filter(c => c.skills.some(s => s.controls.stun))
        .map(c => ({
            name: c.name,
            stunSkills: c.skills.filter(s => s.controls.stun).map(s => s.name)
        })),

    // Piercing characters
    piercingCharacters: analyzedCharacters
        .filter(c => c.summary.hasPiercing)
        .map(c => c.name),

    // High synergy characters
    synergyCharacters: analyzedCharacters
        .filter(c => c.summary.synergyCount > 0)
        .sort((a, b) => b.summary.synergyCount - a.summary.synergyCount)
        .slice(0, 30)
        .map(c => ({
            name: c.name,
            synergyCount: c.summary.synergyCount,
            synergies: c.skills.flatMap(s => s.synergies)
        })),

    // AOE specialists
    aoeCharacters: analyzedCharacters
        .filter(c => c.summary.hasAOE)
        .map(c => c.name)
};

// ============================================
// OUTPUT
// ============================================

// Write full analyzed data
fs.writeFileSync(
    'analysis_output.json',
    JSON.stringify({
        characters: analyzedCharacters,
        meta: metaInsights
    }, null, 2)
);

// Write summary report
const report = `
==============================================
NARUTO ARENA - CHARACTER ANALYSIS REPORT
==============================================

📊 OVERVIEW
-----------
Total Characters Analyzed: ${metaInsights.totalCharacters}

🔥 TOP 10 BURST DAMAGE CHARACTERS
----------------------------------
${metaInsights.topBurstCharacters.slice(0, 10).map((c, i) =>
    `${i + 1}. ${c.name.padEnd(30)} ${c.burstDamage} total damage`
).join('\n')}

🎯 CONTROL SPECIALISTS (STUN)
------------------------------
Found ${metaInsights.controlSpecialists.length} characters with stun abilities

Top 10:
${metaInsights.controlSpecialists.slice(0, 10).map((c, i) =>
    `${i + 1}. ${c.name.padEnd(30)} Skills: ${c.stunSkills.join(', ')}`
).join('\n')}

⚡ PIERCING DAMAGE CHARACTERS
----------------------------
Total: ${metaInsights.piercingCharacters.length} characters

${metaInsights.piercingCharacters.slice(0, 15).join(', ')}

🔗 HIGH SYNERGY CHARACTERS
--------------------------
Top 10 characters with skill synergies:
${metaInsights.synergyCharacters.slice(0, 10).map((c, i) =>
    `${i + 1}. ${c.name.padEnd(30)} ${c.synergyCount} synergies`
).join('\n')}

💥 AOE SPECIALISTS
------------------
Total: ${metaInsights.aoeCharacters.length} characters with AOE skills

${metaInsights.aoeCharacters.slice(0, 20).join(', ')}

==============================================
✅ Analysis complete!
==============================================
`;

fs.writeFileSync('analysis_report.txt', report);

console.log(report);
console.log('\n📁 Files created:');
console.log('  - analysis_output.json (full data)');
console.log('  - analysis_report.txt (summary report)');
