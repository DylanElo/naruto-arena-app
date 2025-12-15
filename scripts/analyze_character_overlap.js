
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_CHARS_PATH = path.resolve(__dirname, '../src/data/characters.json');
const TRUE_MECH_PATH = path.resolve(__dirname, '../src/data/true_mechanics.json');

function normalize(name) {
    if (!name) return '';
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents (ū -> u)
        .replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric
}

function checkMatch(appNorm, trueData) {
    // Try exact
    if (trueData.has(appNorm)) return trueData.get(appNorm);

    // Try flipped (Naruto Uzumaki <-> Uzumaki Naruto)
    // Cannot easily flip "Uchiha Sasuke" without splitting words
    return null;
}

function analyzeOverlap() {
    console.log('Loading datasets...');

    // Check files exist
    if (!fs.existsSync(APP_CHARS_PATH)) {
        console.error('Missing app characters.json');
        return;
    }
    if (!fs.existsSync(TRUE_MECH_PATH)) {
        console.error('Missing true_mechanics.json');
        return;
    }

    const appData = JSON.parse(fs.readFileSync(APP_CHARS_PATH, 'utf-8'));
    const appChars = Array.isArray(appData) ? appData : (appData.characters || []);

    const trueData = JSON.parse(fs.readFileSync(TRUE_MECH_PATH, 'utf-8'));

    // Create a map of normalized names AND parts
    // "Naruto Uzumaki" -> "narutouzumaki", ["naruto", "uzumaki"]
    const trueMap = new Map();
    trueData.forEach(c => {
        const norm = normalize(c.name);
        trueMap.set(norm, c);

        // Add suffixed versions based on category
        if (c.category === 'Shippuden') {
            trueMap.set(normalize(c.name + ' S'), c); // "Naruto Uzumaki (S)"
            trueMap.set(normalize(c.name + ' Shippuden'), c);
        } else if (c.category === 'Reanimated') {
            trueMap.set(normalize(c.name + ' Reanimated'), c);
        } else if (c.category === 'Original') {
            // Some apps might use just "Naruto" for Original, but Haskell has "Naruto Uzumaki"
            // Let's add partials if unique?
            // Or handle the other way: App "Naruto" matches Haskell "Naruto Uzumaki"
        }

        // Also index by parts for fuzzy matching?
        // Actually, let's just create a set of "normalized parts" for checking permutations
        // "Naruto Uzumaki" -> Set{"naruto", "uzumaki"}
        c._parts = new Set(c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter(x => x));
    });

    let exactMatches = 0;
    let fuzzyMatches = 0;
    let missing = [];

    appChars.forEach(appChar => {
        // App name: "Uzumaki Naruto"
        const appParts = appChar.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter(x => x);
        const appNorm = normalize(appChar.name);

        let match = trueMap.get(appNorm);

        if (!match) {
            // Check for Permutations
            // iterate all true chars
            for (const c of trueData) {
                // If set overlap is high?
                // If they have the exact same parts?
                if (c._parts.size === appParts.length) {
                    let allPartsMatch = true;
                    for (const p of c._parts) {
                        if (!appParts.includes(p)) {
                            allPartsMatch = false;
                            break;
                        }
                    }
                    if (allPartsMatch) {
                        match = c;
                        break;
                    }
                }

                // Fallback: Check if "Naruto (S)" contains "Naruto"
                // But avoid generic overlaps.
                // If "Uchiha Sasuke" matches "Sasuke" (true char might be just "Sasuke" in some cases?)
                // Actually internal true names are "Sasuke Uchiha".
            }
        }

        if (match) {
            // console.log(`Matched: ${appChar.name} -> ${match.name}`);
            if (normalize(match.name) === appNorm) exactMatches++;
            else fuzzyMatches++;
        } else {
            missing.push(appChar.name);
        }
    });

    console.log(`\nAnalysis Results:`);
    console.log(`Exact Matches (Normalized): ${exactMatches}`);
    console.log(`Fuzzy Matches (Reordered): ${fuzzyMatches}`);
    console.log(`Total Matches: ${exactMatches + fuzzyMatches}`);
    console.log(`No Match (Exclusive to App): ${missing.length}`);

    console.log(`\nFirst 20 Exclusive Characters:`);
    console.log(missing.slice(0, 20).join(', '));
}

analyzeOverlap();
