import { analyzeCharacter, analyzeTeam } from './src/utils/recommendationEngine.js';
import fs from 'fs';

// --- MOCK DATA ---
const sasuke = {
    id: 3,
    name: "Uchiha Sasuke",
    skills: [
        { name: "Lion Combo", description: "Deals damage.", classes: "Physical", cooldown: 0 },
        { name: "Chidori", description: "Deals piercing damage.", classes: "Energy", cooldown: 1 }, // Piercing
        { name: "Sharingan", description: "Enemy unable to reduce damage.", classes: "Strategic", cooldown: 4 }, // Anti-Tank
        { name: "Swift Block", description: "Invulnerable for 1 turn.", classes: "Strategic,Instant", cooldown: 4 } // Immunity (Basic)
    ]
};

const inoS = {
    id: 109,
    name: "Yamanaka Ino (S)",
    skills: [
        { name: "Mind Destruction", description: "Deals damage.", classes: "Mental", cooldown: 0 },
        { name: "Mind Body Switch", description: "Stuns enemy.", classes: "Strategic", cooldown: 4 }, // Stun
        { name: "Chakra Hair Trap", description: "If enemy uses a new skill...", classes: "Strategic", cooldown: 1 }, // Punisher
        { name: "Ino Block", description: "Invulnerable for 1 turn.", classes: "Strategic,Instant", cooldown: 4 } // Immunity (Basic)
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
