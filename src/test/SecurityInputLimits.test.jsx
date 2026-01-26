import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from '../App'
import CollectionManager from '../components/CollectionManager'
import CounterBuilder from '../components/CounterBuilder'

// Only mock leaf components or heavy internal logic
vi.mock('../components/CollectionCard', () => ({
  default: () => <div data-testid="mock-collection-card" />
}))

// Mock recommendation engine to avoid heavy calculation in App
vi.mock('../utils/recommendationEngine', () => ({
  getSuggestions: () => [],
  analyzeTeam: () => ({
    missingCapabilities: [],
    tempo: { pressureRating: 0, estimatedKillTurns: 0 }
  }),
  recommendPartnersForMain: () => []
}))

// Mock character data if needed, but App imports JSON directly.
// We can assume it works or mock the JSON import if we could (vite handles json).

const mockCharacters = [
  { id: 'naruto', name: 'Naruto', skills: [] },
  { id: 'sasuke', name: 'Sasuke', skills: [] }
]

describe('Security Input Limits', () => {
  describe('App Component (Builder View)', () => {
    it('enforces maxLength on global search input', () => {
      render(<App />)
      const searchInput = screen.getByPlaceholderText(/search archive/i)
      expect(searchInput).toHaveAttribute('maxLength', '50')
    })

    it('enforces maxLength on team name input', () => {
      render(<App />)
      const nameInput = screen.getByPlaceholderText(/operation name/i)
      expect(nameInput).toHaveAttribute('maxLength', '30')
    })
  })

  describe('CollectionManager Component', () => {
    it('enforces maxLength on search and level inputs', () => {
      render(
        <CollectionManager
          allCharacters={mockCharacters}
          ownedIds={[]}
          onToggle={() => {}}
          onBatchUpdate={() => {}}
        />
      )

      // Should show setup first because ownedIds is empty
      const levelInput = screen.getByPlaceholderText(/enter level/i)
      expect(levelInput).toHaveAttribute('maxLength', '2')

      // Switch to main view
      const skipButton = screen.getByText(/skip/i)
      fireEvent.click(skipButton)

      const searchInput = screen.getByPlaceholderText(/search archive/i)
      expect(searchInput).toHaveAttribute('maxLength', '50')
    })
  })

  describe('CounterBuilder Component', () => {
    it('enforces maxLength on character search input', () => {
        render(<CounterBuilder allCharacters={mockCharacters} />)
        const searchInput = screen.getByPlaceholderText(/search characters/i)
        expect(searchInput).toHaveAttribute('maxLength', '50')
    })
  })
})
