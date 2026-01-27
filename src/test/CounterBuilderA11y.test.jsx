import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CounterBuilder from '../components/CounterBuilder';

// Mock dependencies
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
  it('renders character selection items as accessible buttons', () => {
    render(<CounterBuilder allCharacters={mockCharacters} />);

    // Check if the characters are rendered
    const characterItems = screen.getAllByText(/Naruto|Sasuke/);
    expect(characterItems.length).toBeGreaterThan(0);

    // This assertion is expected to FAIL before the fix
    // We want to find a button with the character's name accessible name
    // Since the original code uses a div, there will be no button with that name
    const narutoButton = screen.getByRole('button', { name: /Select Naruto Uzumaki as enemy/i });
    expect(narutoButton).toBeInTheDocument();
  });
});
