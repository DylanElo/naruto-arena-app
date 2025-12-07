import { getCharacterKnowledge } from './knowledgeEngine'
import { GameState, Character } from '../engine/models.js'
import { analyzeGameState as analyzeGameStateSimulation } from '../engine/analyzer.js'

// --- DEFAULT ANALYSIS SHAPE -------------------------------------------------

const DEFAULT_ANALYSIS = {
  roles: { tank: 0, support: 0, control: 0, dps: 0 },
  mechanics: {
    counter: 0,
    invisible: 0,
    immunity: 0,
    piercing: 0,
    punisher: 0,
    antiTank: 0,
    cleanse: 0,
    aoe: 0,
    stacking: 0,
    energyGen: 0,
    skillSteal: 0,
    stun: 0,
    invulnerable: 0,
    statusShield: 0,
    antiAffliction: 0,
    triggerOnAction: 0,
    triggerOnHit: 0,
    achievement: 0,
    setup: 0
  },
  energyDistribution: { green: 0, red: 0, blue: 0, white: 0, black: 0 },
  maxDPE: 0,
  avgDPE: 0,
  strengths: [],
  weaknesses: [],
  strategies: [],
  synergyHighlights: [],
  warnings: [],
  tempo: {
    estimatedKillTurns: null,
    costToKill: null,
    burstDamage: 0,
    pressureRating: 0
  },
  synergyScore: 0
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

// --- CHARACTER ANALYSIS -----------------------------------------------------

export const analyzeCharacter = (char) => {
  if (!char || !char.id) {
    return {
      roles: { tank: 0, support: 0, control: 0, dps: 0 },
      mechanics: {
        counter: 0,
        invisible: 0,
        immunity: 0,
        piercing: 0,
        punisher: 0,
        antiTank: 0,
        cleanse: 0,
        aoe: 0,
        stacking: 0,
        energyGen: 0,
        skillSteal: 0,
        stun: 0,
        invulnerable: 0,
        statusShield: 0,
        antiAffliction: 0,
        triggerOnAction: 0,
        triggerOnHit: 0,
        achievement: 0,
        setup: 0
      },
      knowledge: null
    }
  }

  const knowledge = getCharacterKnowledge(char.id)
  if (!knowledge) {
    return {
      roles: { tank: 0, support: 0, control: 0, dps: 0 },
      mechanics: {
        counter: 0,
        invisible: 0,
        immunity: 0,
        piercing: 0,
        punisher: 0,
        antiTank: 0,
        cleanse: 0,
        aoe: 0,
        stacking: 0,
        energyGen: 0,
        skillSteal: 0,
        stun: 0,
        invulnerable: 0,
        statusShield: 0,
        antiAffliction: 0,
        triggerOnAction: 0,
        triggerOnHit: 0,
        achievement: 0,
        setup: 0
      },
      knowledge: null
    }
  }

  return {
    roles: knowledge.roles,
    mechanics: knowledge.mechanics,
    knowledge
  }
}

// --- DAMAGE / TEMPO APPROXIMATION -------------------------------------------

function extractSkillDamage(skill = {}) {
  const desc = (skill.description || '').toLowerCase()
  const damageMatches = [...desc.matchAll(/(\d+)\s+damage/gi)]
  if (!damageMatches.length) return 0
  // Take the highest damage number mentioned
  const nums = damageMatches.map(m => Number(m[1])).filter(n => !Number.isNaN(n))
  return nums.length ? Math.max(...nums) : 0
}

function energyCost(skill = {}) {
  const energies = skill.energy || []
  const filtered = energies.filter(e => e && e.toLowerCase() !== 'none')
  return filtered.length || 1 // treat 0 as 1 for DPE
}

function buildDamageProfile(team = []) {
  const perChar = []

  team.forEach(char => {
    let bestBurst = 0
    let bestDPE = 0
    let bestCost = 0

      ; (char.skills || []).forEach(skill => {
        const dmg = extractSkillDamage(skill)
        if (!dmg) return
        const cost = energyCost(skill)
        const dpe = dmg / cost
        if (dmg > bestBurst) {
          bestBurst = dmg
          bestCost = cost
        }
        if (dpe > bestDPE) {
          bestDPE = dpe
        }
      })

    perChar.push({
      charId: char.id,
      bestBurst,
      bestDPE,
      bestCost
    })
  })

  const burstDamage = perChar.reduce((sum, c) => sum + c.bestBurst, 0)
  const dpeValues = perChar.map(c => c.bestDPE).filter(v => v > 0)
  const maxDPE = dpeValues.length ? Math.max(...dpeValues) : 0
  const avgDPE = dpeValues.length
    ? dpeValues.reduce((a, b) => a + b, 0) / dpeValues.length
    : 0
  const costToKill = perChar.reduce((sum, c) => sum + (c.bestCost || 0), 0) || null

  // Assume 3x100 HP enemies and that actual DPS is some fraction of burst
  const estimatedDps = burstDamage * 0.7
  let estimatedKillTurns = null
  if (estimatedDps > 0) {
    const turns = Math.round(300 / estimatedDps)
    estimatedKillTurns = clamp(turns, 1, 8)
  }

  return {
    burstDamage,
    maxDPE,
    avgDPE,
    costToKill,
    estimatedKillTurns
  }
}

// --- SIMULATION HELPERS (FOR HYBRID APPROACH) --------------------------------

/**
 * Create standardized benchmark teams for testing candidate performance
 * These represent common archetypes teams will face
 */
function createBenchmarkTeams(allCharacters) {
  // Define benchmark archetypes using well-known starter characters
  // These represent common team strategies in the game

  const benchmarks = [
    {
      name: 'Rush/Aggro',
      teamIds: [10, 3, 4], // Rock Lee, Uchiha Sasuke, Inuzuka Kiba
      description: 'High burst damage, fast kills'
    },
    {
      name: 'Control',
      teamIds: [7, 9, 5], // Nara Shikamaru, Yamanaka Ino, Aburame Shino
      description: 'Stuns, DoTs, disruption'
    },
    {
      name: 'Tank/Sustain',
      teamIds: [13, 2, 12], // Gaara, Haruno Sakura, Hyuuga Neji
      description: 'Defense, healing, outlast'
    },
    {
      name: 'Balanced',
      teamIds: [1, 6, 8], // Uzumaki Naruto, Hyuuga Hinata, Akimichi Chouji
      description: 'Mixed strategy, adaptable'
    }
  ]

  // Convert IDs to actual character objects
  return benchmarks.map(benchmark => {
    const team = benchmark.teamIds
      .map(id => allCharacters.find(c => c.id === id))
      .filter(c => c) // Remove nulls if character not found

    return {
      name: benchmark.name,
      description: benchmark.description,
      team
    }
  }).filter(b => b.team.length === 3) // Only include complete teams
}

/**
 * Simulate a candidate team against benchmark teams
 * Returns average performance metrics
 */
function simulateCandidatePerformance(candidateTeam, allCharacters) {
  if (!candidateTeam || candidateTeam.length < 3) {
    return {
      avgWinProbability: 0.5,
      avgHpDelta: 0,
      avgPressure: 0,
      confidence: 0 // low confidence if can't simulate
    }
  }

  const benchmarks = createBenchmarkTeams(allCharacters)

  if (benchmarks.length === 0) {
    // No benchmarks available, return neutral scores
    return {
      avgWinProbability: 0.5,
      avgHpDelta: 0,
      avgPressure: 0,
      confidence: 0
    }
  }

  try {
    let totalWinProb = 0
    let totalHpDelta = 0
    let totalPressure = 0
    let simCount = 0

    benchmarks.forEach(enemyTeam => {
      try {
        const gameState = new GameState()
        gameState.teams[0] = candidateTeam.map(c => new Character(c))
        gameState.teams[1] = enemyTeam.map(c => new Character(c))

        const analysis = analyzeGameStateSimulation(gameState, 0)
        totalHpDelta += analysis.hpDelta || 0
        totalPressure += analysis.overallScore || 0

        // Simple win probability heuristic based on overall score
        const winProb = 1 / (1 + Math.exp(-(analysis.overallScore || 0) / 50))
        totalWinProb += winProb
        simCount++
      } catch (err) {
        // Skip this benchmark if simulation fails
        console.warn('Benchmark simulation failed:', err)
      }
    })

    if (simCount === 0) {
      return {
        avgWinProbability: 0.5,
        avgHpDelta: 0,
        avgPressure: 0,
        confidence: 0
      }
    }

    return {
      avgWinProbability: totalWinProb / simCount,
      avgHpDelta: totalHpDelta / simCount,
      avgPressure: totalPressure / simCount,
      confidence: Math.min(simCount / 3, 1) // confidence scales with benchmark count
    }
  } catch (error) {
    console.warn('Simulation performance check failed:', error)
    return {
      avgWinProbability: 0.5,
      avgHpDelta: 0,
      avgPressure: 0,
      confidence: 0
    }
  }
}

/**
 * Calculate team flexibility score
 * Higher score = team can adapt to different matchups
 */
function calculateTeamFlexibility(team) {
  const analysis = analyzeTeam(team)
  let flexScore = 0

  // Diverse role distribution is more flexible
  const roleCount = Object.values(analysis.roles).filter(v => v > 0).length
  flexScore += roleCount * 8

  // Having multiple damage types is flexible
  const hasBurst = analysis.tempo.burstDamage > 100
  const hasDoT = (analysis.mechanics.stacking || 0) > 0
  const hasPiercing = (analysis.mechanics.piercing || 0) > 0
  if (hasBurst) flexScore += 10
  if (hasDoT) flexScore += 10
  if (hasPiercing) flexScore += 10

  // Multiple defensive options
  const defensiveCount = [
    analysis.mechanics.immunity || 0,
    analysis.mechanics.invulnerable || 0,
    analysis.mechanics.cleanse || 0,
    analysis.mechanics.statusShield || 0
  ].filter(v => v > 0).length
  flexScore += defensiveCount * 5

  // Energy diversity (not overly reliant on one color)
  const energyValues = Object.values(analysis.energyDistribution)
  const maxEnergy = Math.max(...energyValues, 1)
  const energyBalance = 1 - (maxEnergy / energyValues.reduce((a, b) => a + b, 1))
  flexScore += energyBalance * 15

  return clamp(flexScore, 0, 100)
}


// --- TEAM ANALYSIS ----------------------------------------------------------

export const analyzeTeam = (team) => {
  if (!team || team.length === 0) {
    return { ...DEFAULT_ANALYSIS }
  }

  const roles = { tank: 0, support: 0, control: 0, dps: 0 }
  const mechanics = { ...DEFAULT_ANALYSIS.mechanics }
  const energyDistribution = { ...DEFAULT_ANALYSIS.energyDistribution }
  const hookCounts = {
    setups: 0,
    payoffs: 0,
    sustain: 0,
    energySupport: 0,
    highCostThreats: 0
  }

  // Aggregate per-member info
  team.forEach(member => {
    const { roles: memberRoles, mechanics: memberMech, knowledge } = analyzeCharacter(member)

    Object.keys(roles).forEach(r => {
      roles[r] += memberRoles[r] || 0
    })

    Object.keys(mechanics).forEach(m => {
      mechanics[m] += memberMech[m] || 0
    })

      // Energy distribution
      ; (member.skills || []).forEach(skill => {
        ; (skill.energy || []).forEach(e => {
          const key = e && e.toLowerCase()
          if (energyDistribution[key] !== undefined) {
            energyDistribution[key] += 1
          }
        })
      })

    // Hooks from knowledge
    if (knowledge) {
      const tags = knowledge.combinedTags || []
      const hasHighCost = knowledge.skillProfiles?.some(s =>
        (s.tags || []).includes('highCost') || (s.tags || []).includes('finisher')
      )

      if (hasHighCost) hookCounts.highCostThreats += 1
      if (knowledge.hooks?.setups?.length) hookCounts.setups += 1
      if (knowledge.hooks?.payoffs?.length) hookCounts.payoffs += 1
      if (knowledge.hooks?.sustain?.length) hookCounts.sustain += 1
      if (knowledge.hooks?.energySupport?.length) hookCounts.energySupport += 1

      // Fallbacks from tags in case hooks were minimal
      if (tags.some(t => ['setup', 'mark', 'dot', 'affliction'].includes(t))) hookCounts.setups += 0.5
      if (tags.some(t => ['detonate', 'execute', 'finisher', 'piercing'].includes(t))) hookCounts.payoffs += 0.5
      if (tags.some(t => ['heal', 'cleanse', 'shield', 'invulnerable', 'sustain'].includes(t))) hookCounts.sustain += 0.5
    }
  })

  // Damage / tempo approximation
  const dmgProfile = buildDamageProfile(team)

  // Pressure rating: mix of burst, DPE and key mechanics
  let pressureRating = 0
  pressureRating += Math.min(dmgProfile.burstDamage, 150) / 150 * 45 // up to 45 pts from raw burst
  pressureRating += Math.min(dmgProfile.avgDPE, 25) / 25 * 25 // up to 25 pts from efficiency

  if (mechanics.stacking > 0) pressureRating += 8
  if (mechanics.stun > 0) pressureRating += 8
  if (mechanics.antiTank > 0 || mechanics.piercing > 0) pressureRating += 6
  pressureRating = clamp(Math.round(pressureRating), 0, 100)

  // Role balance score
  let roleScore = 0
  const roleValues = Object.values(roles)
  const nonZeroRoles = roleValues.filter(v => v > 0).length

  if (roles.dps >= 2) roleScore += 20
  if (roles.support >= 1 || roles.tank >= 1) roleScore += 15
  if (roles.control >= 1) roleScore += 10
  if (nonZeroRoles >= 3) roleScore += 10

  // Mechanics coverage score
  let mechanicScore = 0
  if (mechanics.stun > 0) mechanicScore += 18
  if (mechanics.cleanse > 0) mechanicScore += 16
  if (mechanics.statusShield > 0) mechanicScore += 16
  if (mechanics.stacking > 0) mechanicScore += 12
  if (mechanics.antiTank > 0 || mechanics.piercing > 0) mechanicScore += 12
  if (mechanics.immunity > 0 || mechanics.invulnerable > 0) mechanicScore += 10
  if (mechanics.antiAffliction > 0) mechanicScore += 14
  if (mechanics.energyGen > 0) mechanicScore += 8
  if (mechanics.counter > 0) mechanicScore += 6

  // Hook combo score
  const comboScore =
    Math.min(hookCounts.setups, hookCounts.payoffs) * 8 +
    Math.min(hookCounts.energySupport, hookCounts.highCostThreats) * 6 +
    Math.min(hookCounts.sustain, hookCounts.highCostThreats) * 4

  // --- Team-wide energy concentration penalty ---
  const coloredTotal =
    (energyDistribution.green || 0) +
    (energyDistribution.red || 0) +
    (energyDistribution.blue || 0) +
    (energyDistribution.white || 0)

  const maxColorCount = Math.max(
    energyDistribution.green || 0,
    energyDistribution.red || 0,
    energyDistribution.blue || 0,
    energyDistribution.white || 0,
    1
  )

  const dominantRatio = coloredTotal > 0 ? maxColorCount / coloredTotal : 0

  let energyTeamPenalty = 0
  if (dominantRatio >= 0.6) {
    // If 60%+ of your colored costs are the same color, start penalizing
    // e.g. triple heavy green team will get a noticeable hit
    energyTeamPenalty = (dominantRatio - 0.5) * 60  // max ~18 pts penalty if 80%+
  }

  // Synergy score: roles + mechanics + combos + a bit of tempo - energy concentration
  const synergyScoreRaw =
    roleScore +
    mechanicScore +
    Math.min(comboScore, 30) +
    pressureRating * 0.3 -
    energyTeamPenalty

  // Keep clamped version for backward compatibility and display
  const synergyScore = clamp(Math.round(synergyScoreRaw), 0, 100)

  // Strengths / weaknesses / strategies text
  const strengths = []
  const weaknesses = []
  const synergyHighlights = []
  const strategies = []

  // Highlights / strengths
  if (mechanics.stun > 0 && hookCounts.setups > 0) {
    synergyHighlights.push('Stun + setup synergy')
  } else if (mechanics.stun > 0) {
    synergyHighlights.push('Reliable crowd control (stuns)')
  }

  if (mechanics.stacking >= 2) {
    synergyHighlights.push('Affliction / DoT pressure')
  }

  if (mechanics.antiTank > 0 || mechanics.piercing > 0) {
    synergyHighlights.push('Tools vs heavy DR / tanks (anti-tank)')
  }

  if (hookCounts.energySupport > 0 && hookCounts.highCostThreats > 0) {
    synergyHighlights.push('Energy battery for high-cost skills')
  }

  if (mechanics.immunity > 0 || mechanics.invulnerable > 0 || mechanics.cleanse > 0) {
    synergyHighlights.push('Defensive tools to protect carries')
  }

  if (mechanics.stun > 0) strengths.push('Crowd control: stuns / disables')
  if (mechanics.stacking > 0) strengths.push('Attrition plan: damage-over-time / affliction')
  if (mechanics.cleanse > 0) strengths.push('Access to healing / cleanse vs DoT & debuffs')
  if (mechanics.antiTank > 0 || mechanics.piercing > 0) strengths.push('Can punch through DR / defensive teams')
  if (mechanics.energyGen > 0) strengths.push('Extra energy generation for long games')
  if (mechanics.immunity > 0 || mechanics.invulnerable > 0) strengths.push('Damage reduction / invulnerability available')
  if (pressureRating >= 70) strengths.push('High pressure: strong burst or sustained damage output')

  // Weaknesses & Warnings (anti-synergy detection)
  const warnings = []

  // Basic coverage gaps
  if (mechanics.cleanse === 0) weaknesses.push('No cleanse / healing vs affliction or DoT')
  if (mechanics.stun + mechanics.counter === 0) weaknesses.push('Very little control (no stuns or counters)')
  if (mechanics.antiTank === 0 && mechanics.piercing === 0) weaknesses.push('No direct tools vs DR / defensive walls')
  if (mechanics.immunity === 0 && mechanics.invulnerable === 0 && mechanics.cleanse === 0) {
    weaknesses.push('Low sustain: fragile in grindy matches')
  }

  // Energy problems
  if (hookCounts.highCostThreats > 1 && mechanics.energyGen === 0) {
    weaknesses.push('Energy hungry: many high-cost skills but no energy generation')
    warnings.push('⚠️ High energy requirements without support')
  }

  // Energy color bottleneck
  const totalEnergy = Object.values(energyDistribution).reduce((a, b) => a + b, 0)
  const energyEntries = Object.entries(energyDistribution)
  const dominantEnergy = energyEntries.find(([color, count]) => count >= totalEnergy * 0.6)
  if (dominantEnergy && totalEnergy >= 6) {
    warnings.push(`⚠️ Heavy reliance on ${dominantEnergy[0]} energy (${dominantEnergy[1]}/${totalEnergy} skills)`)
  }

  // Energy concentration warning
  if (energyTeamPenalty > 0) {
    weaknesses.push('Very concentrated chakra colors – team is prone to bad rolls')
  }

  // Too setup-heavy (no payoff)
  if (hookCounts.setups >= 2 && hookCounts.payoffs < 1) {
    warnings.push('⚠️ Multiple setup characters but weak payoff. Add a finisher or burst damage.')
  }

  // All defensive, no win condition
  if (roles.dps < 1 && dmgProfile.burstDamage < 80) {
    warnings.push('⚠️ Unclear win condition: very low damage output')
  }

  // Too fragile for an aggressive team
  if (dmgProfile.burstDamage >= 120 && mechanics.immunity === 0 && mechanics.invulnerable === 0) {
    weaknesses.push('High damage but fragile: no invulnerability or DR')
  }

  // Role imbalance: all same role
  const roleEntries = Object.entries(roles).filter(([, v]) => v > 0)
  if (roleEntries.length === 1 && team.length >= 2) {
    const [roleName] = roleEntries[0]
    warnings.push(`⚠️ All characters are ${roleName}s - consider role diversity`)
  }

  // Strategies / gameplans
  if (dmgProfile.burstDamage >= 120) {
    strategies.push('Burst priority target quickly, then snowball the fight')
  }
  if (mechanics.stacking > 0 && hookCounts.sustain > 0) {
    strategies.push('Apply DoTs / affliction and protect your team while they tick')
  }
  if (mechanics.stun > 0 && mechanics.energyGen > 0) {
    strategies.push('Lock key enemies with stuns while ramping energy advantage')
  }
  if (hookCounts.sustain >= 2 && dmgProfile.burstDamage < 100) {
    strategies.push('Play a grindy sustain game and outlast enemy resources')
  }
  if (strategies.length === 0) {
    strategies.push('Flexible composition: adapt your plan to the matchup')
  }

  return {
    roles,
    mechanics,
    energyDistribution,
    maxDPE: Math.round(dmgProfile.maxDPE * 10) / 10,
    avgDPE: Math.round(dmgProfile.avgDPE * 10) / 10,
    strengths,
    weaknesses,
    strategies,
    synergyHighlights,
    warnings,
    tempo: {
      estimatedKillTurns: dmgProfile.estimatedKillTurns,
      costToKill: dmgProfile.costToKill,
      burstDamage: dmgProfile.burstDamage,
      pressureRating
    },
    synergyScore,
    synergyScoreRaw
  }
}

// --- SYNERGY FOR SINGLE CANDIDATE ------------------------------------------

export const calculateSynergy = (team, candidate) => {
  const newTeam = [...team, candidate].slice(0, 3)
  const analysis = analyzeTeam(newTeam)
  return analysis.synergyScore
}

// --- SUGGESTIONS FOR BUILDING AROUND CURRENT TEAM ---------------------------

export const getSuggestions = (allCharacters, currentTeam, count = 5, ownedIds = null) => {
  if (currentTeam.length === 3) return []

  // For single-character builds, use the more sophisticated build-around logic
  if (currentTeam.length === 1) {
    return recommendPartnersForMain(currentTeam[0], allCharacters, ownedIds, count)
  }

  // For 2-character teams: Build around first (main), but consider full team synergy
  if (currentTeam.length === 2) {
    const [main, secondary] = currentTeam

    let candidates = allCharacters.filter(c =>
      !currentTeam.find(m => m.id === c.id)
    )

    // Filter by ownership if specified
    if (ownedIds) {
      candidates = candidates.filter(c => ownedIds.has(c.id))
    }

    // Score each candidate
    const scored = candidates.map(candidate => {
      // Partner fit with main (primary weight)
      const mainFit = scorePartnerFit(main, candidate)

      // Full team synergy (secondary weight)
      const teamAnalysis = analyzeTeam([...currentTeam, candidate])

      // Blend: 60% build-around main, 40% full team
      const blendedScore = (mainFit.score * 0.6) + (teamAnalysis.synergyScoreRaw * 0.4)

      return {
        ...candidate,
        buildAroundScore: mainFit.score,
        teamSynergyScore: teamAnalysis.synergyScore,
        synergyScore: Math.round(blendedScore),
        buildAroundNotes: mainFit.notes
      }
    })

    return scored
      .sort((a, b) => b.synergyScore - a.synergyScore)
      .slice(0, count)
  }

  // For 0 or 3+ character teams: shouldn't happen, but return empty
  return []
}

// --- BUILD-AROUND MAIN CHARACTER -------------------------------------------

const getPrimaryRoles = (char) => {
  const { roles } = analyzeCharacter(char)
  const entries = Object.entries(roles || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])

  if (!entries.length) return { primary: null, secondary: null }
  const [primary] = entries
  const secondary = entries[1] || null

  return {
    primary: primary[0],
    secondary: secondary ? secondary[0] : null
  }
}

const scorePartnerFit = (mainChar, candidate) => {
  const mainProfile = analyzeCharacter(mainChar)
  const candProfile = analyzeCharacter(candidate)

  const mainRoles = getPrimaryRoles(mainChar)
  const candRoles = getPrimaryRoles(candidate)

  let score = 0
  const notes = []

  const mMech = mainProfile.mechanics
  const cMech = candProfile.mechanics

  // Enhanced Role complementarity (more nuanced)
  if (mainRoles.primary === 'dps') {
    if (candRoles.primary === 'support') {
      score += 25;
      notes.push('brings sustain/utility to a carry')
    }
    if (candRoles.primary === 'tank') {
      score += 20;
      notes.push('frontline / protection for a glass cannon')
    }
    if (candRoles.primary === 'control') {
      score += 15;
      notes.push('adds control so your DPS can hit safely')
    }
    // Avoid double DPS without good reason
    if (candRoles.primary === 'dps' && !cMech.setup && !mMech.setup) {
      score -= 5
    }
  } else if (mainRoles.primary === 'support') {
    if (candRoles.primary === 'dps') {
      score += 25;
      notes.push('gives you a clear damage win condition')
    }
    if (candRoles.primary === 'control') {
      score += 20;
      notes.push('locks enemies while you sustain')
    }
    if (candRoles.primary === 'tank') {
      score += 15;
      notes.push('creates ultra-defensive sustain shell')
    }
  } else if (mainRoles.primary === 'control') {
    if (candRoles.primary === 'dps') {
      score += 25;
      notes.push('control + damage core')
    }
    if (candRoles.primary === 'tank') {
      score += 15;
      notes.push('frontline control style')
    }
    if (candRoles.primary === 'support') {
      score += 12;
      notes.push('sustainable control strategy')
    }
  } else if (mainRoles.primary === 'tank') {
    if (candRoles.primary === 'dps') {
      score += 20;
      notes.push('tank + carry core')
    }
    if (candRoles.primary === 'support') {
      score += 15;
      notes.push('very grindy, sustain-heavy core')
    }
    if (candRoles.primary === 'control') {
      score += 12;
      notes.push('defensive control shell')
    }
  }

  // Enhanced Mechanics synergy (manual-based)
  if (mMech.stun > 0 && cMech.setup > 0) {
    score += 15; notes.push('your stuns give them safe setup turns')
  }
  if (mMech.setup > 0 && cMech.stun > 0) {
    score += 15; notes.push('their stuns give your setup time to stack')
  }
  if (mMech.stacking > 0 && cMech.stun > 0) {
    score += 10; notes.push('control keeps enemies under your DoTs/affliction')
  }
  if (cMech.stacking > 0 && mMech.stun > 0) {
    score += 10; notes.push('your control keeps enemies under their DoTs/affliction')
  }
  if (mMech.antiTank > 0 && cMech.stacking > 0) {
    score += 10; notes.push('anti-tank tools plus DoTs to break defensive teams')
  }
  if (cMech.antiTank > 0 && mMech.stacking > 0) {
    score += 10; notes.push('DoTs plus anti-tank to punish DR/DD')
  }

  // Counter synergy - both have counters = more defensive flexibility
  if (mMech.counter > 0 && cMech.counter > 0) {
    score += 8; notes.push('multiple counters for defensive versatility')
  }

  // Achievement synergy - achievements need supporting play
  if (mMech.achievement > 0 && (cMech.stun > 0 || cMech.immunity > 0)) {
    score += 12; notes.push('protection/control to enable achievement conditions')
  }
  if (cMech.achievement > 0 && (mMech.stun > 0 || mMech.immunity > 0)) {
    score += 12; notes.push('your control/defense enables their achievement potential')
  }

  // AOE synergy - multiple AOE sources can dominate grouped teams
  if (mMech.aoe > 0 && cMech.aoe > 0) {
    score += 10; notes.push('dual AOE pressure overwhelming vs grouped enemies')
  }

  // Piercing + DoT combo (both ignore DR)
  if ((mMech.piercing > 0 || cMech.piercing > 0) && (mMech.stacking > 0 || cMech.stacking > 0)) {
    score += 8; notes.push('piercing + affliction bypasses all defensive layers')
  }

  // Energy battery
  const mainHasHighCost = mainProfile.knowledge?.skillProfiles?.some(sk =>
    (sk.tags || []).includes('highCost') || (sk.tags || []).includes('finisher')
  )
  const candHasEnergySupport = !!candProfile.knowledge?.hooks?.energySupport?.length
  const candHasHighCost = candProfile.knowledge?.skillProfiles?.some(sk =>
    (sk.tags || []).includes('highCost') || (sk.tags || []).includes('finisher')
  )
  const mainHasEnergySupport = !!mainProfile.knowledge?.hooks?.energySupport?.length

  if (mainHasHighCost && candHasEnergySupport) {
    score += 20; notes.push('acts as energy battery for your expensive skills')
  }
  if (candHasHighCost && mainHasEnergySupport) {
    score += 20; notes.push('your energy support enables their high-cost threats')
  }

  // Protect-the-carry (improved)
  const mainIsCarry =
    mainHasHighCost ||
    (mainRoles.primary === 'dps' && (mMech.piercing + mMech.stacking) > 0)
  const candIsCarry =
    candHasHighCost ||
    (candRoles.primary === 'dps' && (cMech.piercing + cMech.stacking) > 0)
  const candHasProtection =
    cMech.immunity > 0 || cMech.invulnerable > 0 || cMech.cleanse > 0 || cMech.statusShield > 0
  const mainHasProtection =
    mMech.immunity > 0 || mMech.invulnerable > 0 || mMech.cleanse > 0 || mMech.statusShield > 0

  if (mainIsCarry && candHasProtection) {
    score += 20; notes.push('can keep your main threat alive (invul / DR / cleanse / status shield)')
  }
  if (candIsCarry && mainHasProtection) {
    score += 15; notes.push('your protection keeps their threat alive')
  }

  // Enhanced Energy color distribution analysis
  const mainEnergy = { green: 0, red: 0, blue: 0, white: 0, black: 0 }
  const candEnergy = { green: 0, red: 0, blue: 0, white: 0, black: 0 }

  const countColors = (char, bucket) => {
    ; (char.skills || []).forEach(skill => {
      ; (skill.energy || []).forEach(e => {
        if (!e) return
        const key = e.toLowerCase()
        if (bucket[key] !== undefined) {
          bucket[key] += 1
        }
      })
    })
  }

  countColors(mainChar, mainEnergy)
  countColors(candidate, candEnergy)

  // Heavy overlap penalty (both use the same color a lot)
  let energyPenalty = 0
  let heavyOverlapCount = 0
  Object.keys(mainEnergy).forEach(color => {
    const mainHeavy = mainEnergy[color] >= 3   // main uses this color a lot
    const candHeavy = candEnergy[color] >= 2   // candidate also leans on it

    if (mainHeavy && candHeavy) {
      // Taijutsu/green triple-stacks are especially brick-prone
      const basePenalty = (color === 'green') ? 12 : 8
      energyPenalty += basePenalty
      heavyOverlapCount++
    }
  })

  // Extra penalty if BOTH chars are high-cost threats on the same color
  const shareAnyVeryHeavyColor = Object.keys(mainEnergy).some(
    color => mainEnergy[color] >= 3 && candEnergy[color] >= 3
  )
  if (shareAnyVeryHeavyColor && mainProfile.isEnergyHungry && candProfile.isEnergyHungry) {
    energyPenalty += 10
    heavyOverlapCount++
  }

  // Complementary energy bonus (they fill gaps in your energy curve)
  const mainDominant = Object.entries(mainEnergy).filter(([, v]) => v >= 3).map(([k]) => k)
  const candDominant = Object.entries(candEnergy).filter(([, v]) => v >= 3).map(([k]) => k)
  const overlapCount = mainDominant.filter(c => candDominant.includes(c)).length

  if (overlapCount === 0 && mainDominant.length > 0 && candDominant.length > 0) {
    score += 8; notes.push('complementary energy distribution - no color conflicts')
  }

  score -= energyPenalty
  if (energyPenalty > 0) {
    notes.push(`shares heavy energy color load (${heavyOverlapCount} color${heavyOverlapCount > 1 ? 's' : ''})`)
  }

  return { score, notes }
}

export const recommendPartnersForMain = (mainChar, allCharacters, ownedIds = null, maxResults = 15) => {
  if (!mainChar) return []

  const ownedSet = ownedIds
    ? new Set(Array.isArray(ownedIds) ? ownedIds : Array.from(ownedIds))
    : null

  const candidates = allCharacters
    .filter(c => c.id !== mainChar.id)
    .filter(c => !ownedSet || ownedSet.has(c.id))

  const scored = candidates.map(c => {
    const { score, notes } = scorePartnerFit(mainChar, c)
    return {
      ...c,
      buildAroundScore: score,
      buildAroundNotes: notes,
      synergyScore: score // For UI compatibility
    }
  })

  return scored
    .sort((a, b) => b.buildAroundScore - a.buildAroundScore)
    .slice(0, maxResults)
}

// --- COUNTER LOGIC (TAGS-BASED) --------------------------------------------

const deriveCounterNeeds = (enemyMechanics) => {
  const needs = {
    antiTank: 0,
    stacking: 0,
    cleanse: 0,
    stun: 0,
    immunity: 0,
    counter: 0,
    energyGen: 0,
    statusShield: 0,
    antiAffliction: 0,
    aoe: 0
  }

  // Baseline: some control, some anti-tank, some sustain is always useful
  needs.stun += 1
  needs.antiTank += 1
  needs.cleanse += 1

  // Tanky / DR-heavy / invul spam - need piercing and attrition
  if ((enemyMechanics.immunity || 0) >= 2 || (enemyMechanics.invulnerable || 0) >= 2) {
    needs.antiTank += 4  // Increased priority
    needs.stacking += 3  // DoTs wear them down
    needs.energyGen += 1 // Long game preparation
  }

  // Heavy affliction / DoT pressure - CRITICAL to counter
  if ((enemyMechanics.stacking || 0) >= 3) {
    needs.antiAffliction += 4  // Increased weight
    needs.cleanse += 3
    needs.stun += 2  // Interrupt their setup
    needs.statusShield += 2  // Prevent debuff application
  }

  // Stun / hard control spam - need immunity and status protection
  if ((enemyMechanics.stun || 0) >= 3 || (enemyMechanics.counter || 0) >= 2) {
    needs.statusShield += 4  // CRITICAL - can't play without this
    needs.immunity += 2
    needs.counter += 2  // Counter their counters
    needs.cleanse += 1
  }

  // Big AoE damage - need sustain and spread defense
  if ((enemyMechanics.aoe || 0) >= 3) {
    needs.cleanse += 3  // Heal through the damage
    needs.immunity += 2  // Reduce or block
    needs.aoe += 1  // Trade AOE for AOE
  }

  // High energy generation - deny their advantage
  if ((enemyMechanics.energyGen || 0) >= 2) {
    needs.stun += 3  // Lock down energy generators
    needs.counter += 2  // Punish their spam
    needs.energyGen += 2  // Keep pace
  }

  // Counter-heavy team - need status shields or invulnerability
  if ((enemyMechanics.counter || 0) >= 3) {
    needs.statusShield += 3
    needs.immunity += 2
    needs.stun += 1  // Prevent counter usage
  }

  // Setup-heavy (achievement/mark spam) - disrupt early
  if ((enemyMechanics.setup || 0) >= 2 || (enemyMechanics.achievement || 0) >= 1) {
    needs.stun += 3  // Interrupt setup
    needs.cleanse += 2  // Remove marks
    needs.antiTank += 1  // Ignore their buffs
  }

  // Piercing damage specialists - need raw HP and sustain
  if ((enemyMechanics.piercing || 0) >= 2) {
    needs.cleanse += 3  // Can't reduce, must heal
    needs.immunity += 1  // Some invulnerability helps
    needs.aoe += 1  // Kill before they kill you
  }

  return needs
}

const scoreCounterCandidateVsNeeds = (candidateMechanics, needs) => {
  let score = 0

  const apply = (key, weight) => {
    const have = candidateMechanics[key] || 0
    const need = needs[key] || 0
    if (!have || !need) return
    score += Math.min(have, need) * weight
  }

  // Critical mechanics (highest priority)
  apply('statusShield', 5)     // Essential vs stun spam
  apply('antiAffliction', 5)    // Essential vs DoT teams

  // High priority mechanics
  apply('antiTank', 4)          // Key vs defensive teams
  apply('cleanse', 4)           // Versatile sustain/counter

  // Medium priority mechanics
  apply('stun', 3)              // Good general control
  apply('stacking', 3)          // Attrition strategy

  // Support mechanics
  apply('immunity', 2)          // Defensive tool
  apply('counter', 2)           // Punish aggression
  apply('energyGen', 2)         // Long game prep
  apply('aoe', 2)               // Trade damage

  return score
}

export const scoreCounterCandidateByTags = (candidate, enemyTeam, currentTeam = []) => {
  if (!candidate || !enemyTeam || enemyTeam.length === 0) return 0

  const enemyAnalysis = analyzeTeam(enemyTeam)
  const needs = deriveCounterNeeds(enemyAnalysis.mechanics || {})

  const candidateProfile = analyzeCharacter(candidate)
  const counterFitScore = scoreCounterCandidateVsNeeds(candidateProfile.mechanics, needs)

  // Optional synergy bonus with your current picks
  let synergyBonus = 0
  if (currentTeam.length > 0) {
    const teamAnalysis = analyzeTeam([...currentTeam, candidate])
    const synergyScore = teamAnalysis.synergyScore || 0
    synergyBonus = synergyScore * 0.25
  }

  return Math.max(0, Math.round(counterFitScore * 10 + synergyBonus))
}

export const explainCounterFitByTags = (candidate, enemyTeam) => {
  if (!candidate || !enemyTeam || enemyTeam.length === 0) {
    return 'No enemy team to counter.'
  }

  const enemyAnalysis = analyzeTeam(enemyTeam)
  const needs = deriveCounterNeeds(enemyAnalysis.mechanics || {})
  const profile = analyzeCharacter(candidate)
  const m = profile.mechanics

  const reasons = []
  if ((needs.antiTank || 0) > 0 && (m.antiTank || m.piercing)) {
    reasons.push('✓ Anti-tank tools vs their DR/defenses')
  }
  if ((needs.stacking || 0) > 0 && m.stacking) {
    reasons.push('✓ Affliction / DoT pressure vs defensive teams')
  }
  if ((needs.cleanse || 0) > 0 && m.cleanse) {
    reasons.push('✓ Cleanse / sustain vs their affliction / DoT')
  }
  if ((needs.stun || 0) > 0 && m.stun) {
    reasons.push('✓ Crowd control to slow their combo')
  }
  if ((needs.statusShield || 0) > 0 && m.statusShield) {
    reasons.push('✓ Status shield to ignore harmful effects')
  }
  if ((needs.immunity || 0) > 0 && (m.immunity || m.invulnerable)) {
    reasons.push('✓ DR / invulnerability vs their control')
  }
  if ((needs.counter || 0) > 0 && m.counter) {
    reasons.push('✓ Counters / reflection vs key enemy skills')
  }
  if ((needs.antiAffliction || 0) > 0 && m.antiAffliction) {
    reasons.push('✓ Ignores harmful non-conditional affliction damage')
  }
  if ((needs.energyGen || 0) > 0 && m.energyGen) {
    reasons.push('✓ Extra energy to keep up in longer matches')
  }

  if (!reasons.length) {
    reasons.push('General good mechanics vs this team')
  }

  return reasons.join(' | ')
}

export const recommendCounterCandidatesByTags = (
  enemyTeam,
  allCharacters,
  ownedIds = null,
  currentTeam = [],
  maxResults = 15
) => {
  if (!enemyTeam || enemyTeam.length === 0) return []

  const ownedSet = ownedIds
    ? new Set(Array.isArray(ownedIds) ? ownedIds : Array.from(ownedIds))
    : null

  const availableChars = allCharacters.filter(c =>
    (!ownedSet || ownedSet.has(c.id)) &&
    !enemyTeam.find(e => e.id === c.id) &&
    !currentTeam.find(t => t.id === c.id)
  )

  const scored = availableChars.map(char => {
    const score = scoreCounterCandidateByTags(char, enemyTeam, currentTeam)
    const reason = explainCounterFitByTags(char, enemyTeam)
    return { ...char, counterScoreByTags: score, counterReasonByTags: reason }
  })

  return scored
    .sort((a, b) => b.counterScoreByTags - a.counterScoreByTags)
    .slice(0, maxResults)
}

// Dev-only sanity helper to verify new mechanics tagging
export const logMechanicSanityChecks = (allCharacters = []) => {
  const sampleNames = [
    'Yamanaka Ino (S)',
    'Mitarashi Anko (B)',
    'Kankuro (S)'
  ]

  const findCharByName = (name) => allCharacters.find(c => c.name === name)

  sampleNames.forEach(name => {
    const char = findCharByName(name)
    if (!char) {
      console.log(`[sanity] ${name}: character not found in provided roster`)
      return
    }

    const profile = analyzeCharacter(char)
    const mech = profile.mechanics || {}

    console.log(
      `[sanity] ${name}: statusShield=${mech.statusShield || 0}, antiAffliction=${mech.antiAffliction || 0}`
    )
  })
}

// --- OPTIONAL: WRAP BASE ANALYSIS WITH SIMULATION ENGINE --------------------

export const analyzeTeamWithSimulation = (team, enemyTeam = null) => {
  const baseAnalysis = analyzeTeam(team)

  if (!enemyTeam || enemyTeam.length === 0) {
    return { ...baseAnalysis, simulation: null }
  }

  try {
    const gameState = new GameState()
    gameState.teams[0] = team.map(c => new Character(c))
    gameState.teams[1] = enemyTeam.map(c => new Character(c))

    const simAnalysis = analyzeGameStateSimulation(gameState, 0)

    return {
      ...baseAnalysis,
      simulation: {
        hpDelta: simAnalysis.hpDelta,
        killThreat: simAnalysis.killThreat,
        energyEfficiency: simAnalysis.energyEfficiency,
        cooldownPressure: simAnalysis.cooldownPressure,
        overallScore: simAnalysis.overallScore
      }
    }
  } catch (error) {
    console.warn('Simulation engine failed, using base analysis:', error)
    return { ...baseAnalysis, simulation: null }
  }
}
