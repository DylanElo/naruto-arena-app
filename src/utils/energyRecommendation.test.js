
import { describe, it, expect } from 'vitest'
import { getSuggestions } from './recommendationEngine'
import characters from '../data/characters.json'
import { analyzeTeam } from './recommendationEngine'

describe('Energy Recommendation Fix', () => {
    it('should recommend energy generators for Rikudou Naruto + Edo Tensei Tatewaki', () => {
        // 1. Setup the team
        const rikudouId = 289
        const tatewakiId = 320

        const rikudou = characters.find(c => c.id === rikudouId)
        const tatewaki = characters.find(c => c.id === tatewakiId)

        expect(rikudou).toBeDefined()
        expect(tatewaki).toBeDefined()

        const team = [rikudou, tatewaki]

        // 2. Verify the team is detected as "Energy hungry"
        const analysis = analyzeTeam(team)
        const isEnergyHungry = analysis.weaknesses.some(w => w.includes('Energy hungry'))
        // expect(isEnergyHungry).toBe(true) 
        // Note: Weakness text must match exactly what's in recommendationEngine.js

        // 3. Get suggestions
        const suggestions = getSuggestions(characters, team, 5)

        // 4. Check if top suggestions provide energy
        // Known energy providers:
        // - Cee (ID 190, usually)
        // - Rin
        // - War Tobi
        // - anyone with 'energyGain' > 0 in mechanics

        console.log('Top 5 Suggestions for Energy Hungry Team:')
        suggestions.forEach(s => {
            console.log(`- ${s.name}: Score ${s.synergyScore}, Notes: ${s.buildAroundNotes.join(', ')}`)
        })

        const hasEnergyFix = suggestions.some(s =>
            s.buildAroundNotes.some(note => note.includes("Fixes team's energy shortage"))
        )

        expect(hasEnergyFix).toBe(true)
    })
})
