import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from '../App'
import * as recommendationEngine from '../utils/recommendationEngine'

// Mock large data to prevent test timeouts
vi.mock('../data/characters.json', () => {
  return {
    default: [
      {
        id: '1',
        name: 'Test Char 1',
        skills: [{ name: 'S1', energy: ['red'], classes: 'Test' }],
        tags: []
      },
      {
        id: '2',
        name: 'Test Char 2',
        skills: [{ name: 'S2', energy: ['blue'], classes: 'Test' }],
        tags: []
      }
    ]
  }
})

// Mock the expensive functions to spy on them and prevent actual execution
vi.mock('../utils/recommendationEngine', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getSuggestions: vi.fn(() => []),
    analyzeTeam: vi.fn(() => ({
      tempo: { pressureRating: 0 },
      mechanics: {},
      roles: {},
      strengths: [],
      weaknesses: [],
      strategies: []
    })),
  }
})

describe('App Performance', () => {
  it('should not run recommendation engine when not on builder tab', async () => {
    // This test ensures that expensive calculations (team analysis, suggestions)
    // are NOT executed when the user is interacting with other tabs (like Collection).
    // Regression test for performance optimization.

    render(<App />)

    // 1. Switch to Collection tab
    const collectionTab = screen.getAllByText(/collection/i, { selector: 'button' })[0]
    fireEvent.click(collectionTab)

    // Wait for render cycle
    await waitFor(() => {
        expect(screen.queryByText('Squad Formation')).not.toBeInTheDocument()
    })

    // Handle "Collection Setup" modal if it appears
    const skipButton = screen.queryByText(/Skip/i)
    if (skipButton) {
        fireEvent.click(skipButton)
    }

    // 2. Clear previous calls (from initial render)
    vi.mocked(recommendationEngine.getSuggestions).mockClear()
    vi.mocked(recommendationEngine.analyzeTeam).mockClear()

    // 3. Find a character toggle button in Collection view
    // Wait for cards to appear
    const cards = await screen.findAllByRole('button', { name: /Owned|Not Owned/i })
    expect(cards.length).toBeGreaterThan(0)

    const card = cards[0]

    // 4. Toggle character (this updates 'ownedCharacters' state)
    fireEvent.click(card)

    // 5. Assert expensive functions are NOT called
    // If this fails, it means the expensive derived state is re-calculating
    // even when the tab displaying it is hidden.
    expect(vi.mocked(recommendationEngine.getSuggestions)).not.toHaveBeenCalled()
    expect(vi.mocked(recommendationEngine.analyzeTeam)).not.toHaveBeenCalled()
  })

  it('should run recommendation engine when on builder tab', async () => {
    render(<App />)

    // Default is builder tab.
    // We need to trigger an update that would cause re-analysis (e.g., adding to team).

    // 1. Clear initial render calls
    vi.mocked(recommendationEngine.analyzeTeam).mockClear()

    // 2. Find a character to add in the list
    const addButtons = await screen.findAllByRole('button', { name: /Add .* to team/i })
    expect(addButtons.length).toBeGreaterThan(0)

    // 3. Add to team
    fireEvent.click(addButtons[0])

    // 4. Assert analyzeTeam IS called
    expect(vi.mocked(recommendationEngine.analyzeTeam)).toHaveBeenCalled()
  })
})
