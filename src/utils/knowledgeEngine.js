/**
 * KNOWLEDGE ENGINE v4
 * 
 * Uses structured skill_effects.json for accurate character analysis.
 * Enhanced with comprehensive effect taxonomy from naruto-unison reference.
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
 * Uses enhanced effect taxonomy from naruto-unison
 */
function buildProfileFromStructuredData(char) {
  const mechanics = {
    // === DAMAGE TYPES ===
    normal: 0,
    piercing: 0,
    affliction: 0,
    healthSteal: 0,
    burst: 0,
    dot: 0,
    aoe: 0,

    // === DEFENSE ===
    damageReduction: 0,
    destructibleDefense: 0,
    invulnerable: 0,
    heal: 0,
    cleanse: 0,
    endure: 0,           // Can't die (health stays at 1)
    damageToDefense: 0,  // Convert damage to defense
    threshold: 0,        // Nullify low damage

    // === CONTROL ===
    stun: 0,
    stunAll: 0,          // Full stun
    stunPartial: 0,      // Partial stun (specific classes)
    energyRemoval: 0,
    energyGain: 0,
    snare: 0,            // Increase cooldowns
    silence: 0,          // No non-damage effects

    // === ANTI-MECHANICS ===
    expose: 0,           // Prevent DR/invuln
    seal: 0,             // Ignore helpful effects
    plague: 0,           // Can't be healed
    weaken: 0,           // Deal less damage
    exhaust: 0,          // Skills cost more

    // === BUFF/DEBUFF ===
    strengthen: 0,       // Deal more damage
    enrage: 0,           // Ignore harmful effects
    focus: 0,            // Ignore stuns
    boost: 0,            // Multiply ally effects

    // === COUNTER/REFLECT ===
    counter: 0,
    reflect: 0,
    trap: 0,             // Conditional trigger

    // === SPECIAL ===
    absorb: 0,           // Gain chakra when targeted
    redirect: 0,         // Redirect skills
    bypass: 0            // Ignore invulnerability
  }

  const roles = { dps: 0, tank: 0, support: 0, control: 0 }
  const hooks = {
    createsMark: false,
    createsStun: false,
    createsExpose: false,
    needsStunnedTarget: false,
    needsMarkedTarget: false,
    providesEnrage: false,
    providesFocus: false
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

      // === COUNT DAMAGE TYPES ===
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

        if (flags.isBurst) {
          mechanics.burst++
          tags.push('finisher')
        }
        if (flags.isDot) {
          mechanics.dot++
          tags.push('dot')
        }
        if (flags.isAoE) {
          mechanics.aoe++
          tags.push('aoe')
        }
      }

      // === DEFENSE MECHANICS ===
      if (effects.damageReduction || effects.reduce) {
        mechanics.damageReduction++
        totalDefense += effects.damageReduction?.amount || effects.reduce?.amount || 0
        tags.push('shield')
      }

      if (effects.destructibleDefense) {
        mechanics.destructibleDefense++
        totalDefense += effects.destructibleDefense.amount || 0
        tags.push('defense')
      }

      if (effects.invulnerable) {
        mechanics.invulnerable++
        totalDefense += 25 // Invuln worth ~25 effective HP
        tags.push('invulnerable')
      }

      if (effects.endure) {
        mechanics.endure++
        tags.push('endure', 'sustain')
      }

      if (effects.damageToDefense) {
        mechanics.damageToDefense++
        tags.push('damageToDefense')
      }

      if (effects.threshold) {
        mechanics.threshold++
        tags.push('threshold')
      }

      // === HEALING ===
      if (effects.heal) {
        mechanics.heal++
        totalHeal += effects.heal.amount || 0
        tags.push('heal', 'sustain')
      }

      if (effects.cleanse) {
        mechanics.cleanse++
        tags.push('cleanse')
      }

      // Check original description for cleanse patterns
      const desc = structured._originalDescription || ''
      if (/remov(?:es?|ing).{0,30}harmful/i.test(desc)) {
        if (!tags.includes('cleanse')) {
          mechanics.cleanse++
          tags.push('cleanse')
        }
      }

      // === CONTROL MECHANICS ===
      if (effects.stun) {
        mechanics.stun++
        totalControl += effects.stun.duration || 1
        tags.push('stun')
        hooks.createsStun = true

        if (effects.stun.type === 'all') {
          mechanics.stunAll++
          tags.push('stunAll')
        } else {
          mechanics.stunPartial++
          tags.push('stunPartial')
        }
      }

      if (effects.energyRemoval) {
        mechanics.energyRemoval++
        totalControl += effects.energyRemoval.amount || 1
        tags.push('energyDeny')
      }

      if (effects.snare) {
        mechanics.snare++
        totalControl += effects.snare.amount || 1
        tags.push('snare')
      }

      if (effects.silence) {
        mechanics.silence++
        totalControl += 1
        tags.push('silence')
      }

      // === ANTI-MECHANICS (debuffs) ===
      if (effects.expose) {
        mechanics.expose++
        tags.push('expose', 'antiTank')
        hooks.createsExpose = true
      }

      if (effects.seal) {
        mechanics.seal++
        tags.push('seal')
      }

      if (effects.plague) {
        mechanics.plague++
        tags.push('plague', 'antiHeal')
      }

      if (effects.weaken) {
        mechanics.weaken++
        tags.push('weaken')
      }

      if (effects.exhaust) {
        mechanics.exhaust++
        tags.push('exhaust')
      }

      // === BUFF MECHANICS ===
      if (effects.strengthen) {
        mechanics.strengthen++
        tags.push('strengthen')
      }

      if (effects.enrage) {
        mechanics.enrage++
        tags.push('enrage')
        hooks.providesEnrage = true
      }

      if (effects.focus) {
        mechanics.focus++
        tags.push('focus')
        hooks.providesFocus = true
      }

      if (effects.boost) {
        mechanics.boost++
        tags.push('boost')
      }

      // === COUNTER/REFLECT ===
      if (effects.reflect || effects.reflectAll) {
        mechanics.reflect++
        tags.push('reflect')
      }

      if (effects.counter || flags.hasCounter) {
        mechanics.counter++
        tags.push('counter')
      }

      if (flags.hasTrap) {
        mechanics.trap++
        tags.push('trap')
      }

      // === SPECIAL MECHANICS ===
      if (effects.absorb) {
        mechanics.absorb++
        tags.push('absorb')
      }

      if (effects.redirect) {
        mechanics.redirect++
        tags.push('redirect')
      }

      if (effects.bypass || flags.ignoresInvulnerability) {
        mechanics.bypass++
        tags.push('bypass', 'ignoresInvuln')
      }

      // === RESOURCE MECHANICS ===
      if (effects.energyGain) {
        mechanics.energyGain++
        tags.push('energyGain')
      }

      // === FLAGS ===
      if (flags.cannotBeCountered || flags.isUncounterable) tags.push('unCounterable')
      if (flags.isSoulbound) tags.push('soulbound')
      if (flags.isInvisible) tags.push('invisible')

      // Conditional damage = setup
      if (structured.damage?.conditional) {
        hooks.createsMark = true
        tags.push('setup')
      }

      // Energy cost check
      const energyCost = structured.cost?.total || 0
      if (energyCost >= 3) tags.push('highCost')
      if (energyCost === 0) tags.push('free')

      skillProfiles.push({
        name: skill.name,
        tags,
        damage,
        damageType,
        effects: structured.effects,
        flags: structured.flags,
        cost: structured.cost,
        cooldown: structured.cooldown,
        targeting: structured.targeting
      })
    })

  // === CALCULATE ROLES ===

  // DPS: Total damage potential
  roles.dps = Math.min(5, Math.round(totalDamage / 30))

  // Tank: Defense capabilities (DR + DD + Invuln + Endure)
  roles.tank = Math.min(5, Math.round(totalDefense / 20) + (mechanics.endure > 0 ? 1 : 0))

  // Support: Healing, cleanse, energy, and ally buffs
  roles.support = Math.min(5,
    (mechanics.heal > 0 ? 2 : 0) +
    (mechanics.cleanse > 0 ? 2 : 0) +
    (mechanics.energyGain > 0 ? 1 : 0) +
    (mechanics.boost > 0 ? 1 : 0)
  )

  // Control: Stuns, energy denial, cooldown manipulation, debuffs
  roles.control = Math.min(5,
    (mechanics.stunAll * 2) +
    (mechanics.stunPartial) +
    (mechanics.energyRemoval) +
    (mechanics.snare > 0 ? 1 : 0) +
    (mechanics.silence > 0 ? 1 : 0) +
    (mechanics.expose > 0 ? 1 : 0)
  )

  return {
    roles,
    mechanics,
    hooks,
    skillProfiles,
    energy: {
      colors: {}
    }
  }
}

/**
 * Map mechanics to legacy format for backwards compatibility
 */
function mapMechanics(mech) {
  return {
    // Combat
    counter: (mech.counter || 0) + (mech.reflect || 0),
    invisible: 0,
    immunity: mech.enrage || 0,
    piercing: mech.piercing || 0,
    bypass: mech.bypass || 0,

    // Anti-mechanics
    punisher: 0,
    antiTank: (mech.piercing || 0) + (mech.expose || 0),
    antiHeal: mech.plague || 0,

    // Control
    stun: mech.stun || 0,
    stunAll: mech.stunAll || 0,
    stunPartial: mech.stunPartial || 0,
    snare: mech.snare || 0,
    silence: mech.silence || 0,

    // Defense
    invulnerable: mech.invulnerable || 0,
    damageReduction: mech.damageReduction || 0,
    destructibleDefense: mech.destructibleDefense || 0,
    endure: mech.endure || 0,
    threshold: mech.threshold || 0,

    // Support
    cleanse: mech.cleanse || 0,
    heal: mech.heal || 0,
    sustain: (mech.heal || 0) + (mech.healthSteal || 0) + (mech.endure || 0),

    // Resource
    energyGen: mech.energyGain || 0,
    energyDeny: mech.energyRemoval || 0,
    absorb: mech.absorb || 0,

    // Buffs/Debuffs
    enrage: mech.enrage || 0,
    focus: mech.focus || 0,
    strengthen: mech.strengthen || 0,
    weaken: mech.weaken || 0,
    expose: mech.expose || 0,

    // Damage patterns
    aoe: mech.aoe || 0,
    dot: mech.dot || 0,
    burst: mech.burst || 0,
    affliction: mech.affliction || 0,
    stacking: (mech.dot || 0) + (mech.affliction || 0),

    // Special
    trap: mech.trap || 0,
    redirect: mech.redirect || 0,

    // Legacy (unused but kept for compatibility)
    statusShield: 0,
    antiAffliction: 0,
    triggerOnAction: 0,
    triggerOnHit: 0,
    achievement: 0,
    setup: 0,
    skillSteal: 0,
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
  const control = []

  const mech = profile.mechanics
  const hooks = profile.hooks

  // Setups (things that enable combos)
  if (hooks.createsMark) setups.push('mark')
  if (hooks.createsStun) setups.push('stun')
  if (hooks.createsExpose) setups.push('expose')
  if (mech.dot > 0) setups.push('dot')
  if (mech.affliction > 0) setups.push('affliction')
  if (mech.weaken > 0) setups.push('weaken')

  // Payoffs (things that benefit from setups)
  if (mech.burst > 0) payoffs.push('finisher')
  if (mech.piercing > 0) payoffs.push('piercing')
  if (mech.bypass > 0) payoffs.push('bypass')
  if (hooks.needsStunnedTarget || hooks.needsMarkedTarget) payoffs.push('conditional')

  // Sustain
  if (mech.heal > 0 || mech.healthSteal > 0) sustain.push('heal')
  if (mech.cleanse > 0) sustain.push('cleanse')
  if (mech.endure > 0) sustain.push('endure')
  if (hooks.providesEnrage) sustain.push('enrage')

  // Energy
  if (mech.energyGain > 0) energySupport.push('gain')
  if (mech.absorb > 0) energySupport.push('absorb')

  // Control
  if (mech.stun > 0) control.push('stun')
  if (mech.energyRemoval > 0) control.push('energyDeny')
  if (mech.snare > 0) control.push('snare')
  if (mech.silence > 0) control.push('silence')

  return { setups, payoffs, sustain, energySupport, control }
}

/**
 * Build the complete knowledge base from structured data
 */
export function buildKnowledgeBase(charList = characters) {
  const knowledge = {}

  charList.forEach(char => {
    // Build profile from structured skill effects
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

      // V4 Data (structured, accurate, enhanced)
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
    hooks: knowledge.hooks,
    skills: knowledge.skillProfiles.map(s => ({
      name: s.name,
      tags: s.tags,
      damage: s.damage,
      damageType: s.damageType,
      targeting: s.targeting
    }))
  }
}

/**
 * Find characters with specific mechanic
 */
export function findCharactersWithMechanic(mechanicName) {
  return Object.values(CHARACTER_KNOWLEDGE)
    .filter(char => {
      const m = char.profile?.mechanics || {}
      return m[mechanicName] > 0
    })
    .map(char => ({
      id: char.id,
      name: char.name,
      count: char.profile?.mechanics[mechanicName] || 0
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Get characters with a specific tag
 */
export function findCharactersWithTag(tagName) {
  return Object.values(CHARACTER_KNOWLEDGE)
    .filter(char => char.combinedTags?.includes(tagName))
    .map(char => ({
      id: char.id,
      name: char.name
    }))
}
