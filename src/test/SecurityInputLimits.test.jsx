import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from '../App'
import CounterBuilder from '../components/CounterBuilder'
import CollectionManager from '../components/CollectionManager'

// --- Mocks ---

// Data
vi.mock('../data/characters.json', () => ({
  default: [
    { id: '1', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Attack' }], tags: ['Konoha'] },
    { id: '2', name: 'Sasuke', skills: [{ energy: ['blue'], classes: 'Defense' }], tags: ['Rogue'] }
  ]
}))

// Utils
vi.mock('../utils/recommendationEngine', () => ({
  getSuggestions: () => [],
  analyzeTeam: () => ({ tempo: {}, missingCapabilities: [] }),
  recommendPartnersForMain: () => []
}))

vi.mock('../utils/assetPath', () => ({
  assetPath: (path) => path
}))

vi.mock('../utils/storage', () => ({
  safeGet: (key, def) => def,
  safeSet: vi.fn()
}))

vi.mock('../utils/collectionManager', () => ({
  initializeCollectionByLevel: () => [],
  getCollectionStats: () => ({ owned: 1, total: 2 }),
  loadCollection: () => ['1'],
  saveCollection: vi.fn(),
  toggleCharacter: vi.fn()
}))

vi.mock('../utils/counterBuilder', () => ({
  buildCounterTeam: () => []
}))

vi.mock('../utils/knowledgeEngine', () => ({
  getCharacterKnowledge: () => ({ mechanics: {} })
}))

vi.mock('../utils/metaBuilder', () => ({
    generateMetaTeams: () => [],
    getPlaystyleDescription: () => 'Balanced'
}))

// Mock CollectionCard to avoid complex rendering
vi.mock('../components/CollectionCard', () => ({
  default: () => <div data-testid="collection-card">Card</div>
}))

describe('Security Input Limits', () => {
  it('App: Search input has maxLength', () => {
    render(<App />)
    const searchInput = screen.getByPlaceholderText(/Search archive/i)
    expect(searchInput).toHaveAttribute('maxLength', '50')
  })

  it('App: Team Name input has maxLength', () => {
    render(<App />)
    const nameInput = screen.getByPlaceholderText(/Operation Name/i)
    expect(nameInput).toHaveAttribute('maxLength', '30')
  })
})

describe('CounterBuilder Input Limits', () => {
   const mockChars = [
    { id: '1', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Attack' }], tags: ['Konoha'] }
   ]

   it('Search input has maxLength', () => {
     render(<CounterBuilder allCharacters={mockChars} />)
     const searchInput = screen.getByPlaceholderText(/Search characters/i)
     expect(searchInput).toHaveAttribute('maxLength', '50')
   })
})

describe('CollectionManager Input Limits', () => {
    const mockChars = [
        { id: '1', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Attack' }], tags: ['Konoha'] }
    ]

    it('Search input has maxLength', () => {
        // Pass a Set with items to bypass setup screen
        const ownedSet = new Set(['1'])
        render(<CollectionManager allCharacters={mockChars} ownedIds={ownedSet} onToggle={()=>{}} onBatchUpdate={()=>{}} />)

        const searchInput = screen.getByPlaceholderText(/Search archive/i)
        expect(searchInput).toHaveAttribute('maxLength', '50')
    })
})
