import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CounterBuilder from '../components/CounterBuilder';

// Mock the utilities that CounterBuilder uses
vi.mock('../utils/counterBuilder', () => ({
  buildCounterTeam: vi.fn(() => []),
}));

vi.mock('../utils/collectionManager', () => ({
  loadCollection: vi.fn(() => []),
}));

const mockCharacters = [
  { id: 'naruto', name: 'Naruto Uzumaki' },
  { id: 'sasuke', name: 'Sasuke Uchiha' },
];

describe('CounterBuilder Accessibility', () => {
  it('renders character selection list as accessible buttons', () => {
    render(<CounterBuilder allCharacters={mockCharacters} />);

    // Check if we can find buttons with the specific label
    // This is expected to fail initially because they are divs
    const buttons = screen.getAllByRole('button', { name: /Add .* to enemy team/i });

    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]).toHaveAttribute('aria-label', expect.stringContaining('Add Naruto Uzumaki to enemy team'));
  });
});
