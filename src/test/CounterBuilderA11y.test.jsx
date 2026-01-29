import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CounterBuilder from '../components/CounterBuilder';

// Mock dependencies
vi.mock('../utils/collectionManager', () => ({
    loadCollection: vi.fn(() => []),
}));

vi.mock('../utils/counterBuilder', () => ({
    buildCounterTeam: vi.fn(() => []),
}));

const mockCharacters = [
    { id: '1', name: 'Naruto Uzumaki', skills: [] },
    { id: '2', name: 'Sasuke Uchiha', skills: [] },
];

describe('CounterBuilder Accessibility', () => {
    it('renders character selection items as accessible buttons', () => {
        render(<CounterBuilder allCharacters={mockCharacters} />);

        // This query expects elements with role="button" and the specific accessible name
        // Initially this should fail because they are divs
        const buttons = screen.getAllByRole('button', { name: /Select .* as enemy/i });

        expect(buttons.length).toBeGreaterThan(0);
        expect(buttons[0]).toHaveAttribute('type', 'button');
    });
});
