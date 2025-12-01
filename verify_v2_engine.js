import { analyzeCharacter, analyzeTeam, getSuggestions } from './src/utils/recommendationEngine.js';
import fs from 'fs';

// Mock Data
const sasuke = {
    id: 3,
    name: "Uchiha Sasuke",
    skills: [
        { description: "deals 35 piercing damage", classes: "Instant" },
        { description: "gain 10 points of damage reduction. enemy unable to reduce damage", classes: "Strategic" }
    ]
};

const inoS = {
    id: 71,
    name: "Yamanaka Ino (S)",
    skills: [
        { description: "if that enemy uses a new harmful skill... skill will be replaced", classes: "Mental" }, // Punisher
        { description: "everytime they use a new skill... piercing damage", classes: "Mental" }, // Punisher
        { description: "ignore all harmful effects", classes: "Strategic" } // Immunity
    ]
};

const shikamaru = {
    id: 8,
    name: "Nara Shikamaru",
    skills: [
        { description: "stun one enemy for 1 turn", classes: "Mental" } // Stun
    ]
};

const zabuza = {
    id: 10,
    name: "Momochi Zabuza",
    skills: [
        { description: "this skill makes Momochi Zabuza invulnerable", classes: "Strategic" }, // Invulnerable
        { description: "damage to all enemies", classes: "Physical" } // AoE
    ]
};

let output = "--- V2 Engine Verification ---\n\n";

// Test 1: Individual Analysis
output += "1. Sasuke Analysis (Expected: Anti-Tank, Piercing)\n";
const sasukeRes = analyzeCharacter(sasuke);
output += JSON.stringify(sasukeRes.mechanics, null, 2) + "\n\n";

output += "2. Ino (S) Analysis (Expected: Punisher, Immunity)\n";
const inoSRes = analyzeCharacter(inoS);
output += JSON.stringify(inoSRes.mechanics, null, 2) + "\n\n";

// Test 2: Anti-Synergy (Ino S + Shikamaru)
output += "3. Team Analysis: Ino (S) + Shikamaru (Expected: Warning about Stun + Punisher)\n";
const teamBad = [inoS, shikamaru];
const teamBadRes = analyzeTeam(teamBad);
output += "Warnings: " + JSON.stringify(teamBadRes.warnings, null, 2) + "\n";
output += "Synergy Score: " + teamBadRes.synergyScore + "\n\n";

// Test 3: Strategies
output += "4. Team Strategies (Expected: Trap & Punish)\n";
output += "Strategies: " + JSON.stringify(teamBadRes.strategies, null, 2) + "\n";

fs.writeFileSync('v2_verification_results.txt', output);
console.log("Verification complete. Results written to v2_verification_results.txt");
