
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const charPath = path.join(__dirname, 'src/data/characters.json');
const rawData = fs.readFileSync(charPath, 'utf8');
const characters = JSON.parse(rawData);

// Filter specifically for empty names
const emptyNameChars = characters.filter(c => {
    return !c.name || c.name.trim() === '';
});

console.log('Found ' + emptyNameChars.length + ' characters with empty names:');
emptyNameChars.forEach(c => {
    console.log(`ID: ${c.id}, Name: "${c.name}"`);
});
