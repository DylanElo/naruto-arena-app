import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import CounterBuilder from '../components/CounterBuilder';
import React from 'react';

// Mock dependencies
vi.mock('../utils/collectionManager', () => ({
  loadCollection: vi.fn(() => ['1', '2']),
}));

vi.mock('../utils/counterBuilder', () => ({
  buildCounterTeam: vi.fn(() => []),
}));

const mockCharacters = [
  { id: '1', name: 'Naruto Uzumaki' },
  { id: '2', name: 'Sasuke Uchiha' }
];

describe('CounterBuilder Accessibility', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders character selection options as buttons with aria-labels', () => {
    render(<CounterBuilder allCharacters={mockCharacters} />);

    // This expects the list items to be buttons with "Select [Name]" aria-label
    // Will fail if they are divs or missing labels
    const selectButton = screen.getByRole('button', { name: 'Select Naruto Uzumaki' });
    expect(selectButton).toBeInTheDocument();
  });

  it('renders remove button with descriptive aria-label', () => {
    render(<CounterBuilder allCharacters={mockCharacters} />);

    // Find the element to click to add to team
    // We use a query that works for both the current (div) and future (button) state just to trigger the action
    const characterName = screen.getByText('Naruto Uzumaki');
    fireEvent.click(characterName);

    // Now verify the remove button has the correct label
    const removeButton = screen.getByRole('button', { name: 'Remove Naruto Uzumaki from enemy team' });
    expect(removeButton).toBeInTheDocument();
  });
});
