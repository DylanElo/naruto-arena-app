/**
 * KNOWLEDGE ENGINE v3
 * 
 * Uses structured skill_effects.json for accurate character analysis.
 * No more regex parsing - directly reads pre-computed skill data.
 */

import characters from '../data/characters.json'
import skillEffectsData from '../data/skill_effects.json'

// Load the structured skill effects
const SKILL_EFFECTS = skillEffectsData?.skills || {}

/**
 * Get structured skill effect by character ID and skill index
 */
function getSkillEffect(characterId, skillIndex) {
  const key = `${characterId}_${skillIndex}`
  return SKILL_EFFECTS[key] || null
}

/**
 * Build character profile from structured skill data
 * No regex - just reads from skill_effects.json
 */
function buildProfileFromStructuredData(char) {
  const mechanics = {
    // Damage types
    normal: 0,
    piercing: 0,
    affliction: 0,
    healthSteal: 0,
    burst: 0,
    dot: 0,
    aoe: 0,

    // Defense
    damageReduction: 0,
    destructibleDefense: 0,
    invulnerable: 0,
    heal: 0,
    cleanse: 0,

    // Control
    stun: 0,
    energyRemoval: 0,
    counter: 0,
    reflect: 0,

    // Resource
    energyGain: 0
  }

  const roles = { dps: 0, tank: 0, support: 0, control: 0 }
  const hooks = {
    createsMark: false,
    createsStun: false,
    needsStunnedTarget: false,
    needsMarkedTarget: false
  }

  const skillProfiles = []
  let totalDamage = 0
  let totalHeal = 0
  let totalDefense = 0
  let totalControl = 0

    // Process each skill using structured data
    ; (char.skills || []).forEach((skill, skillIndex) => {
      const structured = getSkillEffect(char.id, skillIndex)

      if (!structured) {
        // Fallback: no structured data available for this skill
        skillProfiles.push({
          name: skill.name,
          tags: [],
          damage: 0,
          effects: {}
        })
        return
      }

      const tags = []
      const damage = structured.damage?.base || 0
      const damageType = structured.damage?.type || 'normal'
      const effects = structured.effects || {}
      const flags = structured.flags || {}

      // Count damage types
      if (damage > 0) {
        totalDamage += damage

        if (damageType === 'piercing') {
          mechanics.piercing++
          tags.push('piercing')
        } else if (damageType === 'affliction') {
          mechanics.affliction++
          tags.push('affliction')
        } else if (damageType === 'healthSteal') {
          mechanics.healthSteal++
          tags.push('healthSteal', 'sustain')
        } else {
          mechanics.normal++
        }

        // Burst detection
        if (flags.isBurst) {
          mechanics.burst++
          tags.push('finisher')
        }

        // DoT detection
        if (flags.isDot) {
          mechanics.dot++
          tags.push('dot')
        }

        // AoE detection
        if (flags.isAoE) {
          mechanics.aoe++
          tags.push('aoe')
        }
      }

      // Defense mechanics
      if (effects.damageReduction) {
        mechanics.damageReduction++
        totalDefense += effects.damageReduction.amount || 0
        tags.push('shield')
      }

      if (effects.destructibleDefense) {
        mechanics.destructibleDefense++
        totalDefense += effects.destructibleDefense.amount || 0
        tags.push('defense')
      }

      if (effects.invulnerable) {
        mechanics.invulnerable++
        totalDefense += 25 // Invuln is worth ~25 effective HP
        tags.push('invulnerable')
      }

      // Heal detection - from structured data, not regex!
      if (effects.heal) {
        mechanics.heal++
        totalHeal += effects.heal.amount || 0
        tags.push('heal', 'sustain')
      }

      // Cleanse - check the original description for "removing harmful"
      // This is one spot where we still need text check, but structured effects could include this
      const desc = structured._originalDescription || ''
      if (/remov(?:es?|ing).{0,30}harmful/i.test(desc)) {
        mechanics.cleanse++
        tags.push('cleanse')
      }

      // Control mechanics
      if (effects.stun) {
        mechanics.stun++
        totalControl += effects.stun.duration || 1
        tags.push('stun')
        hooks.createsStun = true
      }

      if (effects.energyRemoval) {
        mechanics.energyRemoval++
        totalControl += effects.energyRemoval.amount || 1
        tags.push('energyDeny')
      }

      // Resource mechanics
      if (effects.energyGain) {
        mechanics.energyGain++
        tags.push('energyGain')
      }

      // Flags
      if (flags.ignoresInvulnerability) tags.push('ignoresInvuln')
      if (flags.cannotBeCountered) tags.push('unCounterable')

      // Conditional damage (marks)
      if (structured.damage?.conditional) {
        hooks.createsMark = true
        tags.push('setup')
      }

      // Energy cost check for 'highCost' tag
      const energyCost = structured.cost?.total || 0
      if (energyCost >= 3) tags.push('highCost')

      skillProfiles.push({
        name: skill.name,
        tags,
        damage,
        damageType,
        effects: structured.effects,
        flags: structured.flags,
        cost: structured.cost,
        cooldown: structured.cooldown
      })
    })

  // Calculate roles based on actual mechanics
  // DPS: Total damage potential
  roles.dps = Math.min(5, Math.round(totalDamage / 30))

  // Tank: Defense capabilities (DR + DD + Invuln)
  roles.tank = Math.min(5, Math.round(totalDefense / 20))

  // Support: Healing and cleanse
  roles.support = Math.min(5,
    (mechanics.heal > 0 ? 2 : 0) +
    (mechanics.cleanse > 0 ? 2 : 0) +
    (mechanics.energyGain > 0 ? 1 : 0)
  )

  // Control: Stuns and energy denial
  roles.control = Math.min(5,
    (mechanics.stun * 2) +
    (mechanics.energyRemoval)
  )

  return {
    roles,
    mechanics,
    hooks,
    skillProfiles,
    energy: {
      colors: {}  // Could compute from structured data if needed
    }
  }
}

/**
 * Map mechanics to legacy format for backwards compatibility
 */
function mapMechanics(mech) {
  return {
    counter: (mech.counter || 0) + (mech.reflect || 0),
    invisible: 0,
    immunity: 0,
    piercing: mech.piercing || 0,
    punisher: 0,
    antiTank: mech.piercing || 0,
    cleanse: mech.cleanse || 0,
    aoe: mech.aoe || 0,
    stacking: (mech.dot || 0) + (mech.affliction || 0),
    energyGen: mech.energyGain || 0,
    skillSteal: 0,
    stun: mech.stun || 0,
    invulnerable: mech.invulnerable || 0,
    statusShield: 0,
    antiAffliction: 0,
    triggerOnAction: 0,
    triggerOnHit: 0,
    achievement: 0,
    setup: 0,
    sustain: (mech.heal || 0) + (mech.healthSteal || 0),
    defense: (mech.damageReduction || 0) + (mech.destructibleDefense || 0)
  }
}

/**
 * Build hooks object for synergy detection
 */
function mapHooks(profile) {
  const setups = []
  const payoffs = []
  const sustain = []
  const energySupport = []

  const mech = profile.mechanics
  const hooks = profile.hooks

  // Setups
  if (hooks.createsMark) setups.push('mark')
  if (hooks.createsStun) setups.push('stun')
  if (mech.dot > 0) setups.push('dot')
  if (mech.affliction > 0) setups.push('affliction')

  // Payoffs
  if (mech.burst > 0) payoffs.push('finisher')
  if (mech.piercing > 0) payoffs.push('piercing')
  if (hooks.needsStunnedTarget || hooks.needsMarkedTarget) payoffs.push('conditional')

  // Sustain
  if (mech.heal > 0 || mech.healthSteal > 0) sustain.push('sustain')
  if (mech.cleanse > 0) sustain.push('cleanse')

  // Energy
  if (mech.energyGain > 0) energySupport.push('gain')

  return { setups, payoffs, sustain, energySupport }
}

/**
 * Build the complete knowledge base from structured data
 */
export function buildKnowledgeBase(charList = characters) {
  const knowledge = {}

  charList.forEach(char => {
    // Build profile from structured skill effects (no regex!)
    const profile = buildProfileFromStructuredData(char)

    // Map to legacy format for compatibility
    const legacyMechanics = mapMechanics(profile.mechanics)
    const hooks = mapHooks(profile)
    const combinedTags = Array.from(new Set(
      profile.skillProfiles.flatMap(s => s.tags)
    ))

    knowledge[char.id] = {
      id: char.id,
      name: char.name,

      // Legacy shape (backwards compatible)
      roles: profile.roles,
      mechanics: legacyMechanics,
      hooks,
      combinedTags,
      skillProfiles: profile.skillProfiles,

      // V3 Data (structured, accurate)
      profile
    }
  })

  return knowledge
}

// Build knowledge base at module load time
export const CHARACTER_KNOWLEDGE = buildKnowledgeBase()

/**
 * Get knowledge for a specific character
 */
export function getCharacterKnowledge(charId) {
  return CHARACTER_KNOWLEDGE[charId]
}

/**
 * Debug: Check if a character has specific mechanics
 */
export function debugCharacterMechanics(charId) {
  const knowledge = CHARACTER_KNOWLEDGE[charId]
  if (!knowledge) return null

  return {
    name: knowledge.name,
    roles: knowledge.roles,
    mechanics: knowledge.mechanics,
    tags: knowledge.combinedTags,
    skills: knowledge.skillProfiles.map(s => ({
      name: s.name,
      tags: s.tags,
      damage: s.damage
    }))
  }
}
