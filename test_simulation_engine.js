/**
 * TEST: Naruto Arena Simulation Engine
 * Demonstrates the damage calculation hierarchy and analysis
 */

import { GameState, Character, DamageType } from './src/engine/models.js';
import { calculateOutcome, applyDestructibleDefense } from './src/engine/resolution.js';
import { analyzeGameState, findBestMove } from './src/engine/analyzer.js';
import fs from 'fs';

// Load character data
const charactersData = JSON.parse(
    fs.readFileSync('./src/data/characters.json', 'utf-8')
);

console.log('='.repeat(60));
console.log('NARUTO ARENA - SIMULATION ENGINE TEST');
console.log('='.repeat(60));

// Test 1: Data Model Parsing
console.log('\n📦 TEST 1: Character Data Parsing');
console.log('-'.repeat(60));

const sasuke = new Character(charactersData.find(c => c.name === 'Uchiha Sasuke'));
console.log(`✓ Loaded: ${sasuke.name}`);
console.log(`  Skills: ${sasuke.skills.length}`);
sasuke.skills.forEach((skill, i) => {
    console.log(`  ${i + 1}. ${skill.name}: ${skill.damage} dmg (${skill.damageType})`);
});

// Test 2: Damage Calculation Hierarchy
console.log('\n⚔️  TEST 2: Damage Calculation Hierarchy');
console.log('-'.repeat(60));

const attacker = new Character(charactersData.find(c => c.name === 'Uchiha Sasuke'));
const defender = new Character(charactersData.find(c => c.name === 'Hyuuga Neji'));

// Give defender some defense
applyDestructibleDefense(defender, 20);
defender.statusEffects.damageReduction = 10;

console.log(`\nDefender State:`);
console.log(`  HP: ${defender.hp}`);
console.log(`  Damage Reduction: ${defender.statusEffects.damageReduction}`);
console.log(`  Destructible Defense: ${defender.statusEffects.destructibleDefense}`);

// Test Normal Damage
const normalSkill = attacker.skills.find(s => s.damageType === DamageType.NORMAL && s.damage > 0);
if (normalSkill) {
    console.log(`\n1️⃣ NORMAL DAMAGE: ${normalSkill.name} (${normalSkill.damage} dmg)`);
    const result1 = calculateOutcome(attacker, defender, normalSkill);
    console.log(`   Formula: ${normalSkill.damage} - ${defender.statusEffects.damageReduction} (reduction) = ${normalSkill.damage - defender.statusEffects.damageReduction}`);
    console.log(`   Defense absorbs: ${result1.defenseRemoved}`);
    console.log(`   HP damage: ${result1.damageDealt}`);
    console.log(`   → Defender HP: ${defender.hp}`);
}

// Reset defender
defender.hp = 100;
applyDestructibleDefense(defender, 20);

// Test Piercing Damage
const piercingSkill = attacker.skills.find(s => s.damageType === DamageType.PIERCING);
if (piercingSkill) {
    console.log(`\n2️⃣ PIERCING DAMAGE: ${piercingSkill.name} (${piercingSkill.damage} dmg)`);
    const result2 = calculateOutcome(attacker, defender, piercingSkill);
    console.log(`   Ignores damage reduction!`);
    console.log(`   Defense absorbs: ${result2.defenseRemoved}`);
    console.log(`   HP damage: ${result2.damageDealt}`);
    console.log(`   → Defender HP: ${defender.hp}`);
}

// Test 3: Game State Analysis
console.log('\n📊 TEST 3: Game State Analysis');
console.log('-'.repeat(60));

const gameState = new GameState();

// Setup Team A
const neji = new Character(charactersData.find(c => c.name === 'Hyuuga Neji'));
const naruto = new Character(charactersData.find(c => c.name === 'Uzumaki Naruto'));
const sakura = new Character(charactersData.find(c => c.name === 'Haruno Sakura'));

gameState.teams[0] = [neji, naruto, sakura];

// Setup Team B (damage them a bit)
const itachi = new Character(charactersData.find(c => c.name === 'Uchiha Itachi'));
const kisame = new Character(charactersData.find(c => c.name === 'Hoshigaki Kisame'));
const deidara = new Character(charactersData.find(c => c.name === 'Deidara'));

itachi.hp = 70;
kisame.hp = 60;

gameState.teams[1] = [itachi, kisame, deidara];

console.log('\nTeam A:');
gameState.teams[0].forEach(c => console.log(`  ${c.name}: ${c.hp} HP`));

console.log('\nTeam B:');
gameState.teams[1].forEach(c => console.log(`  ${c.name}: ${c.hp} HP`));

const analysis = analyzeGameState(gameState, 0);

console.log('\n📈 Analysis Metrics (Team A perspective):');
console.log(`  HP Delta: ${analysis.hpDelta}`);
console.log(`  Energy Efficiency: ${analysis.energyEfficiency.toFixed(1)}`);
console.log(`  Cooldown Pressure: ${analysis.cooldownPressure}`);
console.log(`  Kill Threat: ${analysis.killThreat}`);
console.log(`  Overall Score: ${analysis.overallScore.toFixed(1)}`);

// Test 4: Best Move Finder
console.log('\n🎯 TEST 4: Best Move Finder');
console.log('-'.repeat(60));

const bestMove = findBestMove(gameState, 0);

if (bestMove.characterIndex >= 0) {
    const char = gameState.teams[0][bestMove.characterIndex];
    const skill = char.skills[bestMove.skillIndex];
    const target = gameState.teams[1][bestMove.targetIndex];

    console.log(`\n✨ Best Move:`);
    console.log(`  Character: ${char.name}`);
    console.log(`  Skill: ${skill.name} (${skill.damage} ${skill.damageType} damage)`);
    console.log(`  Target: ${target.name} (${target.hp} HP)`);
    console.log(`  Expected Value: ${bestMove.expectedValue}`);
} else {
    console.log('No valid moves available');
}

console.log('\n' + '='.repeat(60));
console.log('✅ ALL TESTS COMPLETE');
console.log('='.repeat(60));
