import { analyzeCharacter } from './src/utils/recommendationEngine.js';

// Mock Data based on characters.json
const sasuke = {
    id: 3,
    name: "Uchiha Sasuke",
    skills: [
        {
            name: "Lion Combo",
            description: "Uchiha Sasuke deals 35 damage to one enemy. This skill will deal 10 additional damage to an enemy affected by 'Sharingan'.",
            classes: "Physical,Instant"
        },
        {
            name: "Chidori",
            description: "Uchiha Sasuke deals 35 piercing damage to one enemy. This skill will deal 25 additional damage to an enemy affected by 'Sharingan'.",
            classes: "Energy,Instant"
        },
        {
            name: "Sharingan",
            description: "Uchiha Sasuke targets one enemy. For 3 turns, Uchiha Sasuke will gain 10 points of damage reduction. During this time, that enemy will be unable to reduce damage or become invulnerable. This skill will end if Uchiha Sasuke dies.",
            classes: "Strategic,Instant"
        },
        {
            name: "Swift Block",
            description: "This skill makes Uchiha Sasuke invulnerable for 1 turn.",
            classes: "Strategic,Instant"
        }
    ]
};

const inoS = {
    id: 71,
    name: "Yamanaka Ino (S)",
    skills: [
        {
            name: "Mind Body Switch",
            description: "Yamanaka Ino (S) targets one enemy. After 1 turn, that enemy will take 15 damage and if that enemy uses a new harmful skill during this time, they will be countered and this skill will be replaced by the skill they used for 1 turn. This skill cannot be reflected and is invisible.",
            classes: "Mental,Instant"
        },
        {
            name: "Proxy Surveillance",
            description: "Yamanaka Ino (S) targets all enemies. For 3 turns, everytime they use a new skill, they will take 5 piercing damage. During this time, all new invisible skills they use will become visible. This skill cannot be countered or reflected.",
            classes: "Mental,Instant"
        },
        {
            name: "Mind Clone Switch",
            description: "For 2 turns, both of Yamanaka Ino (S)'s allies will ignore all harmful effects other than damage and energy cost changes. This skill is invisible and will end if Yamanaka Ino (S) dies.",
            classes: "Strategic,Instant"
        },
        {
            name: "Hide",
            description: "This skill makes Yamanaka Ino (S) invulnerable for 1 turn.",
            classes: "Strategic,Instant"
        }
    ]
};


import fs from 'fs';

let output = "--- Analyzing Sasuke ---\n";
const sasukeAnalysis = analyzeCharacter(sasuke);
output += "Roles: " + JSON.stringify(sasukeAnalysis.roles, null, 2) + "\n";
output += "Mechanics: " + JSON.stringify(sasukeAnalysis.mechanics, null, 2) + "\n";

output += "\n--- Analyzing Ino (S) ---\n";
const inoSAnalysis = analyzeCharacter(inoS);
output += "Roles: " + JSON.stringify(inoSAnalysis.roles, null, 2) + "\n";
output += "Mechanics: " + JSON.stringify(inoSAnalysis.mechanics, null, 2) + "\n";

fs.writeFileSync('test_results.txt', output);
console.log("Results written to test_results.txt");
