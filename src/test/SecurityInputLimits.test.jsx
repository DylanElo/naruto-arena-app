import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';
import CollectionManager from '../components/CollectionManager';
import CounterBuilder from '../components/CounterBuilder';

// Mock dependencies to isolate component testing
vi.mock('../data/characters.json', () => ({
  default: [
    { id: '1', name: 'Naruto', skills: [{ energy: ['red'], classes: 'Attack' }] },
    { id: '2', name: 'Sasuke', skills: [{ energy: ['blue'], classes: 'Defense' }] }
  ]
}));

vi.mock('../utils/recommendationEngine', () => ({
  getSuggestions: () => [],
  analyzeTeam: () => ({ tempo: {}, missingCapabilities: [] }),
  recommendPartnersForMain: () => []
}));

vi.mock('../utils/collectionManager', () => ({
  initializeCollectionByLevel: () => [],
  getCollectionStats: () => ({ owned: 0, total: 2 }),
  loadCollection: () => []
}));

vi.mock('../utils/counterBuilder', () => ({
  buildCounterTeam: () => []
}));

vi.mock('../utils/metaBuilder', () => ({
  generateMetaTeams: () => [],
  getPlaystyleDescription: () => ''
}));

vi.mock('../utils/knowledgeEngine', () => ({
  getCharacterKnowledge: () => ({ profile: { mechanics: {} } })
}));

// Mock assetPath to avoid import.meta.env issues
vi.mock('../utils/assetPath', () => ({
  assetPath: (path) => path
}));

describe('Security Input Limits', () => {
  it('App: Team Name input has maxLength 30', () => {
    render(<App />);
    const input = screen.getByPlaceholderText(/Operation Name/i);
    expect(input).toHaveAttribute('maxLength', '30');
  });

  it('App: Search input has maxLength 50', () => {
    render(<App />);
    const input = screen.getByPlaceholderText(/Search archive/i);
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('CollectionManager: Search input has maxLength 50', () => {
    // Pass ownedIds to bypass setup screen
    render(
        <CollectionManager
            allCharacters={[]}
            ownedIds={['1']}
            onToggle={() => {}}
            onBatchUpdate={() => {}}
        />
    );
    const input = screen.getByPlaceholderText(/Search archive/i);
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('CounterBuilder: Search input has maxLength 50', () => {
    render(<CounterBuilder allCharacters={[]} />);
    const input = screen.getByPlaceholderText(/Search characters/i);
    expect(input).toHaveAttribute('maxLength', '50');
  });
});
