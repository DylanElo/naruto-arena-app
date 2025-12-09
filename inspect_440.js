
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const charPath = path.join(__dirname, 'src/data/characters.json');
const rawData = fs.readFileSync(charPath, 'utf8');
const characters = JSON.parse(rawData);

// List chars 430-460
const targetChars = characters.filter(c => c.id >= 430 && c.id <= 460);

targetChars.forEach(c => {
    console.log(`ID: ${c.id}, Name: "${c.name}", Skills: ${c.skills?.length}`);
});
