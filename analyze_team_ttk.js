import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../naruto-arena-scraper/data/characters.json');
const characters = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// The team from the screenshot
const teamNames = ['Hyuuga Neji', 'Uchiha Itachi (S)', 'Uchiha Obito'];

let totalBurst = 0;

teamNames.forEach(name => {
    const char = characters.find(c => c.name === name);
    if (!char) {
        console.log(`\n❌ ${name} not found`);
        return;
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`${name.toUpperCase()}`);
    console.log('='.repeat(50));

    let maxDamage = 0;
    let maxSkill = null;

    char.skills.forEach((skill, i) => {
        const desc = skill.description || '';

        // Extract all damage values
        const damageMatches = [...desc.matchAll(/(\d+)\s*(?:affliction\s+)?(?:piercing\s+)?damage/gi)];
        const damages = damageMatches.map(m => parseInt(m[1]));
        const totalDamage = damages.reduce((a, b) => a + b, 0);

        const energyCost = skill.energy ? skill.energy.filter(e => e !== 'none').length : 0;

        console.log(`\nSkill ${i + 1}: ${skill.name}`);
        console.log(`  Energy Cost: ${energyCost}`);
        console.log(`  Damage Values: ${damages.length > 0 ? damages.join(' + ') : 'None'}`);
        console.log(`  Total Damage: ${totalDamage}`);
        console.log(`  Description: ${desc.substring(0, 120)}...`);

        if (totalDamage > maxDamage) {
            maxDamage = totalDamage;
            maxSkill = skill.name;
        }
    });

    console.log(`\n🎯 HIGHEST DAMAGE SKILL: ${maxSkill} (${maxDamage} damage)`);
    totalBurst += maxDamage;
});

console.log(`\n${'='.repeat(50)}`);
console.log(`TEAM BURST CALCULATION`);
console.log('='.repeat(50));
console.log(`Total Burst Damage = ${totalBurst}`);
console.log(`Total Enemy HP = 300 (3 enemies × 100 HP)`);
console.log(`TTK = ceil(300 / ${totalBurst}) = ${Math.ceil(300 / totalBurst)} turns`);
