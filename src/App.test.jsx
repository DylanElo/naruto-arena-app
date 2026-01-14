import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

// Mock the heavy data and utils to avoid issues
vi.mock('./data/characters.json', () => ({
  default: [
    { id: '1', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Attacker' }], tags: [] },
    { id: '2', name: 'Sasuke', skills: [{ energy: ['blue'], classes: 'Attacker' }], tags: [] }
  ]
}))

vi.mock('./utils/recommendationEngine', () => ({
  getSuggestions: () => [],
  analyzeTeam: () => ({ tempo: {}, missingCapabilities: [] }),
  recommendPartnersForMain: () => []
}))

// Mock assetPath to avoid issues with images
vi.mock('./utils/assetPath', () => ({
  assetPath: (path) => path
}))

describe('App Component Search', () => {
  it('shows clear button when search has text and clears it on click', () => {
    render(<App />)

    const input = screen.getByLabelText(/Search archive/i)

    // Initially no clear button (assuming queryByLabelText returns null if not found)
    expect(screen.queryByLabelText(/Clear search/i)).toBeNull()

    // Type something
    fireEvent.change(input, { target: { value: 'Naruto' } })
    expect(input.value).toBe('Naruto')

    // Clear button should appear
    const clearBtn = screen.getByLabelText(/Clear search/i)
    expect(clearBtn).toBeInTheDocument()

    // Click clear
    fireEvent.click(clearBtn)

    // Input should be empty
    expect(input.value).toBe('')

    // Clear button should disappear
    expect(screen.queryByLabelText(/Clear search/i)).toBeNull()

    // Input should have focus (we can check document.activeElement)
    expect(document.activeElement).toBe(input)
  })
})
