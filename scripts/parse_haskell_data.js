
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Haskell source files
const BASE_DIR = path.resolve(__dirname, '../../Jules/naruto-unison-master/src/Game/Characters');
const SOURCE_DIRS = ['Original', 'Shippuden', 'Reanimated'];
const OUTPUT_FILE = path.resolve(__dirname, '../src/data/true_mechanics.json');

function parseHaskellFile(content, category) {
    const characters = [];
    let currentChar = null;
    let currentSkill = null;

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Detect Character Start
        // Matches "  [ Character", "  , Character", "    Character"
        const charMatch = line.match(/(?:\[|,)?\s*\bCharacter\s*$/);
        if (charMatch) {
            // Next line usually has the name in quotes
            const nameLine = lines[i + 1].trim();
            const nameMatch = nameLine.match(/"([^"]+)"/);
            if (nameMatch) {
                if (currentChar) characters.push(currentChar);
                currentChar = {
                    name: nameMatch[1],
                    category: category,
                    skills: []
                };
                i++; // Skip name line
                continue;
            }
        }

        if (!currentChar) continue;

        // Detect Skill Start
        // Skill.new
        if (line.includes('Skill.new')) {
            if (currentSkill) currentChar.skills.push(currentSkill);
            currentSkill = {
                name: '',
                desc: '',
                classes: [],
                effects: [], // strict effects
                synergies: [], // bonusIf triggers
                transformations: [] // Alternate
            };
        }

        // Detect Skill Name
        // Skill.name = "Naruto Uzumaki Barrage"
        const skillNameMatch = line.match(/Skill\.name\s*=\s*"([^"]+)"/);
        if (skillNameMatch && currentSkill) {
            currentSkill.name = skillNameMatch[1];
        }

        // Detect Description
        // Skill.desc      = "Using his version..."
        // Use [\s\S]*? to match multi-line descriptions if they exist, but usually they are one line string literals in Haskell
        const descMatch = line.match(/Skill\.desc\s*=\s*"([^"]+)"/);
        if (descMatch && currentSkill) {
            currentSkill.desc = descMatch[1];
        }

        // Detect Cost
        // Skill.cost      = [Tai]
        const costMatch = line.match(/Skill\.cost\s*=\s*\[(.*?)\]/);
        if (costMatch && currentSkill) {
            currentSkill.cost = costMatch[1].split(',').map(s => s.trim());
        }

        // Detect Classes
        // Skill.classes = [Physical, Melee]
        const classMatch = line.match(/Skill\.classes\s*=\s*\[(.*?)\]/);
        if (classMatch && currentSkill) {
            currentSkill.classes = classMatch[1].split(',').map(s => s.trim());
        }

        // Detect bonusIf (Synergy)
        // bonus <- 10 `bonusIf` userHas "Shadow Clones"
        // bonus <- 15 `bonusIf` targetHas "Sharingan"
        const bonusMatch = line.match(/`bonusIf`\s*(userHas|targetHas)\s*"([^"]+)"/);
        if (bonusMatch && currentSkill) {
            currentSkill.synergies.push({
                type: bonusMatch[1], // userHas or targetHas
                condition: bonusMatch[2]
            });
        }

        // Detect bonusIf alternative syntax
        // whenM (userHas "Byakugan")
        const whenMatch = line.match(/whenM\s*\((userHas|targetHas)\s*"([^"]+)"\)/);
        if (whenMatch && currentSkill) {
            currentSkill.synergies.push({
                type: whenMatch[1],
                condition: whenMatch[2]
            });
        }

        // Detect Transformations
        // Alternate "Mind Transfer" "Art of the Valentine"
        const altMatch = line.match(/Alternate\s*"([^"]+)"\s*"([^"]+)"/);
        if (altMatch && currentSkill) {
            currentSkill.transformations.push({
                from: altMatch[1],
                to: altMatch[2]
            });
        }

        // Detect Stacking
        // targetStacks "Unsealing Technique"
        const stackMatch = line.match(/targetStacks\s*"([^"]+)"/);
        if (stackMatch && currentSkill) {
            currentSkill.synergies.push({
                type: 'targetStacks',
                condition: stackMatch[1]
            });
        }
    }

    if (currentChar) {
        if (currentSkill) currentChar.skills.push(currentSkill);
        characters.push(currentChar);
    }

    return characters;
}

function scanDirectory() {
    let allCharacters = [];

    SOURCE_DIRS.forEach(dirName => {
        const dirPath = path.join(BASE_DIR, dirName);
        console.log(`Scanning ${dirPath}...`);

        if (!fs.existsSync(dirPath)) {
            console.error(`Directory not found: ${dirPath}`);
            return;
        }

        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.hs'));

        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            console.log(`Parsing ${file} (${dirName})...`);
            const chars = parseHaskellFile(content, dirName);
            allCharacters = [...allCharacters, ...chars];
        });
    });

    console.log(`Extracted ${allCharacters.length} characters.`);

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allCharacters, null, 2));
    console.log(`Saved to ${OUTPUT_FILE}`);
}

scanDirectory();
