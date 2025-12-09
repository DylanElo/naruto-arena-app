
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const charPath = path.join(__dirname, 'src/data/characters.json');
const rawData = fs.readFileSync(charPath, 'utf8');
const characters = JSON.parse(rawData);

const initialCount = characters.length;

const cleanCharacters = characters.filter(c => {
    // Keep character IF:
    // Name is NOT "Character Name:" OR Skills are NOT empty
    const isPlaceholderName = c.name === "Character Name:";
    const hasNoSkills = !c.skills || c.skills.length === 0;

    // We want to remove it if BOTH are true (or just the name check is probably enough, but let's be safe)
    if (isPlaceholderName && hasNoSkills) {
        return false; // Remove
    }
    return true; // Keep
});

fs.writeFileSync(charPath, JSON.stringify(cleanCharacters, null, 2));

console.log(`Original count: ${initialCount}`);
console.log(`New count: ${cleanCharacters.length}`);
console.log(`Removed ${initialCount - cleanCharacters.length} characters.`);
