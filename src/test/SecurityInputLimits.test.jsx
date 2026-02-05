import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'

// Mock data files BEFORE imports
vi.mock('../data/characters.json', () => ({
  default: [
    { id: '1', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Attack' }], tags: ['Ninja'] }
  ]
}))

vi.mock('../data/missions.json', () => ({
    default: []
}))

// Mock assets
vi.mock('../utils/assetPath', () => ({ assetPath: (path) => path }))

// Import components
import App from '../App'
import CounterBuilder from '../components/CounterBuilder'
import CollectionManager from '../components/CollectionManager'

const mockCharacters = [
  { id: '1', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Attack' }], tags: ['Ninja'] }
]

describe('Security Input Limits', () => {
  it('App: Team Name input has maxLength', () => {
    render(<App />)
    const input = screen.getByPlaceholderText(/Operation Name/i)
    expect(input).toHaveAttribute('maxLength', '30')
  })

  it('App: Search input has maxLength', () => {
    render(<App />)
    const input = screen.getByPlaceholderText(/Search archive/i)
    expect(input).toHaveAttribute('maxLength', '50')
  })

  it('CounterBuilder: Search input has maxLength', () => {
    render(<CounterBuilder allCharacters={mockCharacters} />)
    const input = screen.getByPlaceholderText(/Search characters/i)
    expect(input).toHaveAttribute('maxLength', '50')
  })

  it('CollectionManager: Search input has maxLength', () => {
    // Pass ownedIds as array with one item to bypass setup screen
    render(<CollectionManager allCharacters={mockCharacters} ownedIds={['1']} onToggle={() => {}} onBatchUpdate={() => {}} />)
    const input = screen.getByPlaceholderText(/Search archive/i)
    expect(input).toHaveAttribute('maxLength', '50')
  })
})
