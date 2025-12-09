import {
    getSuggestions,
    analyzeTeam,
    recommendPartnersForMain,
    recommendCounterCandidatesByTags,
    analyzeCharacter
} from './src/utils/recommendationEngine.js'
import charactersData from './src/data/characters.json' with { type: 'json' }
import fs from 'fs'

console.log('='.repeat(80))
console.log('COMPREHENSIVE RECOMMENDATION ENGINE TEST SUITE')
console.log('='.repeat(80))

let output = ''
let passCount = 0
let failCount = 0

function logSection(title) {
    const section = `\n${'='.repeat(80)}\n${title}\n${'='.repeat(80)}\n`
    console.log(section)
    output += section
}

function logTest(name, passed, details = '') {
    const status = passed ? '✓ PASS' : '✗ FAIL'
    const emoji = passed ? '✓' : '✗'
    const line = `${emoji} ${name}: ${status}\n${details ? '  ' + details + '\n' : ''}`
    console.log(line)
    output += line
    if (passed) passCount++
    else failCount++
}

function log(message) {
    console.log(message)
    output += message + '\n'
}

// Helper to find character by name
function findChar(name) {
    return charactersData.find(c => c.name === name)
}

// ============================================================================
// TEST 1: BUILD-AROUND LOGIC
// ============================================================================
logSection('TEST 1: BUILD-AROUND SINGLE CHARACTER')

const testCharacters = [
    'Yamanaka Ino (B)',
    'Uchiha Sasuke',
    'Uzumaki Naruto',
    'Haruno Sakura (S)'
]

testCharacters.forEach(charName => {
    const char = findChar(charName)
    if (!char) {
        logTest(`Build-around: ${charName}`, false, 'Character not found')
        return
    }

    const partners = recommendPartnersForMain(char, charactersData, null, 10)

    // Test 1a: Should return results
    logTest(
        `Build-around ${charName}: Returns recommendations`,
        partners.length > 0,
        `Got ${partners.length} recommendations`
    )

    // Test 1b: No basic starters in top 5 (unless the main is a basic starter)
    const basicStarters = ['Uzumaki Naruto', 'Haruno Sakura', 'Uchiha Sasuke', 'Inuzuka Kiba', 'Aburame Shino']
    const isMainBasicStarter = basicStarters.includes(charName)

    if (!isMainBasicStarter) {
        const top5 = partners.slice(0, 5).map(p => p.name)
        const startersInTop5 = top5.filter(name => basicStarters.includes(name))
        logTest(
            `Build-around ${charName}: No basic starters in top 5`,
            startersInTop5.length === 0,
            startersInTop5.length > 0 ? `Found: ${startersInTop5.join(', ')}` : 'None found (good)'
        )
    }

    // Test 1c: Top recommendations should have synergy notes
    const top1 = partners[0]
    if (top1) {
        logTest(
            `Build-around ${charName}: Top pick has synergy notes`,
            top1.buildAroundNotes && top1.buildAroundNotes.length > 0,
            top1.buildAroundNotes ? `Notes: ${top1.buildAroundNotes[0]}` : 'No notes'
        )
    }

    log(`  Top 3 for ${charName}:`)
    partners.slice(0, 3).forEach((p, idx) => {
        log(`    ${idx + 1}. ${p.name} (Score: ${p.buildAroundScore})`)
    })
    log('')
})

// ============================================================================
// TEST 2: SYNERGY SCORING & NORMALIZATION
// ============================================================================
logSection('TEST 2: SYNERGY SCORING & NORMALIZATION')

// Test with a 2-character team
const twoCharTeam = [
    findChar('Uchiha Sasuke'),
    findChar('Uzumaki Naruto')
].filter(Boolean)

if (twoCharTeam.length === 2) {
    const suggestions = getSuggestions(charactersData, twoCharTeam, 15)

    // Test 2a: Returns results
    logTest(
        'Synergy scoring: Returns suggestions',
        suggestions.length > 0,
        `Got ${suggestions.length} suggestions`
    )

    // Test 2b: Scores are normalized 0-100
    const allScoresInRange = suggestions.every(s => s.synergyScore >= 0 && s.synergyScore <= 100)
    logTest(
        'Synergy scoring: Scores normalized (0-100)',
        allScoresInRange,
        `Range: ${Math.min(...suggestions.map(s => s.synergyScore))}-${Math.max(...suggestions.map(s => s.synergyScore))}`
    )

    // Test 2c: Scores show variation (not all the same)
    const uniqueScores = new Set(suggestions.map(s => s.synergyScore)).size
    logTest(
        'Synergy scoring: Scores show variation',
        uniqueScores > 3,
        `${uniqueScores} unique scores`
    )

    log(`  Top 5 suggestions for [Sasuke + Naruto]:`)
    suggestions.slice(0, 5).forEach((s, idx) => {
        log(`    ${idx + 1}. ${s.name} (Synergy: ${s.synergyScore})`)
    })
    log('')
}

// ============================================================================
// TEST 3: TEAM ANALYSIS & WARNINGS
// ============================================================================
logSection('TEST 3: TEAM ANALYSIS & WARNING DETECTION')

// Test 3a: Energy bottleneck detection
const blueHeavyTeam = charactersData.filter(c => {
    const blueCount = (c.skills || []).reduce((count, skill) => {
        return count + (skill.energy || []).filter(e => e && e.toLowerCase() === 'blue').length
    }, 0)
    return blueCount >= 3
}).slice(0, 3)

if (blueHeavyTeam.length === 3) {
    const analysis = analyzeTeam(blueHeavyTeam)
    const hasEnergyWarning = analysis.warnings.some(w => w.includes('energy'))
    logTest(
        'Team analysis: Detects energy bottleneck',
        hasEnergyWarning,
        hasEnergyWarning ? `Warning: ${analysis.warnings.find(w => w.includes('energy'))}` : 'No energy warning'
    )
}

// Test 3b: Low damage warning
const supportTeam = charactersData.filter(c => {
    const profile = analyzeCharacter(c)
    return profile.roles && profile.roles.support > 1
}).slice(0, 3)

if (supportTeam.length === 3) {
    const analysis = analyzeTeam(supportTeam)
    const hasWinConditionWarning = analysis.warnings.some(w => w.includes('win condition'))
    logTest(
        'Team analysis: Detects unclear win condition',
        hasWinConditionWarning || analysis.tempo.burstDamage < 80,
        `Burst damage: ${analysis.tempo.burstDamage}, Warnings: ${analysis.warnings.length}`
    )
}

// Test 3c: Role diversity check
const sampleTeam = [
    findChar('Uchiha Sasuke'),
    findChar('Uzumaki Naruto'),
    findChar('Haruno Sakura')
].filter(Boolean)

if (sampleTeam.length === 3) {
    const analysis = analyzeTeam(sampleTeam)

    logTest(
        'Team analysis: Provides synergy highlights',
        analysis.synergyHighlights && analysis.synergyHighlights.length > 0,
        `Highlights: ${analysis.synergyHighlights.length}`
    )

    logTest(
        'Team analysis: Provides strengths',
        analysis.strengths && analysis.strengths.length > 0,
        `Strengths: ${analysis.strengths.length}`
    )

    logTest(
        'Team analysis: Provides strategies',
        analysis.strategies && analysis.strategies.length > 0,
        `Strategies: ${analysis.strategies.length}`
    )

    log(`  Analysis for [Sasuke + Naruto + Sakura]:`)
    log(`    Synergy Score: ${analysis.synergyScore}`)
    log(`    Burst Damage: ${analysis.tempo.burstDamage}`)
    log(`    Pressure Rating: ${analysis.tempo.pressureRating}`)
    log(`    Highlights: ${analysis.synergyHighlights.join(', ') || 'None'}`)
    log(`    Warnings: ${analysis.warnings.join(', ') || 'None'}`)
    log('')
}

// ============================================================================
// TEST 4: COUNTER RECOMMENDATIONS
// ============================================================================
logSection('TEST 4: COUNTER RECOMMENDATIONS')

// Create an enemy team with specific mechanics
const enemyTeam = [
    findChar('Uchiha Sasuke'),
    findChar('Yamanaka Ino (S)'),
    findChar('Akimichi Chouji')
].filter(Boolean)

if (enemyTeam.length === 3) {
    const counters = recommendCounterCandidatesByTags(enemyTeam, charactersData, null, [], 10)

    logTest(
        'Counter builder: Returns counter suggestions',
        counters.length > 0,
        `Got ${counters.length} counter suggestions`
    )

    if (counters.length > 0) {
        const top1 = counters[0]
        logTest(
            'Counter builder: Provides counter explanations',
            top1.counterReasonByTags && top1.counterReasonByTags.length > 0,
            `Reason: ${top1.counterReasonByTags.substring(0, 60)}...`
        )

        log(`  Top 5 counters for enemy team:`)
        counters.slice(0, 5).forEach((c, idx) => {
            log(`    ${idx + 1}. ${c.name} (Score: ${c.counterScoreByTags})`)
            log(`       ${c.counterReasonByTags}`)
        })
        log('')
    }
}

// ============================================================================
// TEST 5: FLEXIBILITY SCORING
// ============================================================================
logSection('TEST 5: TEAM FLEXIBILITY')

const flexibleTeam = [
    findChar('Uchiha Sasuke'),  // DPS/Control
    findChar('Haruno Sakura'),  // Support
    findChar('Akimichi Chouji') // Tank
].filter(Boolean)

const rigidTeam = [
    findChar('Uzumaki Naruto'),
    findChar('Inuzuka Kiba'),
    findChar('Aburame Shino')
].filter(Boolean).slice(0, 3)

if (flexibleTeam.length === 3 && rigidTeam.length === 3) {
    const flexAnalysis = analyzeTeam(flexibleTeam)
    const rigidAnalysis = analyzeTeam(rigidTeam)

    const roleCountFlex = Object.values(flexAnalysis.roles).filter(v => v > 0).length
    const roleCountRigid = Object.values(rigidAnalysis.roles).filter(v => v > 0).length

    logTest(
        'Flexibility: Diverse team has more roles',
        roleCountFlex > roleCountRigid,
        `Flexible: ${roleCountFlex} roles, Rigid: ${roleCountRigid} roles`
    )

    log(`  Flexible team role distribution: ${JSON.stringify(flexAnalysis.roles)}`)
    log(`  Rigid team role distribution: ${JSON.stringify(rigidAnalysis.roles)}`)
    log('')
}

// ============================================================================
// SUMMARY
// ============================================================================
logSection('TEST SUMMARY')

const total = passCount + failCount
const passRate = total > 0 ? ((passCount / total) * 100).toFixed(1) : 0

log(`Total Tests: ${total}`)
log(`Passed: ${passCount}`)
log(`Failed: ${failCount}`)
log(`Pass Rate: ${passRate}%`)
log('')

if (failCount === 0) {
    log('🎉 ALL TESTS PASSED!')
} else {
    log(`⚠️  ${failCount} test(s) failed. Review output above.`)
}

// Write results to file
fs.writeFileSync('comprehensive_test_results.txt', output)
console.log('\nResults written to comprehensive_test_results.txt')
