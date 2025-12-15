
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { recommendPartnersForMain, analyzeCharacter } from '../src/utils/recommendationEngine.js';
import { getCharacterKnowledge } from '../src/utils/knowledgeEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock Data Loading
const loadCharacters = () => {
    const p = path.join(__dirname, '../src/data/characters_unified.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(data) ? data : (data.characters || []);
};

async function debugNarutoS() {
    const allChars = loadCharacters();
    const main = allChars.find(c => c.name === 'Naruto (S)' || c.name === 'Uzumaki Naruto (S)');

    if (!main) { console.error('Could not find Naruto S'); return; }

    console.log(`\n--- Analyzing ${main.name} ---`);
    const analysis = analyzeCharacter(main);
    console.log('Roles:', JSON.stringify(analysis.roles));
    console.log('Mechanics:', JSON.stringify(analysis.mechanics));
    console.log('Energy:', JSON.stringify(analysis.energy));

    console.log('\n--- Getting Suggestions (Energy Aware) ---');
    const suggestions = recommendPartnersForMain(main, allChars, null, 5);

    suggestions.forEach((s, idx) => {
        console.log(`#${idx + 1}: ${s.name} - Score: ${s.synergyScore}`);
        console.log('   Notes:', s.buildAroundNotes);
        const sAnalysis = analyzeCharacter(s);
        console.log('   Partner Energy:', JSON.stringify(sAnalysis.energy?.colors || {}));
    });
}

debugNarutoS();
