import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';
import CounterBuilder from '../components/CounterBuilder';
import CollectionManager from '../components/CollectionManager';

// Mock dependencies
vi.mock('../data/characters.json', () => ({
  default: [
    { id: 'naruto', name: 'Naruto Uzumaki', skills: [{ energy: ['wind'], classes: 'Offense' }], tags: ['leaf'] },
    { id: 'sasuke', name: 'Sasuke Uchiha', skills: [{ energy: ['lightning'], classes: 'Offense' }], tags: ['leaf'] }
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

vi.mock('../utils/knowledgeEngine', () => ({
    getCharacterKnowledge: () => ({ profile: { mechanics: {} } })
}));

vi.mock('../utils/assetPath', () => ({
  assetPath: (path) => path
}));

describe('Security Input Limits', () => {
  it('App: Team Name input should have maxLength attribute', () => {
    render(<App />);
    // Click on "builder" tab if not default, but it is default.
    // Need to trigger rendering of the input? It is rendered if activeTab is builder.

    // The input has id="team-name-input"
    const input = screen.getByPlaceholderText(/Operation Name/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('maxLength', '30');
  });

  it('App: Search Archive input should have maxLength attribute', () => {
    render(<App />);
    const input = screen.getByPlaceholderText(/Search archive/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('CounterBuilder: Search input should have maxLength attribute', () => {
    // Render component directly to avoid navigation logic in test
    render(<CounterBuilder allCharacters={[{ id: 'naruto', name: 'Naruto' }]} />);
    const input = screen.getByPlaceholderText(/Search characters/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('CollectionManager: Search input should have maxLength attribute', () => {
    // Render component directly
    render(
      <CollectionManager
        allCharacters={[{ id: 'naruto', name: 'Naruto' }]}
        ownedIds={[]}
        onToggle={() => {}}
        onBatchUpdate={() => {}}
      />
    );
    // There might be a setup screen first if ownedIds is empty.
    // In the component: const [showSetup, setShowSetup] = useState((ownedIds.size ?? ownedIds.length) === 0)
    // If ownedIds is empty, it shows setup.
    // We can pass ownedIds with items to skip setup.

    // Re-render with owned items to see main view
    render(
        <CollectionManager
          allCharacters={[{ id: 'naruto', name: 'Naruto' }]}
          ownedIds={['naruto']}
          onToggle={() => {}}
          onBatchUpdate={() => {}}
        />
      );

    const input = screen.getByPlaceholderText(/Search archive/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('maxLength', '50');
  });
});
