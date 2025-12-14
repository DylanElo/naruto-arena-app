import { describe, it, expect } from 'vitest';
import { GameState, Character } from './models';
import { analyzeGameState } from './analyzer';
import charactersData from '../data/characters.json';

describe('Simulation Engine', () => {
    it('should correctly parse character data', () => {
        const narutoData = charactersData.find(c => c.name === 'Uzumaki Naruto');
        const naruto = new Character(narutoData);
        expect(naruto.name).toBe('Uzumaki Naruto');
        expect(naruto.skills.length).toBe(5);
    });

    it('should correctly calculate game state analysis', () => {
        const gameState = new GameState();
        const naruto = new Character(charactersData.find(c => c.name === 'Uzumaki Naruto'));
        const sakura = new Character(charactersData.find(c => c.name === 'Haruno Sakura'));
        const sasuke = new Character(charactersData.find(c => c.name === 'Uchiha Sasuke'));
        gameState.teams[0] = [naruto, sakura, sasuke];
        const naruto2 = new Character(charactersData.find(c => c.name === 'Uzumaki Naruto'));
        const sakura2 = new Character(charactersData.find(c => c.name === 'Haruno Sakura'));
        const sasuke2 = new Character(charactersData.find(c => c.name === 'Uchiha Sasuke'));
        gameState.teams[1] = [naruto2, sakura2, sasuke2];
        const analysis = analyzeGameState(gameState, 0);
        expect(analysis.hpDelta).toBe(0);
    });
});
