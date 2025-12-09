import { calculateSynergy, analyzeCharacter } from './src/utils/recommendationEngine.js';

// Mock Data
const team = [
    {
        id: 1, name: "Naruto",
        skills: [
            { name: "Rasengan", description: "Deals damage.", classes: "Energy", energy: ["red"] },
            { name: "Shadow Clone", description: "Deals damage.", classes: "Physical", energy: ["green"] }
        ]
    },
    {
        id: 2, name: "Sakura",
        skills: [
            { name: "Heal", description: "Restores health.", classes: "Support", energy: ["white"] }
        ]
    }
];

const candidate = {
    id: 3, name: "Sasuke",
    skills: [
        { name: "Chidori", description: "Deals piercing damage.", classes: "Energy", energy: ["blue"] }, // Piercing
        { name: "Sharingan", description: "Enemy unable to reduce damage.", classes: "Strategic", energy: ["red"] } // Anti-Tank
    ]
};

console.log("--- Debugging Synergy Calculation ---");

// 1. Check analyzeCharacter output
console.log("Analyzing Sasuke...");
const analysis = analyzeCharacter(candidate);
console.log("Sasuke Mechanics:", JSON.stringify(analysis.mechanics));
console.log("Sasuke Mechanic Details:", JSON.stringify(analysis.mechanicDetails));

// 2. Check calculateSynergy
console.log("\nCalculating Synergy (Team + Sasuke)...");
try {
    const score = calculateSynergy(team, candidate);
    console.log("Synergy Score:", score);
} catch (error) {
    console.error("Error calculating synergy:", error);
}
