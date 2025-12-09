import { recommendPartnersForMain, getSuggestions } from './src/utils/recommendationEngine.js'
import charactersData from './src/data/characters.json' assert { type: 'json' }

console.log('--- Testing Ino(B) Partner Recommendations ---\n')

// Find Ino (B)
const inoB = charactersData.find(c => c.name === 'Yamanaka Ino (B)')

if (!inoB) {
    console.error('ERROR: Could not find Yamanaka Ino (B) in character data!')
    process.exit(1)
}

console.log(`Testing build-around for: ${inoB.name} (ID: ${inoB.id})\n`)

// Test 1: recommendPartnersForMain (this is what should be called for single character)
console.log('=== Test 1: recommendPartnersForMain ===')
const partners = recommendPartnersForMain(inoB, charactersData, null, 10)

console.log('\nTop 10 recommended partners:')
partners.forEach((char, idx) => {
    console.log(`${idx + 1}. ${char.name.padEnd(30)} - Score: ${char.buildAroundScore} (${char.synergyScore})`)
    if (char.buildAroundNotes && char.buildAroundNotes.length > 0) {
        console.log(`   Reason: ${char.buildAroundNotes[0]}`)
    }
})

console.log('\n=== Test 2: getSuggestions (should use recommendPartnersForMain internally) ===')
const suggestions = getSuggestions(charactersData, [inoB], 10)

console.log('\nTop 10 suggestions via getSuggestions:')
suggestions.forEach((char, idx) => {
    console.log(`${idx + 1}. ${char.name.padEnd(30)} - Synergy Score: ${char.synergyScore}`)
})

// Check if basic starters are in top 5
const basicStarters = ['Uzumaki Naruto', 'Haruno Sakura', 'Uchiha Sasuke', 'Inuzuka Kiba', 'Aburame Shino']
const top5Names = suggestions.slice(0, 5).map(c => c.name)
const startersInTop5 = top5Names.filter(name => basicStarters.includes(name))

console.log('\n=== Analysis ===')
console.log(`Basic starters in top 5: ${startersInTop5.length > 0 ? startersInTop5.join(', ') : 'NONE ✓'}`)
console.log(`Score variation: ${suggestions[0].synergyScore} (highest) to ${suggestions[9].synergyScore} (10th)`)

if (startersInTop5.length > 0) {
    console.log('\n⚠️  WARNING: Still showing basic starters in top 5!')
} else {
    console.log('\n✓ SUCCESS: No basic starters in top 5!')
}

console.log('\n--- Test Complete ---')
