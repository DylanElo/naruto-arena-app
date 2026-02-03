import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import App from '../App';
import CollectionManager from '../components/CollectionManager';
import CounterBuilder from '../components/CounterBuilder';

// Mock dependencies to isolate components and avoid large data loading
vi.mock('../data/characters.json', () => ({
  default: [
    { id: '1', name: 'Naruto Uzumaki', skills: [{ energy: ['blue'], classes: 'Attack' }] },
    { id: '2', name: 'Sasuke Uchiha', skills: [{ energy: ['red'], classes: 'Attack' }] }
  ]
}));

vi.mock('../utils/recommendationEngine', () => ({
  getSuggestions: () => [],
  analyzeTeam: () => ({ tempo: {}, missingCapabilities: [] }),
  recommendPartnersForMain: () => []
}));

vi.mock('../utils/knowledgeEngine', () => ({
  getCharacterKnowledge: () => ({ mechanics: {} })
}));

vi.mock('../utils/counterBuilder', () => ({
  buildCounterTeam: () => []
}));

vi.mock('../utils/collectionManager', () => ({
  loadCollection: () => [],
  getCollectionStats: () => ({ owned: 0, total: 2 }),
  initializeCollectionByLevel: () => [],
  saveCollection: vi.fn(),
  toggleCharacter: vi.fn(),
  mapNameToId: () => '1'
}));

vi.mock('../utils/storage', () => ({
  safeGet: (key, fallback) => fallback,
  safeSet: vi.fn()
}));

describe('Security Input Limits', () => {
  const mockCharacters = [
    { id: '1', name: 'Naruto Uzumaki', skills: [{ energy: ['blue'], classes: 'Attack' }] },
    { id: '2', name: 'Sasuke Uchiha', skills: [{ energy: ['red'], classes: 'Attack' }] }
  ];

  it('App: Search input has maxLength 50', () => {
    render(<App />);
    // In App.jsx, the placeholder is "Search archive..."
    const searchInput = screen.getByPlaceholderText(/Search archive/i);
    expect(searchInput).toHaveAttribute('maxLength', '50');
  });

  it('App: Team Name input has maxLength 30', () => {
    render(<App />);
    // In App.jsx, the placeholder is "Operation Name..."
    const nameInput = screen.getByPlaceholderText(/Operation Name/i);
    expect(nameInput).toHaveAttribute('maxLength', '30');
  });

  it('CollectionManager: Search input has maxLength 50', () => {
    // Pass ownedIds as non-empty to skip setup screen
    render(
      <CollectionManager
        allCharacters={mockCharacters}
        ownedIds={['1']}
        onToggle={() => {}}
        onBatchUpdate={() => {}}
      />
    );
    // In CollectionManager.jsx, the placeholder is "Search archive..."
    const searchInput = screen.getByPlaceholderText(/Search archive/i);
    expect(searchInput).toHaveAttribute('maxLength', '50');
  });

  it('CounterBuilder: Search input has maxLength 50', () => {
    render(<CounterBuilder allCharacters={mockCharacters} />);
    // In CounterBuilder.jsx, the placeholder is "Search characters..."
    const searchInput = screen.getByPlaceholderText(/Search characters/i);
    expect(searchInput).toHaveAttribute('maxLength', '50');
  });
});
