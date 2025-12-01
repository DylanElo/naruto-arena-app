import { analyzeCharacter, analyzeTeam } from './src/utils/recommendationEngine.js';
import fs from 'fs';

// --- MOCK DATA ---
const sasuke = {
    id: 3,
    name: "Uchiha Sasuke",
    skills: [
        { name: "Lion Combo", description: "Deals damage.", classes: "Physical" },
        { name: "Chidori", description: "Deals piercing damage.", classes: "Energy" }, // Piercing
        { name: "Sharingan", description: "Enemy unable to reduce damage.", classes: "Strategic" }, // Anti-Tank
        { name: "Swift Block", description: "Invulnerable for 1 turn.", classes: "Strategic,Instant" } // Immunity
    ]
};

const inoS = {
    id: 109,
    name: "Yamanaka Ino (S)",
    skills: [
        { name: "Mind Destruction", description: "Deals damage.", classes: "Mental" },
        { name: "Mind Body Switch", description: "Stuns enemy.", classes: "Strategic" }, // Stun
        { name: "Chakra Hair Trap", description: "If enemy uses a new skill...", classes: "Strategic" }, // Punisher
        { name: "Ino Block", description: "Invulnerable for 1 turn.", classes: "Strategic,Instant" } // Immunity
    ]
};

const shikamaru = {
    id: 7,
    name: "Nara Shikamaru",
    skills: [
        { name: "Shadow Imitation", description: "Stuns all enemies.", classes: "Control" } // Stun
    ]
};

// --- VERIFICATION LOGIC ---

const results = [];

results.push("--- V3 Engine Verification (Evidence-Based) ---\n");

// 1. Team Analysis: Ino (S) + Shikamaru
// Expected: "Excellent crowd control (Nara Shikamaru: Shadow Imitation, Yamanaka Ino (S): Mind Body Switch)"
const team = [inoS, shikamaru];
const teamAnalysis = analyzeTeam(team);

results.push("1. Team Strengths (Expected: Evidence of Stun/Control)");
results.push(JSON.stringify(teamAnalysis.strengths, null, 2));

results.push("\n2. Team Strategies (Expected: Evidence of Punisher)");
results.push(JSON.stringify(teamAnalysis.strategies, null, 2));

// 2. Sasuke Analysis
// Expected: "Shield Breaker (Anti-Tank) (Uchiha Sasuke: Sharingan)"
const sasukeTeam = [sasuke];
const sasukeAnalysis = analyzeTeam(sasukeTeam);

results.push("\n3. Sasuke Strengths (Expected: Evidence of Anti-Tank/Piercing)");
results.push(JSON.stringify(sasukeAnalysis.strengths, null, 2));


// Write results
fs.writeFileSync('v3_verification_results.txt', results.join('\n'));
console.log("Verification complete. Results written to v3_verification_results.txt");
