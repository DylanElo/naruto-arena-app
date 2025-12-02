import characters from '../data/characters.json'

const EFFECT_PATTERNS = {
  stun: /(stun|unable to use skills|disable|interrupt)/i,
  heal: /(heal|recover|restore) [0-9]* ?health/i,
  cleanse: /(remove harmful effects|cure|cleanse)/i,
  shield: /(damage reduction|destructible defense|reduce damage)/i,
  invulnerable: /invulnerable for \d+ turn/i,
  counter: /(counter|reflect|ignore all enemy stun effects)/i,
  aoe: /(all enemies|all allies|all characters)/i,
  energyGain: /(gain \d+ .*energy|gain 1 random energy|gain 1 energy)/i,
  energyDeny: /(remove \d+ .* energy|lose \d+ .* energy|chakra is removed)/i,
  cooldownIncrease: /(cooldown [a-z ]*increased|increase[s]? cooldown)/i,
  mark: /(mark|tag|seal)/i,
  detonate: /(detonate|deal additional damage if|if .* is active)/i,
  dot: /(affliction|damage for \d+ turns|bleed)/i,
  setup: /(for \d+ turns.*this skill|after \d+ turns|during .* this skill)/i,
  execute: /(if the target is stunned|if the target is affected)/i,
  sustain: /(gains \d+ health|heal)/i
}

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
  aoe: 'dps',
  dot: 'dps',
  detonate: 'dps',
  execute: 'dps'
}

const MECHANIC_FROM_TAG = {
  heal: 'cleanse',
  cleanse: 'cleanse',
  energyGain: 'energyGen',
  shield: 'invulnerable',
  invulnerable: 'invulnerable',
  counter: 'counter',
  stun: 'stun',
  cooldownIncrease: 'stun',
  energyDeny: 'stun',
  aoe: 'aoe',
  dot: 'stacking',
  detonate: 'stacking',
  execute: 'antiTank'
}

function detectSkillTags(skill = {}) {
  const desc = (skill.description || '').toLowerCase()
  const classes = (skill.classes || '').toLowerCase()
  const tags = new Set()

  Object.entries(EFFECT_PATTERNS).forEach(([tag, regex]) => {
    if (regex.test(desc)) tags.add(tag)
  })

  if (classes.includes('affliction')) tags.add('dot')
  if (classes.includes('strategic') && desc.includes('energy')) tags.add('energyGain')
  if (desc.includes('damage')) tags.add('damage')
  if (classes.includes('instant') && desc.includes('piercing')) tags.add('execute')

  const energyCost = (skill.energy || []).filter(e => e !== 'none' && e !== 'black').length
  if (energyCost >= 2) tags.add('highCost')
  if (energyCost === 0) tags.add('free')

  const damageMatch = desc.match(/(\d+) damage/)
  if (damageMatch && Number(damageMatch[1]) >= 40) tags.add('finisher')

  return { tags: Array.from(tags), energyCost }
}

function aggregateRoles(tags) {
  return tags.reduce((acc, tag) => {
    const role = ROLE_FROM_TAG[tag]
    if (role) acc[role] = (acc[role] || 0) + 1
    if (tag === 'damage' || tag === 'finisher') acc.dps = (acc.dps || 0) + 1
    return acc
  }, { tank: 0, support: 0, control: 0, dps: 0 })
}

function aggregateMechanics(tags) {
  const base = {
    counter: 0, invisible: 0, immunity: 0, piercing: 0, punisher: 0, antiTank: 0, cleanse: 0,
    aoe: 0, stacking: 0, energyGen: 0, skillSteal: 0, stun: 0, invulnerable: 0,
    triggerOnAction: 0, triggerOnHit: 0, achievement: 0, setup: 0
  }

  tags.forEach(tag => {
    const mechanic = MECHANIC_FROM_TAG[tag]
    if (mechanic && base[mechanic] !== undefined) base[mechanic] += 1
    if (tag === 'dot') base.stacking += 1
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
      sustain: combinedTags.filter(tag => ['heal', 'cleanse', 'shield', 'invulnerable'].includes(tag)),
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
