/**
 * COUNTER BUILDER (TAG-BASED VERSION)
 * Uses the manual-driven knowledge engine instead of raw simulation.
 *
 * The public API is kept compatible:
 *   - calculateCounterScore(candidate, enemyTeam, currentTeam?)
 *   - getCounterReason(candidate, enemyTeam)
 *   - buildCounterTeam(enemyTeam, allCharacters, ownedCharacterIds?, currentTeam?)
 */

import {
  scoreCounterCandidateByTags,
  explainCounterFitByTags,
  recommendCounterCandidatesByTags
} from './recommendationEngine'

// Simple wrapper: expose score based on tag analysis
export const calculateCounterScore = (candidate, enemyTeam, currentTeam = []) => {
  return scoreCounterCandidateByTags(candidate, enemyTeam, currentTeam)
}

// Simple wrapper: human-readable reason string
export const getCounterReason = (candidate, enemyTeam) => {
  return explainCounterFitByTags(candidate, enemyTeam)
}

// Main entry point used by the React component
export const buildCounterTeam = (enemyTeam, allCharacters, ownedCharacterIds = [], currentTeam = []) => {
  if (!enemyTeam || enemyTeam.length === 0) return []

  // Delegate candidate ranking to the tag-based engine
  const recommended = recommendCounterCandidatesByTags(
    enemyTeam,
    allCharacters,
    ownedCharacterIds,
    currentTeam,
    10
  )

  // Normalize field names for the UI (counterScore / counterReason)
  return recommended.map(char => ({
    ...char,
    counterScore: char.counterScoreByTags ?? 0,
    counterReason: char.counterReasonByTags ?? 'General good mechanics vs this team'
  }))
}
