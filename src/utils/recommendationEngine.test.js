import { describe, it, expect } from 'vitest';
import { analyzeTeam, getSuggestions, recommendPartnersForMain } from './recommendationEngine';
import characters from '../data/characters.json';

describe('analyzeTeam', () => {
  it('should return default analysis for an empty team', () => {
    const team = [];
    const analysis = analyzeTeam(team);
    expect(analysis.synergyScore).toBe(0);
    expect(analysis.strengths).toEqual([]);
    expect(analysis.weaknesses).toEqual([]);
  });

  it('should analyze a team with one character', () => {
    const team = [characters[0]];
    const analysis = analyzeTeam(team);
    expect(analysis.synergyScore).toBeGreaterThan(0);
  });

  it('should analyze a team with three characters', () => {
    const team = [characters[0], characters[1], characters[2]];
    const analysis = analyzeTeam(team);
    expect(analysis.synergyScore).toBeGreaterThan(0);
  });
});

describe('getSuggestions', () => {
  it('should return an empty array for a full team', () => {
    const team = [characters[0], characters[1], characters[2]];
    const suggestions = getSuggestions(characters, team);
    expect(suggestions).toEqual([]);
  });

  it('should return suggestions for a team with one character', () => {
    const team = [characters[0]];
    const suggestions = getSuggestions(characters, team, 5);
    expect(suggestions.length).toBe(5);
  });

  it('should return suggestions for a team with two characters', () => {
    const team = [characters[0], characters[1]];
    const suggestions = getSuggestions(characters, team, 5);
    expect(suggestions.length).toBe(5);
  });
});

describe('recommendPartnersForMain', () => {
  it('should return recommendations for a single character', () => {
    const character = characters[0];
    const recommendations = recommendPartnersForMain(character, characters, null, 5);
    expect(recommendations.length).toBe(5);
  });
});
