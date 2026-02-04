import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../App'
import * as recommendationEngine from '../utils/recommendationEngine'

// Mock the heavy data
vi.mock('../data/characters.json', () => ({
  default: [
    { id: '1', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Attacker' }], tags: ['Ninja'] },
    { id: '2', name: 'Sasuke', skills: [{ energy: ['blue'], classes: 'Attacker' }], tags: ['Ninja'] },
    { id: '3', name: 'Sakura', skills: [{ energy: ['green'], classes: 'Support' }], tags: ['Ninja'] },
  ]
}))

// Mock asset path to avoid import.meta.env issues
vi.mock('../utils/assetPath', () => ({
  assetPath: (path) => path
}))

// Mock the recommendation engine to spy on it
vi.mock('../utils/recommendationEngine', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getSuggestions: vi.fn(() => []),
    analyzeTeam: vi.fn(() => ({ missingCapabilities: [], tempo: {} })),
    recommendPartnersForMain: vi.fn(() => [])
  }
})

describe('Performance Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('reproduction: calls getSuggestions unnecessarily when toggling characters in Collection tab', async () => {
    render(<App />)

    // Switch to Collection tab
    const collectionTab = screen.getByText('collection')
    fireEvent.click(collectionTab)

    // Handle initial setup screen if present
    const skipBtn = screen.queryByText('Skip')
    if (skipBtn) {
      fireEvent.click(skipBtn)
    }

    // Verify we are in collection tab
    expect(screen.getByText('Your Arsenal')).toBeInTheDocument()

    // Clear mocks to ignore calls from initial render (when activeTab was 'builder')
    recommendationEngine.getSuggestions.mockClear()

    // Find a character to toggle (CollectionCard)
    const charBtn = screen.getByRole('button', { name: /Naruto/ })
    const wasPressed = charBtn.getAttribute('aria-pressed') === 'true'

    fireEvent.click(charBtn)

    // Wait for UI to update (confirming render happened)
    await waitFor(() => {
      expect(charBtn.getAttribute('aria-pressed')).toBe(wasPressed ? 'false' : 'true')
    })

    // After optimization: getSuggestions should NOT be called
    expect(recommendationEngine.getSuggestions).not.toHaveBeenCalled()
  })
})
