import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from '../App'
import CollectionManager from '../components/CollectionManager'
import CounterBuilder from '../components/CounterBuilder'

// Hoist mock data for use in vi.mock
const { mockCharacters } = vi.hoisted(() => ({
  mockCharacters: [
    { id: '1', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Attack' }], tags: ['Konoha'] },
    { id: '2', name: 'Sasuke', skills: [{ energy: ['blue'], classes: 'Defense' }], tags: ['Konoha'] }
  ]
}))

vi.mock('../data/characters.json', () => ({
  default: mockCharacters
}))

// Mock recommendation engine
vi.mock('../utils/recommendationEngine', () => ({
  getSuggestions: () => [],
  analyzeTeam: () => ({
    tempo: { pressureRating: 0, estimatedKillTurns: 0 },
    missingCapabilities: []
  }),
  recommendPartnersForMain: () => []
}))

// Mock storage
vi.mock('../utils/storage', () => ({
  safeGet: (key, fallback) => fallback,
  safeSet: vi.fn(),
  safeRemove: vi.fn()
}))

// Mock collection manager utils
vi.mock('../utils/collectionManager', () => ({
  initializeCollectionByLevel: () => [],
  getCollectionStats: () => ({ owned: 0, total: 2 }),
  loadCollection: () => []
}))

// Mock counter builder utils
vi.mock('../utils/counterBuilder', () => ({
    buildCounterTeam: () => []
}))

// Mock meta builder utils (implicit dependency if any)
vi.mock('../utils/metaBuilder', () => ({
    generateMetaTeams: () => [],
    getPlaystyleDescription: () => ''
}))

// Mock knowledge engine
vi.mock('../utils/knowledgeEngine', () => ({
    getCharacterKnowledge: () => null
}))


describe('Security Input Limits', () => {
  it('App: Search archive input has max length', () => {
    render(<App />)
    const input = screen.getByLabelText(/Search archive/i)
    expect(input).toHaveAttribute('maxLength', '50')
  })

  it('App: Team Name input has max length', () => {
    render(<App />)
    // Note: The label is sr-only "Operation Name"
    const input = screen.getByLabelText(/Operation Name/i)
    expect(input).toHaveAttribute('maxLength', '30')
  })

  it('CollectionManager: Search archive input has max length', () => {
    // Pass ownedIds with content to bypass setup screen
    render(<CollectionManager allCharacters={mockCharacters} ownedIds={['1']} onToggle={() => {}} onBatchUpdate={() => {}} />)
    const input = screen.getByLabelText(/Search archive/i)
    expect(input).toHaveAttribute('maxLength', '50')
  })

  it('CounterBuilder: Search characters input has max length', () => {
    render(<CounterBuilder allCharacters={mockCharacters} />)
    const input = screen.getByLabelText(/Search characters/i)
    expect(input).toHaveAttribute('maxLength', '50')
  })
})
