import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';
import CounterBuilder from '../components/CounterBuilder';

// Mock characters data to avoid loading large JSON
vi.mock('../data/characters.json', () => ({
  default: [
    { id: 'naruto_s', name: 'Naruto Uzumaki (S)', skills: [{ energy: ['red'], classes: 'Attack' }] },
    { id: 'sasuke_s', name: 'Sasuke Uchiha (S)', skills: [{ energy: ['blue'], classes: 'Attack' }] }
  ]
}));

// Mock utils/assetPath
vi.mock('../utils/assetPath', () => ({
  assetPath: (path) => path
}));

// Mock utils/recommendationEngine to avoid complex logic during render
vi.mock('../utils/recommendationEngine', () => ({
  getSuggestions: () => [],
  analyzeTeam: () => ({ tempo: {}, mechanics: {}, roles: {}, missingCapabilities: [] }),
  recommendPartnersForMain: () => [],
}));

// Mock scrollIntoView since it's not implemented in JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('Security Input Limits', () => {
  it('App: Search archive input has maxLength of 50', () => {
    render(<App />);
    const searchInput = screen.getByPlaceholderText(/Search archive/i);
    expect(searchInput).toHaveAttribute('maxLength', '50');
  });

  it('App: Operation Name input has maxLength of 30', () => {
    render(<App />);
    // "Operation Name" input is in the default 'builder' tab
    const teamNameInput = screen.getByPlaceholderText(/Operation Name/i);
    expect(teamNameInput).toHaveAttribute('maxLength', '30');
  });

  it('CounterBuilder: Search input has maxLength of 50', () => {
    const mockChars = [
      { id: 'naruto_s', name: 'Naruto Uzumaki (S)', skills: [] }
    ];
    render(<CounterBuilder allCharacters={mockChars} />);
    const searchInput = screen.getByPlaceholderText(/Search characters/i);
    expect(searchInput).toHaveAttribute('maxLength', '50');
  });
});
