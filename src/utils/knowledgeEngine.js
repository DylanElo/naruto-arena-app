import characters from '../data/characters.json'

// EFFECT_PATTERNS is where we translate raw skill text into high-level tags.
// The patterns below are grounded in the Naruto-Arena terminology:
//
// - Damage / Piercing Damage / Affliction Damage / Health Steal
// - Damage Reduction / Unpierceable Damage Reduction / Destructible Defense
// - Invulnerable / Stun / Counter / Reflect / Energy removal / Energy gain
// - Mark / Seal / Tag + follow-up effects (detonate / execute)
// - Multi-turn setups and damage-over-time
//
const EFFECT_PATTERNS = {
  // --- CORE CONTROL / DISRUPTION ---

  // Stun: "This character is stunned", "stuns their skills", "unable to use skills"
  stun: /\bstun(?:ned|s)?\b|unable to use (?:any )?skills?|cannot use (?:any )?skills?/i,

  // Healing in the manual sense: "heals X health", "recovers X health"
  heal: /\bheal(?:s|ed)?\b|recovers? \d+ health|restore[s]? \d+ health/i,

  // Cleanse: explicitly removing harmful effects or skills
  cleanse: /remove[s]? (?:all )?harmful (?:effects|skills)|remove[s]? all harmful affliction/i,

  // Shields / mitigation: DR + unpierceable DR + destructible defense
  shield: /damage reduction|unpierceable damage reduction|destructible defense|gains? \d+ points? of damage reduction/i,

  // Invulnerability: cannot be targeted by new harmful skills
  invulnerable: /\binvulnerable\b/i,

  // Counter / reflect: negate or bounce an incoming skill
  counter: /\bcounter(?:s|ed)?\b|will counter\b|reflect(?:s|ed)?\b/i,

  // Area-of-effect: affects multiple characters
  aoe: /all enemies|all allies|all characters|enemy team|entire enemy team/i,

  // Energy gain (random or specific)
  energyGain: /gain(?:s)? \d+ (?:random )?energy\b|will gain \d+ (?:random )?energy\b/i,

  // Energy denial (remove, lose, steal, drain)
  energyDeny: /remove[s]? \d+ (?:random )?energy|lose[s]? \d+ (?:random )?energy|will lose \d+ (?:random )?energy|steal[s]? \d+ (?:random )?energy|drain[s]? \d+ (?:random )?energy/i,

  // Cooldown increase
  cooldownIncrease: /cooldown(?:s)? (?:of .* )?(?:is|are) increased|cooldown will be increased|will have their cooldown increased/i,

  // Mark / tag / seal
  mark: /\bmark(?:s|ed)?\b|\btag(?:s|ged)?\b|\bseal(?:s|ed)?\b/i,

  // Detonate / conditional extra damage based on a prior effect or mark
  detonate: /deal[s]? (?:\d+ )?additional damage|will deal \d+ additional damage|if (?:the )?target is (?:stunned|marked|affected)|if used on an enemy affected by/i,

  // Damage over time & Affliction: multi-turn damage or explicit affliction
  dot: /affliction damage|damage to (?:one|all) enem(?:y|ies) for \d+ turns?|take[s]? \d+ damage for \d+ turns?|damage for \d+ turns?/i,

  // Multi-turn setups, buffs that prepare future effects
  setup: /for \d+ turns?, .* will|after \d+ turns?, .* will|during this time, .* will|for the rest of the game, .* will/i,

  // Execute / anti-tank: conditional big finisher (often vs stunned / affected targets)
  execute: /if the target is stunned|if the target is affected by|instantly kill[s]?|if this skill is used on an enemy below \d+ health/i,

  // Sustain helpers: lifelink and health steal
  sustain: /lifelink|health is stolen|steals? \d+ health/i
}

// Map tags -> coarse roles (soft priors; main logic is in recommendationEngine)
const ROLE_FROM_TAG = {
  heal: 'support',
  cleanse: 'support',
  energyGain: 'support',

  shield: 'tank',
  invulnerable: 'tank',

  counter: 'control',
  stun: 'control',
  cooldownIncrease: 'control',
  energyDeny: 'control',
  mark: 'control',

  aoe: 'dps',
  dot: 'dps',
  detonate: 'dps',
  execute: 'dps'
}

// Map tags -> mechanics buckets used by the analyzer
const MECHANIC_FROM_TAG = {
  // Defensive / sustain
  heal: 'cleanse',          // "cleanse" bucket doubles as sustain tools in the analyzer
  cleanse: 'cleanse',
  shield: 'immunity',       // general mitigation / tankiness
  invulnerable: 'invulnerable',
  sustain: 'cleanse',

  // Resource
  energyGain: 'energyGen',

  // Control / disruption
  counter: 'counter',
  stun: 'stun',
  cooldownIncrease: 'stun',
  energyDeny: 'stun',
  mark: 'setup',

  // Damage patterns
  aoe: 'aoe',
  dot: 'stacking',
  detonate: 'stacking',
  execute: 'antiTank',

  // Manual-specific damage types
  piercing: 'piercing',
  affliction: 'stacking',
  healthSteal: 'stacking'
}

// Detect per-skill tags using the manual vocabulary
function detectSkillTags(skill = {}) {
  const descRaw = skill.description || ''
  const desc = descRaw.toLowerCase()
  const classes = (skill.classes || '').toLowerCase()
  const tags = new Set()

  // 1) Regex-based tags from EFFECT_PATTERNS
  Object.entries(EFFECT_PATTERNS).forEach(([tag, regex]) => {
    if (regex.test(desc)) tags.add(tag)
  })

  // 2) Manual-driven extra logic

  // Generic damage presence
  if (desc.includes(' damage')) {
    tags.add('damage')
  }

  // Affliction damage ⇒ stacking / attrition
  if (desc.includes('affliction damage')) {
    tags.add('dot')
    tags.add('affliction')
  }

  // Explicit multi-turn damage that might not say "affliction"
  if (
    /damage to (?:one|all) enem(?:y|ies) for \d+ turns?/.test(desc) ||
    /take[s]? \d+ damage for \d+ turns?/.test(desc) ||
    /damage for \d+ turns?/.test(desc)
  ) {
    tags.add('dot')
  }

  // Piercing damage ⇒ anti-tank
  if (
    desc.includes('piercing damage') ||
    /ignores? damage reduction|unable to reduce damage/i.test(desc)
  ) {
    tags.add('execute')    // treated as anti-tank
    tags.add('piercing')
  }

  // Health steal / lifelink are both sustain and slow-kill tools
  if (/health is stolen|steals? \d+ health|health steal|lifelink/i.test(desc)) {
    tags.add('sustain')
    tags.add('healthSteal')
    tags.add('dot') // usually works over time / through DR
  }

  // Strategic energy manipulation not already caught
  if (classes.includes('strategic') && desc.includes('energy')) {
    if (/gain[s]? \d+/.test(desc)) tags.add('energyGain')
    if (/remove[s]? \d+|lose[s]? \d+|steal[s]? \d+|drain[s]? \d+/.test(desc)) tags.add('energyDeny')
  }

  // Achievement-style skills (cannot be used manually, trigger on condition)
  if (/^achievement:|cannot be used manually|cannot be used by the player/i.test(descRaw)) {
    tags.add('achievement')
    tags.add('setup')
  }

  // Class-based hints:
  // Affliction class reinforces dot/stacking
  if (classes.includes('affliction')) {
    tags.add('dot')
    tags.add('affliction')
  }

  // Strategic skills that purely buff / prep things are usually setups
  if (
    classes.includes('strategic') &&
    !desc.includes('damage') &&
    /for \d+ turns?|after \d+ turns?|for the rest of the game/i.test(desc)
  ) {
    tags.add('setup')
  }

  // Energy skills that cost a lot are marked as highCost threats (for synergy matrix)
  const energyCost = (skill.energy || []).filter(e => e && e.toLowerCase() !== 'none').length
  if (energyCost >= 2) tags.add('highCost')
  if (energyCost === 0) tags.add('free')

  // Big one-shot finishers: any single hit ≥ 40 damage
  const damageMatch = desc.match(/(\d+)\s+damage/)
  if (damageMatch) {
    const amount = Number(damageMatch[1])
    if (amount >= 40) {
      tags.add('finisher')
      // Most big hits are also good at breaking through tanks
      tags.add('execute')
    }
  }

  return { tags: Array.from(tags), energyCost }
}

// Aggregate tags -> per-character coarse roles
function aggregateRoles(tags) {
  return tags.reduce(
    (acc, tag) => {
      const role = ROLE_FROM_TAG[tag]
      if (role) acc[role] = (acc[role] || 0) + 1

      // Any generic damage / finisher also pushes towards DPS
      if (tag === 'damage' || tag === 'finisher') acc.dps = (acc.dps || 0) + 1
      return acc
    },
    { tank: 0, support: 0, control: 0, dps: 0 }
  )
}

// Aggregate tags -> mechanics buckets used by the analyzer
function aggregateMechanics(tags) {
  const base = {
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
    triggerOnAction: 0,
    triggerOnHit: 0,
    achievement: 0,
    setup: 0
  }

  tags.forEach(tag => {
    const mechanic = MECHANIC_FROM_TAG[tag]
    if (mechanic && base[mechanic] !== undefined) {
      base[mechanic] += 1
    }

    // Redundant safeguard: any dot effect should always count as stacking
    if (tag === 'dot') {
      base.stacking += 1
    }
  })

  return base
}

export function buildKnowledgeBase(charList = characters) {
  const knowledge = {}

  charList.forEach(char => {
    const skillProfiles = (char.skills || []).map(skill => {
      const { tags, energyCost } = detectSkillTags(skill)
      return {
        name: skill.name,
        tags,
        energyCost,
        description: skill.description
      }
    })

    const combinedTags = Array.from(new Set(skillProfiles.flatMap(s => s.tags)))
    const roles = aggregateRoles(combinedTags)
    const mechanics = aggregateMechanics(combinedTags)

    const hooks = {
      setups: combinedTags.filter(tag => ['setup', 'mark', 'dot'].includes(tag)),
      payoffs: combinedTags.filter(tag => ['detonate', 'execute', 'finisher'].includes(tag)),
      sustain: combinedTags.filter(tag => ['heal', 'cleanse', 'shield', 'invulnerable', 'sustain'].includes(tag)),
      energySupport: combinedTags.filter(tag => tag === 'energyGain')
    }

    knowledge[char.id] = {
      id: char.id,
      name: char.name,
      skillProfiles,
      combinedTags,
      roles,
      mechanics,
      hooks
    }
  })

  return knowledge
}

export const CHARACTER_KNOWLEDGE = buildKnowledgeBase()

export function getCharacterKnowledge(charId) {
  return CHARACTER_KNOWLEDGE[charId]
}
