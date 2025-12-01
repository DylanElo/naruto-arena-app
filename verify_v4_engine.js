import { analyzeTeam, analyzeCharacter } from './src/utils/recommendationEngine.js';

console.log("--- V4 Engine Verification (Energy Flexibility & Advanced Mechanics) ---\n");

// Test Case 1: Energy Efficient Team (Low-cost skills)
const flexibleTeam = [
    {
        id: 1, name: "Naruto",
        skills: [
            { name: "Punch", description: "Deals damage.", classes: "Physical", energy: ["green"] }, // 1 cost
            { name: "Shadow Clone", description: "Deals damage.", classes: "Physical", energy: ["none"] }, // 0 cost
            { name: "Rasengan", description: "Deals 45 damage and stuns.", classes: "Energy", energy: ["red", "blue"] } // 2 cost
        ]
    },
    {
        id: 2, name: "Sakura",
        skills: [
            { name: "Heal", description: "Restores health.", classes: "Support", energy: ["white"] }, // 1 cost
            { name: "Punch", description: "Deals damage.", classes: "Physical", energy: ["green"] } // 1 cost
        ]
    },
    {
        id: 3, name: "Shikamaru",
        skills: [
            { name: "Shadow Imitation", description: "Stuns enemy.", classes: "Strategic", energy: ["none"] }, // 0 cost
            { name: "Shadow Strangle", description: "Deals damage.", classes: "Energy", energy: ["red"] } // 1 cost
        ]
    }
];

console.log("Test Case 1: Energy Efficient Team");
const flexResult = analyzeTeam(flexibleTeam);
console.log("Strengths:", flexResult.strengths);
console.log("Warnings:", flexResult.warnings);
console.log("Synergy Score:", flexResult.synergyScore);
console.log("Expected: 'Energy Efficient' + 'High Action Consistency' strengths\n");

// Test Case 2: Expensive/Rigid Team (All expensive Blue skills)
const rigidTeam = [
    {
        id: 4, name: "BlueChar1",
        skills: [
            { name: "Big Spell", description: "Deals damage.", classes: "Energy", energy: ["blue", "blue", "red"] }, // 3 cost
            { name: "Huge Spell", description: "Deals damage.", classes: "Energy", energy: ["blue", "blue"] } // 2 cost
        ]
    },
    {
        id: 5, name: "BlueChar2",
        skills: [
            { name: "Mega Spell", description: "Deals damage.", classes: "Energy", energy: ["blue", "red", "white"] }, // 3 cost
            { name: "Ultra Spell", description: "Deals damage.", classes: "Energy", energy: ["blue", "blue"] } // 2 cost
        ]
    },
    {
        id: 6, name: "BlueChar3",
        skills: [
            { name: "Epic Spell", description: "Deals damage.", classes: "Energy", energy: ["blue", "red"] } // 2 cost
        ]
    }
];

console.log("Test Case 2: Expensive/Rigid Team");
const rigidResult = analyzeTeam(rigidTeam);
console.log("Strengths:", rigidResult.strengths);
console.log("Warnings:", rigidResult.warnings);
console.log("Synergy Score:", rigidResult.synergyScore);
console.log("Expected: '⚠️ High Energy Requirements' + '⚠️ Energy Bottleneck' warnings\n");

// Test Case 3: Setup/Achievement Team
const setupTeam = [
    {
        id: 7, name: "Atsui",
        skills: [
            { name: "Kenjutsu Fire Release", description: "For 3 turns, Atsui will have damage reduction.", classes: "Affliction,Instant", energy: ["blue"], cooldown: 4 }, // Setup
            { name: "Fire Wall", description: "Deals damage.", classes: "Energy", energy: ["red"] }
        ]
    },
    {
        id: 8, name: "Ino (B)",
        skills: [
            { name: "Achievement: Unsearchable Mind", description: "Achievement: If Ino uses any skill...", classes: "Achievement,Instant", energy: ["none"], cooldown: 0 }, // Achievement
            { name: "Mind Transfer", description: "Stuns enemy.", classes: "Strategic", energy: ["white"] }
        ]
    },
    {
        id: 9, name: "Tank",
        skills: [
            { name: "Block", description: "Makes tank invulnerable for 2 turns.", classes: "Strategic,Instant", energy: ["black"] } // Immunity
        ]
    }
];

console.log("Test Case 3: Setup/Achievement Team");
const setupResult = analyzeTeam(setupTeam);
console.log("Strengths:", setupResult.strengths);
console.log("Synergy Score:", setupResult.synergyScore);
console.log("Expected: 'Setup Archetype' + 'Achievement Potential' insights\n");

console.log("--- V4 Verification Complete ---");
