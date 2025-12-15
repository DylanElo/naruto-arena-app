
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_CHARS_PATH = path.resolve(__dirname, '../src/data/characters.json');
const TRUE_MECH_PATH = path.resolve(__dirname, '../src/data/true_mechanics.json');
const OUTPUT_PATH = path.resolve(__dirname, '../src/data/characters_unified.json');

function normalize(name) {
    if (!name) return '';
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '');
}

function tokenize(name) {
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .split(/[^a-z0-9]+/)
        .filter(x => x && x !== 's' && x !== 'reanimated'); // Ignore common suffixes for token matching
}

function findMatch(appChar, trueData) {
    const appNorm = normalize(appChar.name);
    const appTokens = tokenize(appChar.name);

    // 1. Try Exact Match (Normalized)
    // We need to account for suffix logic derived from category
    for (const kc of trueData) {
        let candidates = [normalize(kc.name)];
        if (kc.category === 'Shippuden') candidates.push(normalize(kc.name + 's')); // "Naruto (S)" -> narutos
        if (kc.category === 'Reanimated') candidates.push(normalize(kc.name + 'reanimated'));

        if (candidates.includes(appNorm)) return kc;
    }

    // 2. Try Fuzzy Token Match
    // If all tokens of TrueChar are present in AppChar (or vice versa)
    // "Uzumaki Naruto" vs "Naruto Uzumaki" -> tokens {uzumaki, naruto} vs {naruto, uzumaki} -> Match
    let bestMatch = null;
    let maxOverlap = 0;

    for (const kc of trueData) {
        const kcTokens = tokenize(kc.name);

        // Calculate overlap
        const intersection = appTokens.filter(t => kcTokens.includes(t));

        // Check if strong match
        // e.g. 2/2 match or 2/3 match
        if (intersection.length > 0 && intersection.length === Math.min(appTokens.length, kcTokens.length)) {
            // Check suffix compatibility
            const isShippudenApp = appChar.name.includes('(S)');
            const isReanimatedApp = appChar.name.includes('Reanimated') || appChar.name.includes('(R)'); // ?

            const isShippudenTrue = kc.category === 'Shippuden';
            const isReanimatedTrue = kc.category === 'Reanimated';

            if (isShippudenApp === isShippudenTrue && isReanimatedApp === isReanimatedTrue) {
                return kc;
            }
        }
    }

    return null;
}

function inferMechanics(appChar) {
    // Basic inference for characters that don't have True Data
    // We want to create a structure that mimics the True Data Schema
    // classes: [], synergies: [], effects: []

    const enrichedSkills = appChar.skills.map(s => {
        const classes = [];
        const synergies = [];
        const desc = s.description.toLowerCase();

        // Infer Classes
        if (desc.includes('physical') || desc.includes('damage')) classes.push('Physical'); // simplified
        if (desc.includes('chakra')) classes.push('Chakra');
        if (desc.includes('mental') || desc.includes('stun')) classes.push('Mental');
        if (desc.includes('ranged')) classes.push('Ranged');
        if (desc.includes('melee')) classes.push('Melee');
        if (desc.includes('affliction') || desc.includes('poison') || desc.includes('fire')) classes.push('Bane');
        if (desc.includes('instant')) classes.push('Instant');

        // Infer Synergies (very rough)
        // "deals 10 more damage if target is stunned"
        if (desc.match(/if .* stunned/)) {
            synergies.push({ type: 'targetHas', condition: 'Stun' });
        }

        return {
            ...s,
            classes,
            synergies,
            isInferred: true
        };
    });

    return {
        ...appChar,
        skills: enrichedSkills,
        hasTrueMechanics: false
    };
}

function mergeData() {
    console.log('Loading datasets...');
    const appDataRaw = JSON.parse(fs.readFileSync(APP_CHARS_PATH, 'utf-8'));
    const appChars = Array.isArray(appDataRaw) ? appDataRaw : (appDataRaw.characters || []);
    const trueData = JSON.parse(fs.readFileSync(TRUE_MECH_PATH, 'utf-8'));

    const unified = [];
    let matchedCount = 0;

    appChars.forEach(appChar => {
        const match = findMatch(appChar, trueData);

        if (match) {
            matchedCount++;
            // Merge Strategies
            // Use App ID, Image, Name (Display)
            // Use True Mechanics for Skills

            // Map True Skills to App Slots?
            // True Data often has more skills (transformations). 
            // App Data usually has 4 skills.
            // We should prefer True Data entirely for simulation, but need to map to UI structure.
            // For now, let's embed the True Data as `mechanics` property.

            unified.push({
                ...appChar,
                hasTrueMechanics: true,
                trueMechanics: {
                    category: match.category,
                    skills: match.skills
                }
            });
        } else {
            // No match found
            unified.push(inferMechanics(appChar));
        }
    });

    console.log(`Matched: ${matchedCount} / ${appChars.length}`);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ characters: unified }, null, 2));
    console.log(`Saved unified data to ${OUTPUT_PATH}`);
}

mergeData();
