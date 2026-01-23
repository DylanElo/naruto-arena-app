import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import App from '../App'
import CollectionManager from '../components/CollectionManager'
import CounterBuilder from '../components/CounterBuilder'

// Mocks
vi.mock('../utils/assetPath', () => ({
  assetPath: (path) => path
}))

vi.mock('../utils/storage', () => ({
  safeGet: (key, fallback) => fallback,
  safeSet: () => true,
  safeRemove: () => true
}))

vi.mock('../utils/recommendationEngine', () => ({
  getSuggestions: () => [],
  analyzeTeam: () => ({ tempo: {}, missingCapabilities: [] }),
  recommendPartnersForMain: () => []
}))

vi.mock('../utils/collectionManager', () => ({
  loadCollection: () => [],
  initializeCollectionByLevel: () => [],
  getCollectionStats: () => ({ owned: 0, total: 0 })
}))

vi.mock('../utils/knowledgeEngine', () => ({
  getCharacterKnowledge: () => null
}))

vi.mock('../utils/metaBuilder', () => ({
  generateMetaTeams: () => [],
  getPlaystyleDescription: () => ''
}))

vi.mock('../utils/counterBuilder', () => ({
  buildCounterTeam: () => []
}))

const mockCharacters = [
  {
    id: 1,
    name: 'Naruto',
    skills: [{ energy: ['green'], classes: 'Physical,Instant', name: 'Punch', description: 'Hits hard' }],
    tags: []
  }
]

// Mock the JSON import correctly
vi.mock('../data/characters.json', () => ({
    default: [
      {
        id: 1,
        name: 'Naruto',
        skills: [{ energy: ['green'], classes: 'Physical,Instant', name: 'Punch', description: 'Hits hard' }],
        tags: []
      }
    ]
}))

describe('Security Input Limits', () => {

  it('App: Search input has maxLength 50', () => {
    render(<App />)
    const searchInput = screen.getByPlaceholderText(/Search archive.../i)
    expect(searchInput).toHaveAttribute('maxLength', '50')
  })

  it('App: Team Name input has maxLength 30', () => {
    render(<App />)
    const nameInput = screen.getByPlaceholderText(/Operation Name.../i)
    expect(nameInput).toHaveAttribute('maxLength', '30')
  })

  it('CollectionManager: Archive Search input has maxLength 50', () => {
     render(<CollectionManager
        allCharacters={mockCharacters}
        ownedIds={['1']}
        onToggle={() => {}}
        onBatchUpdate={() => {}}
    />)
    const searchInput = screen.getByPlaceholderText(/Search archive.../i)
    expect(searchInput).toHaveAttribute('maxLength', '50')
  })

  it('CounterBuilder: Search input has maxLength 50', () => {
      render(<CounterBuilder allCharacters={mockCharacters} />)
      const searchInput = screen.getByPlaceholderText(/Search characters.../i)
      expect(searchInput).toHaveAttribute('maxLength', '50')
  })
})
