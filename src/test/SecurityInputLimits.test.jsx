import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';
import CounterBuilder from '../components/CounterBuilder';
import CollectionManager from '../components/CollectionManager';

// Mock large data files
vi.mock('../data/characters.json', () => ({
  default: [
    { id: 'naruto', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Attack' }] }
  ]
}));

// Mock utils that might be heavy or cause side effects
vi.mock('../utils/recommendationEngine', () => ({
  analyzeTeam: () => ({ tempo: {}, missingCapabilities: [] }),
  getSuggestions: () => []
}));

// Mock storage to avoid localStorage issues
vi.mock('../utils/storage', () => ({
    safeGet: (key, fallback) => fallback,
    safeSet: () => true
}));

describe('Security Input Limits', () => {
  it('App: Search input has max length', () => {
    render(<App />);
    const searchInput = screen.getByPlaceholderText(/search archive/i);
    expect(searchInput).toHaveAttribute('maxLength', '50');
  });

  it('App: Team name input has max length', () => {
    render(<App />);
    const nameInput = screen.getByPlaceholderText(/operation name/i);
    expect(nameInput).toHaveAttribute('maxLength', '30');
  });

  it('CounterBuilder: Search input has max length', () => {
    render(<CounterBuilder allCharacters={[]} />);
    const searchInput = screen.getByPlaceholderText(/search characters/i);
    expect(searchInput).toHaveAttribute('maxLength', '50');
  });

  it('CollectionManager: Search input has max length', () => {
    // Provide necessary props including a Set for ownedIds to match prop types if needed
    // The component uses ownedIds.has() or includes(), so passing an empty array might fail if it strictly expects a Set in some paths,
    // but looking at code: `ownedIds.has ? ownedIds.has(char.id) : ownedIds.includes(char.id)` handles both.
    // Also requires `stats` memoization which calls getCollectionStats.
    // getCollectionStats iterates ownedIds.
    render(<CollectionManager allCharacters={[]} ownedIds={[]} onToggle={() => {}} />);

    // Skip setup if present
    const skipButton = screen.queryByText(/skip/i);
    if (skipButton) {
      fireEvent.click(skipButton);
    }

    const searchInput = screen.getByPlaceholderText(/search archive/i);
    expect(searchInput).toHaveAttribute('maxLength', '50');
  });
});
