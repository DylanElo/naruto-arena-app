import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CollectionManager from './CollectionManager'

// Mock utils
vi.mock('../utils/assetPath', () => ({
    assetPath: (path) => path
}))

vi.mock('../utils/collectionManager', () => ({
    initializeCollectionByLevel: vi.fn(),
    getCollectionStats: vi.fn(() => ({ owned: 0, total: 10 }))
}))

vi.mock('../utils/knowledgeEngine', () => ({
    getCharacterKnowledge: vi.fn(() => ({}))
}))

const mockCharacters = [
    { id: 'naruto', name: 'Naruto Uzumaki' },
    { id: 'sasuke', name: 'Sasuke Uchiha' },
    { id: 'sakura', name: 'Sakura Haruno' }
]

describe('CollectionManager', () => {
    it('renders character cards', () => {
        const ownedIds = new Set(['naruto'])
        const onToggle = vi.fn()

        render(
            <CollectionManager
                allCharacters={mockCharacters}
                ownedIds={ownedIds}
                onToggle={onToggle}
            />
        )

        expect(screen.getByText('Naruto Uzumaki')).toBeInTheDocument()
        expect(screen.getByText('Sasuke Uchiha')).toBeInTheDocument()

        // Check "Owned" status logic (based on aria-label)
        const narutoBtn = screen.getByLabelText(/Naruto Uzumaki - Owned/i)
        expect(narutoBtn).toBeInTheDocument()

        const sasukeBtn = screen.getByLabelText(/Sasuke Uchiha - Not Owned/i)
        expect(sasukeBtn).toBeInTheDocument()
    })

    it('calls onToggle when a card is clicked', () => {
        const ownedIds = new Set(['sakura']) // Non-empty to skip setup
        const onToggle = vi.fn()

        render(
            <CollectionManager
                allCharacters={mockCharacters}
                ownedIds={ownedIds}
                onToggle={onToggle}
            />
        )

        const card = screen.getByText('Naruto Uzumaki').closest('button')
        fireEvent.click(card)

        expect(onToggle).toHaveBeenCalledWith('naruto')
    })
})
