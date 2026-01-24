import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import App from '../App'
import * as recommendationEngine from '../utils/recommendationEngine'

// Mock the recommendation engine to track calls
vi.mock('../utils/recommendationEngine', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getSuggestions: vi.fn((...args) => actual.getSuggestions(...args)),
    analyzeTeam: vi.fn((...args) => actual.analyzeTeam(...args)),
  }
})

describe('App Performance', () => {
    beforeEach(() => {
        vi.mocked(recommendationEngine.getSuggestions).mockClear()
        vi.mocked(recommendationEngine.analyzeTeam).mockClear()
    })

    it('should NOT recalculate suggestions when toggling collection in non-builder tab', async () => {
        render(<App />)

        // Switch to collection tab
        const collectionTab = screen.getByText('collection')
        fireEvent.click(collectionTab)

        // Handle Collection Setup if it appears
        const skipButton = await screen.findByText('Skip').catch(() => null)
        if (skipButton) {
            fireEvent.click(skipButton)
        }

        // Wait for the main collection view
        await screen.findByText('Your Arsenal')

        // Wait for cards to appear
        const buttons = await screen.findAllByRole('button', { pressed: false })
        expect(buttons.length).toBeGreaterThan(0)

        // Reset mock counts after initial render and tab switch setup
        vi.mocked(recommendationEngine.getSuggestions).mockClear()

        // Toggle a character (e.g. the first one)
        fireEvent.click(buttons[0])

        // Verify state update (the button should become pressed)
        await waitFor(() => {
             expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
        })

        // Assert that getSuggestions WAS called (confirming the issue)
        expect(vi.mocked(recommendationEngine.getSuggestions)).not.toHaveBeenCalled()
    })

    it('should calculate suggestions when in builder tab', async () => {
        render(<App />)
        // Default tab is builder.
        // Wait for rendering
        await screen.findByText('Squad Formation')

        // It should have called getSuggestions on initial render
        expect(vi.mocked(recommendationEngine.getSuggestions)).toHaveBeenCalled()
    })
})
