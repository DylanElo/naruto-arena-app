/**
 * COUNTER BUILDER (TAG-BASED VERSION)
 * Uses the improved manual-driven knowledge engine directly.
 */

import {
  analyzeEnemyThreats,
  calculateNeeds,
  scoreCounterMatch,
  explainCounter,
  buildCounterTeamManual
} from './matchupLogic.js'

import { analyzeCharacter } from './recommendationEngine.js'

// Simple wrapper: expose score based on tag analysis
export const calculateCounterScore = (candidate, enemyTeam) => {
  if (!candidate || !enemyTeam || enemyTeam.length === 0) return 0;

  const threats = analyzeEnemyThreats(enemyTeam);
  const needs = calculateNeeds(threats);
  const profile = analyzeCharacter(candidate);

  if (!profile) return 0;

  return scoreCounterMatch(profile, needs);
}

// Simple wrapper: human-readable reason string
export const getCounterReason = (candidate, enemyTeam) => {
  if (!candidate || !enemyTeam || enemyTeam.length === 0) return "";

  const threats = analyzeEnemyThreats(enemyTeam);
  const needs = calculateNeeds(threats);
  const profile = analyzeCharacter(candidate);

  if (!profile) return "";

  return explainCounter(profile, threats, needs);
}

// Main entry point used by the React component
export const buildCounterTeam = (enemyTeam, allCharacters, ownedCharacterIds = [], currentTeam = []) => {
  return buildCounterTeamManual(enemyTeam, allCharacters, ownedCharacterIds, currentTeam);
}
