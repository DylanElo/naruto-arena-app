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
} from './matchupLogic'

import { getCharacterKnowledge } from './knowledgeEngine'

// Helper to get profile from knowledge engine
function buildCharacterProfile(char) {
  const knowledge = getCharacterKnowledge(char.id);
  return knowledge?.profile || null;
}

// Simple wrapper: expose score based on tag analysis
export const calculateCounterScore = (candidate, enemyTeam, currentTeam = []) => {
  if (!candidate || !enemyTeam || enemyTeam.length === 0) return 0;

  const threats = analyzeEnemyThreats(enemyTeam);
  const needs = calculateNeeds(threats);
  const profile = buildCharacterProfile(candidate);

  if (!profile) return 0;

  return scoreCounterMatch(profile, needs);
}

// Simple wrapper: human-readable reason string
export const getCounterReason = (candidate, enemyTeam) => {
  if (!candidate || !enemyTeam || enemyTeam.length === 0) return "";

  const threats = analyzeEnemyThreats(enemyTeam);
  const needs = calculateNeeds(threats);
  const profile = buildCharacterProfile(candidate);

  if (!profile) return "";

  return explainCounter(profile, threats, needs);
}

// Main entry point used by the React component
export const buildCounterTeam = (enemyTeam, allCharacters, ownedCharacterIds = [], currentTeam = []) => {
  return buildCounterTeamManual(enemyTeam, allCharacters, ownedCharacterIds, currentTeam);
}
