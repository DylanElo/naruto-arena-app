
import { analyzeCharacter } from '../src/utils/recommendationEngine.js';
import unifiedData from '../src/data/characters_unified.json' with { type: 'json' };
const { characters } = unifiedData;

function verify() {
    console.log('Verifying Hybrid Engine...');

    // 1. Find a "True" character (e.g. Ino)
    const ino = characters.find(c => c.name === 'Yamanaka Ino' || c.name === 'Ino Yamanaka');
    if (!ino) {
        console.error('Ino not found');
        process.exit(1);
    }

    console.log(`Analyzing ${ino.name} (True Mechanics: ${!!ino.trueMechanics})...`);
    const analysisIno = analyzeCharacter(ino);

    // Ino should have "mental" / "stun" mechanics from True Data
    // Skill.classes = [Mental] -> Stun
    console.log('Ino Mechanics:', analysisIno.mechanics.stun > 0 ? 'PASS (Has Stun)' : 'FAIL', analysisIno.mechanics);
    console.log('Ino Dependencies:', analysisIno.knowledge.dependencies);

    // 2. Find an "Inferred" character (e.g. Uzumaki Naruto (S))
    // Wait, Naruto (S) was in the "Exclusive" list.
    const narutoS = characters.find(c => c.name === 'Uzumaki Naruto (S)');
    if (!narutoS) {
        console.error('Naruto (S) not found');
    } else {
        console.log(`Analyzing ${narutoS.name} (True Mechanics: ${!!narutoS.trueMechanics})...`);
        const analysisNaruto = analyzeCharacter(narutoS);
        console.log('Naruto (S) Mechanics:', analysisNaruto.mechanics);
        console.log('Naruto (S) Dependencies:', analysisNaruto.knowledge.dependencies);
    }

    console.log('Evaluation Complete');
}


async function analyzeCoverage() {
    console.log('--- Analyzing User Example Team (Coverage) ---');
    const teamNames = ['Delta', 'Kashin Koji', 'Yamanaka Ino (S)'];

    // Helper to find loosely
    const find = (n) => characters.find(c => c.name.toLowerCase().includes(n.toLowerCase()));

    const team = teamNames.map(n => find(n)).filter(Boolean);

    if (team.length < 3) {
        console.log('Could not find all characters:', teamNames, 'Found:', team.map(c => c.name));
    }

    const combinedMechanics = {};
    const capabilities = new Set();

    team.forEach(char => {
        const analysis = analyzeCharacter(char);
        console.log(`\n[${char.name}]`);
        console.log('Mechanics:', JSON.stringify(analysis.mechanics));

        Object.keys(analysis.mechanics).forEach(key => {
            if (analysis.mechanics[key] > 0) {
                combinedMechanics[key] = (combinedMechanics[key] || 0) + analysis.mechanics[key];
                capabilities.add(key);
            }
        });

        // Also check dependencies/classes for specific tags like "Reveal" or "Anti-Heal"
        if (char.trueMechanics) {
            char.trueMechanics.skills.forEach(s => {
                (s.classes || []).forEach(c => console.log(`  - Class: ${c}`));
            });
        }
    });

    console.log('\n--- Team Capabilities ---');
    console.log(Array.from(capabilities).sort().join(', '));

    // Calculate real synergy using updated engine
    const { analyzeTeam } = await import('../src/utils/recommendationEngine.js');
    const analysis = analyzeTeam(team);
    // Test Bad Coverage Team (e.g., 3 Nukers)
    console.log('\n--- Analyzing Weak Coverage Team ---');
    // Using random names that imply pure damage if possible, or just re-using knowns
    const weakTeam = [
        find('Deidara'),
        find('Hidan'),
        find('Kakuzu')
    ].filter(Boolean);

    if (weakTeam.length === 3) {
        const weakAnalysis = analyzeTeam(weakTeam);
        console.log('Weak Team Synergy Score:', weakAnalysis.synergyScore);
        console.log('Missing Capabilities:', weakAnalysis.missingCapabilities);
    } else {
        console.log('Could not find weak team members.');
    }
}

analyzeCoverage();

