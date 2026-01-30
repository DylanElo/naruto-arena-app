import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import App from '../App'
import * as recommendationEngine from '../utils/recommendationEngine'

// Mock large data
vi.mock('../data/characters.json', () => {
  return {
    default: [
      {
        id: 'test_1',
        name: 'Test Char 1',
        skills: [{ name: 'Skill 1', energy: ['red'], classes: 'Test', description: 'desc' }],
        tags: ['Test']
      },
      {
        id: 'test_2',
        name: 'Test Char 2',
        skills: [{ name: 'Skill 2', energy: ['blue'], classes: 'Test', description: 'desc' }],
        tags: ['Test']
      }
    ]
  }
})

// Mock the recommendation engine to spy on getSuggestions
vi.mock('../utils/recommendationEngine', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getSuggestions: vi.fn((...args) => actual.getSuggestions(...args)),
  }
})

describe('Performance Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('avoids unnecessary calculation of getSuggestions when in Collection tab', async () => {
    render(<App />)

    // Initial render in Builder tab (default) triggers getSuggestions
    expect(recommendationEngine.getSuggestions).toHaveBeenCalled()
    const initialCalls = recommendationEngine.getSuggestions.mock.calls.length

    // Switch to Collection tab
    const collectionTab = screen.getByText('collection')
    fireEvent.click(collectionTab)

    // Handle Setup screen (empty collection)
    const skipButton = await screen.findByText('Skip')
    fireEvent.click(skipButton)

    // Wait for Collection UI
    await screen.findByText('Your Arsenal')

    // Find a character toggle button (Test Char 1)
    // CollectionCard aria-label is "{name} - {Owned/Not Owned}"
    const toggleButtons = screen.getAllByRole('button', { name: /Not Owned|Owned/i })
    const toggleBtn = toggleButtons[0]

    // Toggle character (updates ownedCharacters state in App)
    fireEvent.click(toggleBtn)

    // Optimization check: getSuggestions should NOT be called again
    expect(recommendationEngine.getSuggestions).toHaveBeenCalledTimes(initialCalls)
  })

  it('resumes calculation when switching back to Builder tab', async () => {
    render(<App />)
    const initialCalls = recommendationEngine.getSuggestions.mock.calls.length

    // Switch to Collection
    fireEvent.click(screen.getByText('collection'))

    // Switch back to Builder
    fireEvent.click(screen.getByText('builder'))

    // Should have called it again because activeTab became 'builder'
    expect(recommendationEngine.getSuggestions.mock.calls.length).toBeGreaterThan(initialCalls)
  })
})
