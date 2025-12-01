import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../naruto-arena-scraper/data/characters.json');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const characters = JSON.parse(rawData);

const analysis = {
    totalCharacters: characters.length,
    uniqueClasses: new Set(),
    commonPhrases: {},
    conditionalKeywords: {},
    statusEffects: new Set()
};

// Helper to count phrases
const addPhrase = (text) => {
    const words = text.toLowerCase().replace(/[.,()]/g, '').split(/\s+/);
    for (let i = 0; i < words.length - 2; i++) {
        const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        analysis.commonPhrases[phrase] = (analysis.commonPhrases[phrase] || 0) + 1;
    }
};

characters.forEach(char => {
    if (!char.skills) return;
    char.skills.forEach(skill => {
        // 1. Collect Classes
        if (skill.classes) {
            skill.classes.split(',').forEach(c => analysis.uniqueClasses.add(c.trim()));
        }

        const desc = (skill.description || '').toLowerCase();

        // 2. Mine Phrases
        addPhrase(desc);

        // 3. Detect Conditionals (Synergy Indicators)
        if (desc.includes('if used on')) {
            analysis.conditionalKeywords['if used on'] = (analysis.conditionalKeywords['if used on'] || 0) + 1;
        }
        if (desc.includes('affected by')) {
            analysis.conditionalKeywords['affected by'] = (analysis.conditionalKeywords['affected by'] || 0) + 1;
        }
        if (desc.includes('additional damage')) {
            analysis.conditionalKeywords['additional damage'] = (analysis.conditionalKeywords['additional damage'] || 0) + 1;
        }

        // 4. Detect Status Effects (Heuristic)
        const effects = ['stun', 'poison', 'burn', 'weaken', 'strengthen', 'invulnerable', 'protect', 'counter', 'reflect', 'silence', 'root', 'slow', 'drain', 'absorb'];
        effects.forEach(e => {
            if (desc.includes(e)) analysis.statusEffects.add(e);
        });
    });
});


// Convert Sets to Arrays for JSON output
const output = {
    totalCharacters: analysis.totalCharacters,
    uniqueClasses: Array.from(analysis.uniqueClasses).sort(),
    statusEffects: Array.from(analysis.statusEffects).sort(),
    topPhrases: Object.entries(analysis.commonPhrases)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50),
    conditionals: analysis.conditionalKeywords
};

fs.writeFileSync('analysis_output.json', JSON.stringify(output, null, 2));
console.log("Analysis written to analysis_output.json");

