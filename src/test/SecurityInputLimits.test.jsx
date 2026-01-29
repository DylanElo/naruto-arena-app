import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';
import CounterBuilder from '../components/CounterBuilder';
import CollectionManager from '../components/CollectionManager';

// Mock dependencies
vi.mock('../data/characters.json', () => ({
  default: [
    { id: 'naruto', name: 'Naruto Uzumaki', skills: [{ energy: ['red'], classes: 'Offense' }], tags: ['Konoha'] },
    { id: 'sasuke', name: 'Sasuke Uchiha', skills: [{ energy: ['blue'], classes: 'Offense' }], tags: ['Konoha'] }
  ]
}));

vi.mock('../utils/recommendationEngine', () => ({
  getSuggestions: () => [],
  analyzeTeam: () => ({
    tempo: { pressureRating: 0, estimatedKillTurns: 0 },
    missingCapabilities: []
  }),
  recommendPartnersForMain: () => []
}));

vi.mock('../utils/assetPath', () => ({
  assetPath: (path) => path
}));

vi.mock('../utils/storage', () => ({
  safeGet: (key, fallback) => fallback,
  safeSet: () => true,
  safeRemove: () => {}
}));

vi.mock('../utils/counterBuilder', () => ({
  buildCounterTeam: () => []
}));

vi.mock('../utils/collectionManager', () => ({
  initializeCollectionByLevel: () => [],
  getCollectionStats: () => ({ owned: 0, total: 0 }),
  loadCollection: () => []
}));

vi.mock('../utils/metaBuilder', () => ({
    generateMetaTeams: () => [],
    getPlaystyleDescription: () => ''
}));

// Mock knowledge engine used by CollectionManager
vi.mock('../utils/knowledgeEngine', () => ({
    getCharacterKnowledge: () => null
}));

describe('Security Input Limits', () => {
  it('App: Team Name input should have maxLength', () => {
    render(<App />);
    const input = screen.getByLabelText(/Operation Name/i);
    expect(input).toHaveAttribute('maxLength', '30');
  });

  it('App: Archive Search input should have maxLength', () => {
    render(<App />);
    const input = screen.getByLabelText(/Search archive/i);
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('CounterBuilder: Search input should have maxLength', () => {
    render(<CounterBuilder allCharacters={[]} />);
    const input = screen.getByLabelText(/Search characters/i);
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('CollectionManager: Archive Search input should have maxLength', () => {
    // Pass ownedIds as array with one item to skip setup screen
    render(<CollectionManager allCharacters={[]} ownedIds={['naruto']} onToggle={() => {}} onBatchUpdate={() => {}} />);
    const input = screen.getByLabelText(/Search archive/i);
    expect(input).toHaveAttribute('maxLength', '50');
  });
});
