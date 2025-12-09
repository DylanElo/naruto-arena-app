
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const charPath = path.join(__dirname, 'src/data/characters.json');
const rawData = fs.readFileSync(charPath, 'utf8');
const characters = JSON.parse(rawData);

const badChars = characters.filter(c => {
    const isId400 = c.id == 400;
    const noName = !c.name || c.name.trim() === '';
    const isPlaceholder = c.name && c.name.toLowerCase().includes('placeholder');
    return isId400 || noName || isPlaceholder;
});

console.log('Found ' + badChars.length + ' bad characters:');
badChars.forEach(c => {
    console.log(`ID: ${c.id}, Name: "${c.name}"`);
});
