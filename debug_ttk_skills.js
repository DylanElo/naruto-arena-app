import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../naruto-arena-scraper/data/characters.json');
const characters = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// The exact logic from recommendationEngine.js
const extractSkillDamage = (skill) => {
    if (!skill) return 0;
    if (typeof skill.damage === 'number' && skill.damage > 0) return skill.damage;
    if (skill.description) {
        const desc = skill.description.toLowerCase();

        // 1. Periodic/Affliction damage with duration
        const dotMatch = desc.match(/(\d+)\s+(?:affliction )?damage[^.]*?for\s+(\d+)\s+turns?/);
        if (dotMatch && dotMatch[1] && dotMatch[2]) {
            const perTick = parseInt(dotMatch[1], 10);
            const turns = parseInt(dotMatch[2], 10);
            return { val: perTick * Math.max(1, turns), type: `DoT (${perTick} x ${turns} turns)` };
        }

        // 2. Permanent/Each turn damage
        const permanentDotMatch = desc.match(/(\d+)\s+(?:affliction )?damage[^.]*each turn.*permanent/);
        if (permanentDotMatch && permanentDotMatch[1]) {
            const perTick = parseInt(permanentDotMatch[1], 10);
            return { val: perTick * 3, type: `Permanent DoT (${perTick} x 3 turns est.)` };
        }

        // 3. Direct Damage (Standard, Piercing, Affliction)
        // Matches "20 damage", "20 piercing damage", "20 affliction damage"
        const match = desc.match(/(\d+)\s*(?:piercing|affliction)?\s*(?:damage|dmg)/);
        if (match && match[1]) {
            return { val: parseInt(match[1], 10), type: 'Direct' };
        }
    }
    return { val: 0, type: 'None' };
};

const teamNames = ['Hyuuga Neji', 'Uchiha Itachi (S)', 'Uchiha Obito'];

console.log(`\n📊 TTK CALCULATION BREAKDOWN`);
console.log(`=========================================`);

let totalBurst = 0;

teamNames.forEach(name => {
    const char = characters.find(c => c.name === name);
    if (!char) return;

    console.log(`\n👤 ${name.toUpperCase()}`);
    console.log(`-----------------------------------------`);

    let bestSkill = { name: 'None', damage: 0, type: '' };

    char.skills.forEach(skill => {
        const result = extractSkillDamage(skill);
        console.log(`   🔹 ${skill.name}: ${result.val} dmg [${result.type}]`);

        if (result.val > bestSkill.damage) {
            bestSkill = { name: skill.name, damage: result.val, type: result.type };
        }
    });

    console.log(`   ✅ BEST SKILL: ${bestSkill.name} (${bestSkill.damage} dmg)`);
    totalBurst += bestSkill.damage;
});

console.log(`\n=========================================`);
console.log(`💥 TOTAL TEAM BURST: ${totalBurst}`);
console.log(`🏥 ENEMY HP POOL: 300 (3 enemies x 100 HP)`);
console.log(`⏱️ TTK: Math.ceil(300 / ${totalBurst}) = ${Math.ceil(300 / totalBurst)} turns`);
