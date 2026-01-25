import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from '../App'
import CollectionManager from '../components/CollectionManager'
import CounterBuilder from '../components/CounterBuilder'

// Hoist mock data so it's available for vi.mock factories
const { mockCharacters } = vi.hoisted(() => {
  return {
    mockCharacters: [
      { id: 'naruto', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Attack' }], tags: [] }
    ]
  }
})

// Mock the json import
vi.mock('../data/characters.json', () => ({
  default: mockCharacters
}))

// Mock recommendation engine
vi.mock('../utils/recommendationEngine', () => ({
  getSuggestions: () => [],
  analyzeTeam: () => ({ tempo: {}, missingCapabilities: [] }),
  recommendPartnersForMain: () => []
}))

// Mock asset path
vi.mock('../utils/assetPath', () => ({
  assetPath: (path) => path
}))

// Mock collection manager
vi.mock('../utils/collectionManager', () => ({
  initializeCollectionByLevel: () => [],
  getCollectionStats: () => ({ owned: 0, total: 1, percentage: 0 }),
  loadCollection: () => [],
  saveCollection: () => {},
  toggleCharacter: () => []
}))

// Mock knowledge engine
vi.mock('../utils/knowledgeEngine', () => ({
  getCharacterKnowledge: () => ({ profile: { mechanics: {} } })
}))

describe('Security Input Limits', () => {
  it('App: Search input has maxLength', () => {
    render(<App />)
    const searchInput = screen.getByPlaceholderText(/Search archive/i)
    expect(searchInput).toHaveAttribute('maxLength', '50')
  })

  it('App: Team name input has maxLength', () => {
    render(<App />)
    const nameInput = screen.getByPlaceholderText(/Operation Name/i)
    expect(nameInput).toHaveAttribute('maxLength', '30')
  })

  it('CollectionManager: Search input has maxLength', () => {
    render(
      <CollectionManager
        allCharacters={mockCharacters}
        ownedIds={['naruto']}
        onToggle={() => {}}
        onBatchUpdate={() => {}}
      />
    )
    const searchInput = screen.getByPlaceholderText(/Search archive/i)
    expect(searchInput).toHaveAttribute('maxLength', '50')
  })

  it('CounterBuilder: Search input has maxLength', () => {
    render(<CounterBuilder allCharacters={mockCharacters} />)
    const searchInput = screen.getByPlaceholderText(/Search characters/i)
    expect(searchInput).toHaveAttribute('maxLength', '50')
  })
})
