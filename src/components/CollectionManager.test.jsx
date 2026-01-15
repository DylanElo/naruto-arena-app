import { render, screen, fireEvent } from '@testing-library/react'
import CollectionManager from './CollectionManager'
import { vi, describe, it, expect } from 'vitest'

// Mock assetPath
vi.mock('../utils/assetPath', () => ({
  assetPath: (path) => path
}))

// Mock knowledgeEngine
vi.mock('../utils/knowledgeEngine', () => ({
  getCharacterKnowledge: () => ({ profile: { mechanics: {} } })
}))

// Mock collectionManager utils
vi.mock('../utils/collectionManager', () => ({
  initializeCollectionByLevel: () => [],
  getCollectionStats: (all, owned) => ({
    owned: owned.size || owned.length,
    total: all.length
  })
}))

const mockCharacters = [
  { id: 'c1', name: 'Naruto', skills: [] },
  { id: 'c2', name: 'Sasuke', skills: [] },
  { id: 'c3', name: 'Sakura', skills: [] }
]

describe('CollectionManager', () => {
  it('renders characters', () => {
    render(
      <CollectionManager
        allCharacters={mockCharacters}
        ownedIds={new Set(['c1'])}
        onToggle={() => {}}
        onBatchUpdate={() => {}}
      />
    )

    // Check if stats are rendered
    expect(screen.getByText('Your Arsenal')).toBeInTheDocument()

    // Check if characters are rendered
    expect(screen.getByText('Naruto')).toBeInTheDocument()
    expect(screen.getByText('Sasuke')).toBeInTheDocument()

    // Check ownership indication (Naruto is owned)
    const narutoButton = screen.getByText('Naruto').closest('button')
    expect(narutoButton).toHaveAttribute('aria-pressed', 'true')

    const sasukeButton = screen.getByText('Sasuke').closest('button')
    expect(sasukeButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onToggle when a character is clicked', () => {
    const handleToggle = vi.fn()
    render(
      <CollectionManager
        allCharacters={mockCharacters}
        ownedIds={new Set(['c1'])}
        onToggle={handleToggle}
        onBatchUpdate={() => {}}
      />
    )

    const sasukeButton = screen.getByText('Sasuke').closest('button')
    fireEvent.click(sasukeButton)
    expect(handleToggle).toHaveBeenCalledWith('c2')
  })
})
