import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from '../App'
import CounterBuilder from '../components/CounterBuilder'
import CollectionManager from '../components/CollectionManager'

// Mock data
vi.mock('../data/characters.json', () => ({
  default: [
    { id: '1', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Physical' }] },
    { id: '2', name: 'Sasuke', skills: [{ energy: ['blue'], classes: 'Energy' }] }
  ]
}))

// Mock heavy utils
vi.mock('../utils/recommendationEngine', () => ({
  analyzeTeam: () => ({ tempo: {}, missingCapabilities: [] }),
  getSuggestions: () => []
}))

// Mock asset path
vi.mock('../utils/assetPath', () => ({
  assetPath: (path) => path
}))

describe('Security Input Limits', () => {
  const mockCharacters = [
    { id: '1', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Physical' }] }
  ]

  it('App: Team Name input has maxLength 30', () => {
    render(<App />)
    const input = screen.getByPlaceholderText(/Operation Name/i)
    expect(input).toHaveAttribute('maxLength', '30')
  })

  it('App: Search input has maxLength 50', () => {
    render(<App />)
    const input = screen.getByPlaceholderText(/Search archive/i)
    expect(input).toHaveAttribute('maxLength', '50')
  })

  it('CounterBuilder: Search input has maxLength 50', () => {
    render(<CounterBuilder allCharacters={mockCharacters} />)
    const input = screen.getByPlaceholderText(/Search characters/i)
    expect(input).toHaveAttribute('maxLength', '50')
  })

  it('CollectionManager: Search input has maxLength 50', () => {
    // Provide owned ID so it skips setup screen and shows search
    const ownedIds = new Set(['1'])
    render(
      <CollectionManager
        allCharacters={mockCharacters}
        ownedIds={ownedIds}
        onToggle={() => {}}
        onBatchUpdate={() => {}}
      />
    )
    const input = screen.getByPlaceholderText(/Search archive/i)
    expect(input).toHaveAttribute('maxLength', '50')
  })
})
