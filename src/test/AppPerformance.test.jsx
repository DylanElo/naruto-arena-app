import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, vi, expect, beforeEach } from 'vitest'
import App from '../App'
import { getSuggestions, analyzeTeam } from '../utils/recommendationEngine'

// Mock characters data
vi.mock('../data/characters.json', () => ({
  default: [
    { id: '1', name: 'CharOne', skills: [{ energy: ['red'], classes: 'Melee', description: 'Attack' }], tags: [] },
    { id: '2', name: 'CharTwo', skills: [{ energy: ['blue'], classes: 'Range', description: 'Fireball' }], tags: [] },
  ]
}))

// Mock recommendation engine
vi.mock('../utils/recommendationEngine', () => ({
  getSuggestions: vi.fn(() => []),
  analyzeTeam: vi.fn(() => ({
      tempo: { pressureRating: 0, estimatedKillTurns: 0 },
      missingCapabilities: [],
      mechanics: {},
      roles: {}
  })),
  recommendPartnersForMain: vi.fn(() => []),
}))

// Mock storage
vi.mock('../utils/storage', () => ({
  safeGet: vi.fn((key, defaultVal) => defaultVal),
  safeSet: vi.fn(),
  safeRemove: vi.fn()
}))

// Mock assetPath
vi.mock('../utils/assetPath', () => ({
  assetPath: (path) => path
}))

describe('App Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not recalculate suggestions when toggling collection in collection view', async () => {
    render(<App />)

    // Initial render in 'builder' tab triggers calculations
    expect(getSuggestions).toHaveBeenCalled()
    expect(analyzeTeam).toHaveBeenCalled()

    vi.clearAllMocks()

    // Switch to Collection tab
    const collectionTab = screen.getByText('collection')
    fireEvent.click(collectionTab)

    // Handle Setup Screen if present (it appears when owned list is empty)
    try {
      const skipButton = await screen.findByText('Skip')
      fireEvent.click(skipButton)
    } catch {
      // If skip button not found, maybe we are already in the view (shouldn't happen with clean mock but safe to try)
    }

    // Wait for Collection view to appear
    await waitFor(() => {
        expect(screen.getByText('Your Arsenal')).toBeInTheDocument()
    })

    // Find a character to toggle (CharOne)
    // CollectionCard usually renders the name or image. We can find by text.
    const charCard = screen.getByText('CharOne')
    fireEvent.click(charCard)

    // This updates ownedCharacters state in App.
    // We expect NO calls to recommendation engine because we are in collection tab
    expect(getSuggestions).not.toHaveBeenCalled()
    // analyzeTeam depends on selectedTeam, which didn't change, but good to check stability
    expect(analyzeTeam).not.toHaveBeenCalled()
  })
})
