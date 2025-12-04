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

function extractSkillDamage (skill = {}) {
  const desc = (skill.description || '').toLowerCase()
  const damageMatches = [...desc.matchAll(/(\d+)\s+damage/gi)]
  if (!damageMatches.length) return 0
  // Take the highest damage number mentioned
  const nums = damageMatches.map(m => Number(m[1])).filter(n => !Number.isNaN(n))
  return nums.length ? Math.max(...nums) : 0
}

function energyCost (skill = {}) {
  const energies = skill.energy || []
  const filtered = energies.filter(e => e && e.toLowerCase() !== 'none')
  return filtered.length || 1 // treat 0 as 1 for DPE
}

function buildDamageProfile (team = []) {
  const perChar = []

  team.forEach(char => {
    let bestBurst = 0
    let bestDPE = 0
    let bestCost = 0

    ;(char.skills || []).forEach(skill => {
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
    ;(member.skills || []).forEach(skill => {
      ;(skill.energy || []).forEach(e => {
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

  // Synergy score: roles + mechanics + combos + a bit of tempo
  let synergyScore =
    roleScore +
    mechanicScore +
    Math.min(comboScore, 30) +
    pressureRating * 0.3

  synergyScore = clamp(Math.round(synergyScore), 0, 100)

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

  // Weaknesses
  if (mechanics.cleanse === 0) weaknesses.push('No cleanse / healing vs affliction or DoT')
  if (mechanics.stun + mechanics.counter === 0) weaknesses.push('Very little control (no stuns or counters)')
  if (mechanics.antiTank === 0 && mechanics.piercing === 0) weaknesses.push('No direct tools vs DR / defensive walls')
  if (mechanics.immunity === 0 && mechanics.invulnerable === 0 && mechanics.cleanse === 0) {
    weaknesses.push('Low sustain: fragile in grindy matches')
  }
  if (hookCounts.highCostThreats > 1 && mechanics.energyGen === 0) {
    weaknesses.push('Energy hungry: many high-cost skills but no energy generation')
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
    warnings: [],
    tempo: {
      estimatedKillTurns: dmgProfile.estimatedKillTurns,
      costToKill: dmgProfile.costToKill,
      burstDamage: dmgProfile.burstDamage,
      pressureRating
    },
    synergyScore
  }
}

// --- SYNERGY FOR SINGLE CANDIDATE ------------------------------------------

export const calculateSynergy = (team, candidate) => {
  const newTeam = [...team, candidate].slice(0, 3)
  const analysis = analyzeTeam(newTeam)
  return analysis.synergyScore
}

// --- SUGGESTIONS FOR BUILDING AROUND CURRENT TEAM ---------------------------

export const getSuggestions = (allCharacters, currentTeam, count = 5) => {
  if (currentTeam.length === 3) return []
  const candidates = allCharacters.filter(c => !currentTeam.find(m => m.id === c.id))
  const scored = candidates.map(char => ({
    ...char,
    synergyScore: calculateSynergy(currentTeam, char)
  }))
  return scored.sort((a, b) => b.synergyScore - a.synergyScore).slice(0, count)
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

  // Role complementarity
  if (mainRoles.primary === 'dps') {
    if (candRoles.primary === 'support') { score += 25; notes.push('brings sustain/utility to a carry') }
    if (candRoles.primary === 'tank') { score += 20; notes.push('frontline / protection for a glass cannon') }
    if (candRoles.primary === 'control') { score += 15; notes.push('adds control so your DPS can hit safely') }
  } else if (mainRoles.primary === 'support') {
    if (candRoles.primary === 'dps') { score += 25; notes.push('gives you a clear damage win condition') }
    if (candRoles.primary === 'control') { score += 20; notes.push('locks enemies while you sustain') }
  } else if (mainRoles.primary === 'control') {
    if (candRoles.primary === 'dps') { score += 25; notes.push('control + damage core') }
    if (candRoles.primary === 'tank') { score += 15; notes.push('frontline control style') }
  } else if (mainRoles.primary === 'tank') {
    if (candRoles.primary === 'dps') { score += 20; notes.push('tank + carry core') }
    if (candRoles.primary === 'support') { score += 15; notes.push('very grindy, sustain-heavy core') }
  }

  // Mechanics synergy (manual-based)
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

  // Energy battery
  const mainHasHighCost = mainProfile.knowledge?.skillProfiles?.some(sk =>
    (sk.tags || []).includes('highCost') || (sk.tags || []).includes('finisher')
  )
  const candHasEnergySupport = !!candProfile.knowledge?.hooks?.energySupport?.length

  if (mainHasHighCost && candHasEnergySupport) {
    score += 20; notes.push('acts as energy battery for your expensive skills')
  }

  // Protect-the-carry
  const mainIsCarry =
    mainHasHighCost ||
    (mainRoles.primary === 'dps' && (mMech.piercing + mMech.stacking) > 0)
  const candHasProtection =
    cMech.immunity > 0 || cMech.invulnerable > 0 || cMech.cleanse > 0

  if (mainIsCarry && candHasProtection) {
    score += 20; notes.push('can keep your main threat alive (invul / DR / cleanse)')
  }

  // Energy color overlap penalty
  const mainEnergy = { green: 0, red: 0, blue: 0, white: 0 }
  const candEnergy = { green: 0, red: 0, blue: 0, white: 0 }

  const countColors = (char, bucket) => {
    ;(char.skills || []).forEach(skill => {
      ;(skill.energy || []).forEach(e => {
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

  let energyPenalty = 0
  Object.keys(mainEnergy).forEach(color => {
    if (mainEnergy[color] >= 4 && candEnergy[color] >= 3) {
      energyPenalty += 10
    }
  })
  score -= energyPenalty
  if (energyPenalty > 0) {
    notes.push('shares a very heavy energy color load with the main')
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
      buildAroundNotes: notes
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
    antiAffliction: 0
  }

  // Baseline: some control, some anti-tank, some sustain is always useful
  needs.stun += 1
  needs.antiTank += 1
  needs.cleanse += 1

  // Tanky / DR-heavy / invul spam
  if ((enemyMechanics.immunity || 0) >= 2 || (enemyMechanics.invulnerable || 0) >= 2) {
    needs.antiTank += 3
    needs.stacking += 2
  }

  // Heavy affliction / DoT pressure
  if ((enemyMechanics.stacking || 0) >= 3) {
    needs.antiAffliction += 3
    needs.cleanse += 2
    needs.stun += 1
  }

  // Stun / hard control spam
  if ((enemyMechanics.stun || 0) >= 3 || (enemyMechanics.counter || 0) >= 2) {
    needs.statusShield += 3
    needs.immunity += 1
    needs.counter += 2
    needs.cleanse += 1
  }

  // Big AoE damage
  if ((enemyMechanics.aoe || 0) >= 3) {
    needs.cleanse += 2
    needs.immunity += 1
  }

  // High energy generation
  if ((enemyMechanics.energyGen || 0) >= 2) {
    needs.stun += 2
    needs.counter += 1
    needs.energyGen += 1
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

  apply('antiTank', 4)
  apply('stacking', 3)
  apply('cleanse', 3)
  apply('stun', 3)
  apply('immunity', 2)
  apply('counter', 2)
  apply('energyGen', 2)
  apply('statusShield', 4)
  apply('antiAffliction', 4)

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
