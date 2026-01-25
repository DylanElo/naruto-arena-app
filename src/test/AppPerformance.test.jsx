import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../App'
import * as recommendationEngine from '../utils/recommendationEngine'

// Mock the heavy functions to spy on them and return dummy data to speed up tests
vi.mock('../utils/recommendationEngine', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getSuggestions: vi.fn(() => []), // Return empty array instantly
    analyzeTeam: vi.fn(() => ({
      missingCapabilities: [],
      tempo: { pressureRating: 0, estimatedKillTurns: 0 }
    })),
  }
})

describe('App Performance Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('avoids recalculating suggestions when not in builder tab', async () => {
    render(<App />)

    // 1. Add a character to the team to make getSuggestions expensive/active
    // The list is rendered in Builder tab by default.
    // Find the add button for Uzumaki Naruto
    const addButton = screen.getByRole('button', { name: /Add Uzumaki Naruto to team/i })
    fireEvent.click(addButton)

    // Verify team has 1 member
    expect(screen.getByText(/1 \/ 3 UNITS/i)).toBeInTheDocument()

    // Clear initial calls
    vi.clearAllMocks()

    // 2. Switch to Collection tab
    const collectionTab = screen.getByText('collection') // Navigation button
    fireEvent.click(collectionTab)

    // 3. Handle "Collection Setup" if it appears (it usually does for empty localStorage)
    const skipButton = screen.queryByText(/Skip/i)
    if (skipButton) {
      fireEvent.click(skipButton)
    }

    // Verify we are in Collection Manager
    await waitFor(() => {
        expect(screen.getByText(/Your Arsenal/i)).toBeInTheDocument()
    })

    // 4. Toggle a character in Collection (e.g., Haruno Sakura)
    // CollectionCard renders character name. Clicking it toggles owned state.
    const sakuraCard = screen.getByText('Haruno Sakura')
    fireEvent.click(sakuraCard)

    // 5. In OPTIMIZED code, changing ownedCharacters should NOT trigger suggestions calculation
    // because activeTab is 'collection'.
    expect(recommendationEngine.getSuggestions).not.toHaveBeenCalled()
  })
})
