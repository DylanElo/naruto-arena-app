
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import App from '../App'
import * as recommendationEngine from '../utils/recommendationEngine'

// Mock the heavy function
vi.mock('../utils/recommendationEngine', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getSuggestions: vi.fn().mockReturnValue([]),
  }
})

// Mock large data to speed up tests and ensure controlled environment
vi.mock('../data/characters.json', () => ({
  default: [
    {
      id: '1',
      name: 'TestChar1',
      skills: [{ energy: ['red'], classes: 'TestClass' }],
      tags: ['TestTag']
    },
    {
      id: '2',
      name: 'TestChar2',
      skills: [{ energy: ['blue'], classes: 'TestClass' }],
      tags: ['TestTag']
    }
  ]
}))

describe('App Optimization', () => {
  it('does not call getSuggestions when activeTab is NOT builder', async () => {
    render(<App />)

    // Initial load is 'builder', so it might be called.
    // Wait for initial render
    await waitFor(() => {
        expect(screen.getByText('SHINOBI')).toBeInTheDocument()
    })

    // Switch to 'collection' tab
    const collectionTab = screen.getByText('collection')
    fireEvent.click(collectionTab)

    // Check if Setup screen is shown (likely because ownedCharacters is empty initially)
    const setupTitle = screen.queryByText(/Collection Setup/i)
    if (setupTitle) {
        // Click Skip
        const skipBtn = screen.getByRole('button', { name: /Skip/i })
        fireEvent.click(skipBtn)
    }

    // Verify we are in collection tab (Your Arsenal)
    await waitFor(() => {
        expect(screen.getByText('Your Arsenal')).toBeInTheDocument()
    })

    // Clear mock history to start fresh in collection tab
    vi.mocked(recommendationEngine.getSuggestions).mockClear()

    // Find a collection card toggle
    // Based on our mock data, we should have TestChar1 and TestChar2
    // CollectionCard has aria-label="TestChar1 - Not Owned"
    const charBtn = screen.getByRole('button', { name: /TestChar1/i })

    // Toggle the character
    fireEvent.click(charBtn)

    // Wait for potential effects
    await waitFor(() => {}, { timeout: 100 })

    // Verify getSuggestions was NOT called
    // (If optimization is missing, it WOULD be called because ownedCharacters changed)
    expect(recommendationEngine.getSuggestions).not.toHaveBeenCalled()
  })

  it('calls getSuggestions when activeTab IS builder', async () => {
     render(<App />)

     // Ensure we are in builder (default)
     expect(screen.getByText('Squad Formation')).toBeInTheDocument()

     // Clear previous calls from initial render
     vi.mocked(recommendationEngine.getSuggestions).mockClear()

     // Trigger a change that would cause recalculation.
     // Find a character to add.
     // The "Standard List" shows available characters.
     // Button aria-label is `Add ${char.name} to team`
     const addBtn = screen.getByRole('button', { name: /Add TestChar1 to team/i })
     fireEvent.click(addBtn)

     // getSuggestions depends on selectedTeam.
     // So it should be called.
     await waitFor(() => {
         expect(recommendationEngine.getSuggestions).toHaveBeenCalled()
     })
  })
})
