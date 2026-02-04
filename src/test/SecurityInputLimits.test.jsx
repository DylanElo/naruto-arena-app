import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from '../App'
import CollectionManager from '../components/CollectionManager'
import CounterBuilder from '../components/CounterBuilder'

// --- MOCKS ---

vi.mock('../data/characters.json', () => ({
  default: [
    { id: 'naruto', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Offense' }], tags: ['Konoha'] },
    { id: 'sasuke', name: 'Sasuke', skills: [{ energy: ['blue'], classes: 'Offense' }], tags: ['Konoha'] }
  ]
}))

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
  safeSet: () => {}
}))

vi.mock('../utils/collectionManager', () => ({
  initializeCollectionByLevel: () => [],
  getCollectionStats: () => ({ owned: 0, total: 2 }),
  loadCollection: () => []
}))

vi.mock('../utils/knowledgeEngine', () => ({
  getCharacterKnowledge: () => null
}))

vi.mock('../utils/counterBuilder', () => ({
  buildCounterTeam: () => []
}))

// Mock child components for App test to simplify if needed,
// but we want to test inputs inside them if we render App.
// However, the plan is to test App inputs, and then separate component tests.
// So for App test, we focus on App's own inputs.
// For individual component tests, we test their inputs.

describe('Security Input Limits', () => {

  describe('App Component', () => {
    it('enforces maxLength on global search input', () => {
      render(<App />)
      const searchInput = screen.getByPlaceholderText('Search archive...')
      expect(searchInput).toHaveAttribute('maxLength', '50')
    })

    it('enforces maxLength on team name input', () => {
      render(<App />)
      const nameInput = screen.getByPlaceholderText('Operation Name...')
      expect(nameInput).toHaveAttribute('maxLength', '30')
    })
  })

  describe('CollectionManager Component', () => {
    it('enforces maxLength on collection search input', () => {
      const allCharacters = [{ id: 'naruto', name: 'Naruto', skills: [], tags: [] }]
      const ownedIds = ['naruto']
      render(<CollectionManager
        allCharacters={allCharacters}
        ownedIds={ownedIds}
        onToggle={() => {}}
        onBatchUpdate={() => {}}
      />)

      const searchInput = screen.getByPlaceholderText('Search archive...')
      expect(searchInput).toHaveAttribute('maxLength', '50')
    })
  })

  describe('CounterBuilder Component', () => {
    it('enforces maxLength on counter search input', () => {
        const allCharacters = [{ id: 'naruto', name: 'Naruto', skills: [], tags: [] }]
        render(<CounterBuilder allCharacters={allCharacters} />)

        const searchInput = screen.getByPlaceholderText('Search characters...')
        expect(searchInput).toHaveAttribute('maxLength', '50')
    })
  })
})
