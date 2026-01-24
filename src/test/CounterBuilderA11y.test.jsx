import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CounterBuilder from '../components/CounterBuilder';

// Mock dependencies
vi.mock('../utils/counterBuilder', () => ({
  buildCounterTeam: vi.fn(() => []),
}));

vi.mock('../utils/collectionManager', () => ({
  loadCollection: vi.fn(() => new Set()),
}));

const mockCharacters = [
  { id: 'naruto', name: 'Naruto Uzumaki' },
  { id: 'sasuke', name: 'Sasuke Uchiha' },
];

describe('CounterBuilder Accessibility', () => {
  it('renders character selection items as accessible buttons', () => {
    render(<CounterBuilder allCharacters={mockCharacters} />);

    // Check if character items are buttons with correct label
    // This expects the list item to be a <button> with aria-label
    const charButton = screen.getByRole('button', { name: /Add Naruto Uzumaki to enemy team/i });
    expect(charButton).toBeInTheDocument();
  });

  it('renders remove buttons with aria-labels', async () => {
    render(<CounterBuilder allCharacters={mockCharacters} />);

    // Note: We need to find the element to click it.
    // In the current broken state, it's a div, so we can't use getByRole('button') to click it easily if we want to simulate user flow accurately for the test.
    // However, to make the test "fail correctly", we try to find the button.
    // If we want to simulate adding, we might need to find by text.

    // Let's try to find the "add" element by text to trigger the add, so we can test the "remove" button.
    const addText = screen.getByText('Naruto Uzumaki');
    fireEvent.click(addText.closest('div')); // Clicking the container

    // Now check for remove button
    const removeButton = await screen.findByRole('button', { name: /Remove Naruto Uzumaki from enemy team/i });
    expect(removeButton).toBeInTheDocument();
  });
});
