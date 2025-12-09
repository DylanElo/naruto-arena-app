import characters from '../data/characters.json'
import { buildCharacterProfile, extractSkillTags } from './skillTagger'

// Map new granular mechanics to legacy broad buckets for compatibility
function mapMechanics(profileMech) {
  const mech = { ...profileMech }
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

// Reconstruct legacy hooks object from new profile data
function mapHooks(profile) {
  const setups = []
  const payoffs = []
  const sustain = []
  const energySupport = []

  // Map from Aggregate Profile
  if (profile.hooks.createsMark) setups.push('mark')
  if (profile.hooks.createsStun) setups.push('stun')
  if (profile.mechanics.dot > 0) setups.push('dot')
  if (profile.mechanics.affliction > 0) setups.push('affliction')

  if (profile.mechanics.burst > 0) payoffs.push('finisher')
  if (profile.mechanics.piercing > 0) payoffs.push('piercing')
  if (profile.hooks.needsStunnedTarget || profile.hooks.needsMarkedTarget) payoffs.push('conditional')

  if (profile.mechanics.heal > 0 || profile.mechanics.healthSteal > 0) sustain.push('sustain')
  if (profile.mechanics.cleanse > 0) sustain.push('cleanse')

  if (profile.mechanics.energyGain > 0) energySupport.push('gain')

  return { setups, payoffs, sustain, energySupport }
}

export function buildKnowledgeBase(charList = characters) {
  const knowledge = {}

  charList.forEach(char => {
    // 1. Get the sophisticated v2 profile
    const profile = buildCharacterProfile(char) || {
      roles: { dps: 0, tank: 0, support: 0, control: 0 },
      mechanics: {},
      hooks: {},
      energy: { colors: {} }
    }

    // 2. Map mechanics to legacy buckets
    const legacyMechanics = mapMechanics(profile.mechanics)

    // 3. Reconstruct per-skill tags for legacy analysis
    const skillProfiles = (char.skills || []).map(skill => {
      const analysis = extractSkillTags(skill)
      const tags = []

      // Convert analysis object back to list of strings
      if (analysis.isBurst) tags.push('finisher')
      if (analysis.isAoE) tags.push('aoe')
      if (analysis.hasDot) tags.push('dot')
      if (analysis.damageType === 'piercing') tags.push('piercing')
      if (analysis.damageType === 'affliction') tags.push('affliction')
      if (analysis.damageType === 'healthSteal') tags.push('sustain')

      if (analysis.defense.damageReduction) tags.push('shield')
      if (analysis.defense.invulnerable) tags.push('invulnerable')
      if (analysis.defense.heal) tags.push('heal')
      if (analysis.defense.cleanse) tags.push('cleanse')

      if (analysis.control.hardStun) tags.push('stun')
      if (analysis.control.energyRemoval) tags.push('energyDeny')
      if (analysis.control.counter) tags.push('counter')

      if (analysis.resource.energyGain > 0) tags.push('energyGain')

      // Energy cost check for 'highCost' tag
      const energyCost = (skill.energy || []).filter(e => e && e !== 'none').length
      if (energyCost >= 2) tags.push('highCost')

      return {
        name: skill.name,
        tags,
        description: skill.description
      }
    })

    const combinedTags = Array.from(new Set(skillProfiles.flatMap(s => s.tags)))
    const hooks = mapHooks(profile)

    knowledge[char.id] = {
      id: char.id,
      name: char.name,

      // Legacy Shape
      roles: profile.roles,
      mechanics: legacyMechanics,
      hooks,
      combinedTags,
      skillProfiles,

      // V2 Data (for future use)
      profile
    }
  })

  return knowledge
}

export const CHARACTER_KNOWLEDGE = buildKnowledgeBase()

export function getCharacterKnowledge(charId) {
  return CHARACTER_KNOWLEDGE[charId]
}
