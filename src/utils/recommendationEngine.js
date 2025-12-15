import { getCharacterKnowledge } from './knowledgeEngine.js'
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
    heal: 0,
    damage_reduction: 0,
    skillSteal: 0,
    stun: 0,
    invulnerable: 0,
    statusShield: 0,
    antiAffliction: 0,
    triggerOnAction: 0,
    triggerOnHit: 0,
    achievement: 0,
    setup: 0,
    sustain: 0,
    defense: 0
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

// --- FALLBACK SKILmultipleL ANALYSIS (TEXT-BASED) ----------------------------------
// This is a temporary solution for characters that have not been migrated
// to the structured `effects` data model. It's less accurate but provides
// baseline analysis.

const analyzeSkillsByText = (skills = []) => {
  const mechanics = { ...DEFAULT_ANALYSIS.mechanics };
  if (!skills) return mechanics;

  const keywordMap = {
    counter: [/counter/gi],
    invisible: [/invisible/gi],
    immunity: [/immunity/gi],
    piercing: [/piercing/gi, /ignores damage reduction/gi],
    punisher: [/punish/gi],
    antiTank: [/destructible defense/gi, /reduces damage taken/gi],
    cleanse: [/cleanse/gi, /removes (?:all )?(?:harmful effects|debuffs|harmful non-conditional affliction)/gi],
    aoe: [/all enemies/gi],
    stacking: [/stacking/gi, /affliction/gi],
    energyGen: [/gain (?:one|\d+) (?:green|red|blue|white|black|random) energy/gi, /generates (?:one|\d+)/gi, /gain \d+ chakra/gi],
    heal: [/heals (?:an ally|\d+)/gi, /heal/gi],
    damage_reduction: [/damage reduction/gi],
    skillSteal: [/steal/gi],
    stun: [/stun/gi, /stuns/gi, /stunning/gi, /incapacitate/gi],
    invulnerable: [/invulnerable/gi, /invulnerability/gi],
    statusShield: [/status shield/gi],
    antiAffliction: [/ignores harmful non-conditional affliction/gi],
    triggerOnAction: [/when another ally acts/gi],
    triggerOnHit: [/when hit/gi],
    achievement: [/achievement/gi],
    setup: [/setup/gi, /mark/gi],
    sustain: [/sustain/gi],
    defense: [/defense/gi]
  };

  skills.forEach(skill => {
    const text = `${skill.name} ${skill.description}`; // Keep case for some regex, use /i flag

    for (const mechanic in keywordMap) {
      for (const regex of keywordMap[mechanic]) {
        const matches = text.match(regex);
        if (matches) {
          mechanics[mechanic] += matches.length;
        }
      }
    }
  });

  return mechanics;
};

const inferRolesFromSkills = (mechanics, skills) => {
  const roles = { tank: 0, support: 0, control: 0, dps: 0 };
  if (!mechanics) return roles;

  // Infer roles based on mechanics
  if (mechanics.stun > 0 || mechanics.skillSteal > 0) roles.control += 1;
  if (mechanics.cleanse > 0 || mechanics.heal > 0 || mechanics.energyGen > 0) roles.support += 1;
  if (mechanics.damage_reduction > 0 || mechanics.counter > 0 || mechanics.defense > 0 || mechanics.immunity > 0) roles.tank += 1;

  // Infer DPS from damage-dealing skills
  let damageSkillCount = 0;
  (skills || []).forEach(skill => {
    const damage = extractSkillDamage(skill);
    if (damage > 0) {
      damageSkillCount++;
    }
    // High-damage skills strongly suggest a DPS role
    if (damage >= 30) {
      roles.dps += 1.5;
    }
  });

  if (damageSkillCount >= 2) {
    roles.dps += 1;
  }

  // Normalize to prevent a character from dominating all roles
  const total = Object.values(roles).reduce((a, b) => a + b, 0);
  if (total > 0) {
    Object.keys(roles).forEach(key => {
      roles[key] = (roles[key] / total) * 2; // Arbitrary scaling factor
    });
  }

  return roles;
};


// --- CHARACTER ANALYSIS -----------------------------------------------------

export const analyzeCharacter = (char) => {
  if (!char || !char.id) {
    return {
      roles: { tank: 0, support: 0, control: 0, dps: 0 },
      mechanics: { ...DEFAULT_ANALYSIS.mechanics },
      knowledge: null
    }
  }

  const knowledge = getCharacterKnowledge(char.id)
  if (!knowledge) {
    const fallbackMechanics = analyzeSkillsByText(char.skills);
    const fallbackRoles = inferRolesFromSkills(fallbackMechanics, char.skills);
    return {
      roles: fallbackRoles,
      mechanics: fallbackMechanics,
      knowledge: null
    }
  }

  const analysis = {
    roles: knowledge.roles,
    mechanics: { ...DEFAULT_ANALYSIS.mechanics },
    knowledge
  };

  const hasStructuredEffects = (char.skills || []).some(skill => skill.effects && skill.effects.length > 0);

  if (knowledge.trueMechanics) {
    // 1. Dependency Analysis Logic
    const creates = new Set();
    const needs = new Set();

    knowledge.trueMechanics.skills.forEach(skill => {
      // What do we create?
      // From Classes
      (skill.classes || []).forEach(cls => {
        if (cls === 'Stun') creates.add('stun');
        if (cls === 'Bane') { creates.add('affliction'); creates.add('stacking'); }
      });
      // From Synergies (e.g. "Create Stun") - not strictly in synergy object yet, usually in descriptions/classes.

      // What do we need?
      (skill.synergies || []).forEach(syn => {
        // syn.condition: "targetHas Stunned"
        if (!syn.condition) return;
        const cond = syn.condition.toLowerCase();

        if (cond.includes('stun')) needs.add('stun');
        if (cond.includes('lock')) needs.add('stun'); // roughly
        // Add more parsers as needed
      });
    });

    // Calculate Unmet Needs
    const unmetNeeds = {};
    needs.forEach(need => {
      if (!creates.has(need)) {
        unmetNeeds[need] = true;
      }
    });

    // Store in knowledge for partner scoring
    if (!analysis.knowledge.dependencies) {
      analysis.knowledge.dependencies = {
        creates: Array.from(creates),
        needs: Array.from(needs),
        unmet: Object.keys(unmetNeeds)
      };
    }

    // 2. Map True Mechanics Classes to Internal Buckets (Existing Logic)
    knowledge.trueMechanics.skills.forEach(skill => {
      (skill.classes || []).forEach(cls => {
        if (cls === 'Mental' || cls === 'Stun') analysis.mechanics.stun++;
        if (cls === 'Bane') analysis.mechanics.stacking++; // Dot/Affliction
        if (cls === 'Bypassing' || cls === 'Piercing') analysis.mechanics.piercing++;
        if (cls === 'Uncounterable') analysis.mechanics.counter--;
        if (cls === 'Invisible') analysis.mechanics.invisible++;
        if (cls === 'Chakra') analysis.mechanics.energyGen++;
      });

      // 3. Map True Mechanics Synergies (Synergy Hooks)
      (skill.synergies || []).forEach(syn => {
        if (syn.condition && syn.condition.toLowerCase().includes('stun')) {
          // Only count as punisher if it's an UNMET need (or generic bonus)
          // Use dependency data?
          analysis.mechanics.punisher++;
        }
      });

      // 4. Map Transformations (Alternate)
      if (skill.transformations && skill.transformations.length > 0) {
        analysis.mechanics.setup++;
      }
    });
  } else if (hasStructuredEffects) {
    // New structured data path (Legacy V4)
    (char.skills || []).forEach(skill => {
      (skill.effects || []).forEach(effect => {
        if (analysis.mechanics[effect.type] !== undefined) {
          analysis.mechanics[effect.type]++;
        }
      });
    });
  } else {
    // Fallback to text parsing for older data
    const textMechanics = analyzeSkillsByText(char.skills);
    Object.keys(textMechanics).forEach(key => {
      // Use the value from text analysis (usually 0 or 1)
      if (textMechanics[key] > 0) {
        analysis.mechanics[key] = textMechanics[key];
      }
    });
  }

  return analysis;
}

// --- DAMAGE / TEMPO APPROXIMATION -------------------------------------------

function extractSkillDamage(skill = {}) {
  // New structured data path
  if (skill.effects && skill.effects.length > 0) {
    let maxDamage = 0;
    skill.effects.forEach(effect => {
      if (effect.type === 'damage') {
        let currentDamage = effect.amount || 0;
        if (effect.condition && effect.condition.bonus) {
          currentDamage += effect.condition.bonus;
        }
        if (effect.target === 'all_enemies') {
          currentDamage *= 3; // Approximate AoE value
        }
        if (currentDamage > maxDamage) {
          maxDamage = currentDamage;
        }
      }
    });
    return maxDamage;
  }

  // Fallback: improved text parsing
  const desc = (skill.description || '').toLowerCase();
  let totalDamage = 0;

  // Find all "deals X damage" instances and sum them up.
  const damageRegex = /deals (\d+) damage/g;
  let match;
  while ((match = damageRegex.exec(desc)) !== null) {
    totalDamage += parseInt(match[1], 10);
  }

  // Consider AoE multipliers.
  if (desc.includes('to all enemies') || desc.includes('to each enemy')) {
    // If damage was already calculated, multiply it. Otherwise, estimate a base AoE damage.
    totalDamage = totalDamage > 0 ? totalDamage * 2.5 : 15 * 2.5;
  }

  return totalDamage;
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
  pressureRating += Math.min(dmgProfile.burstDamage, 150) / 150 * 40 // up to 40 pts from raw burst
  pressureRating += Math.min(dmgProfile.avgDPE, 25) / 25 * 20 // up to 20 pts from efficiency

  if (mechanics.stacking > 0) pressureRating += 10
  if (mechanics.stun > 0) pressureRating += 12
  if (mechanics.antiTank > 0 || mechanics.piercing > 0) pressureRating += 10
  if (mechanics.aoe > 0) pressureRating += 8
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


  // Coverage Logic (User Feedback: Versatility)
  const KEY_CAPABILITIES = [
    'piercing', 'affliction', 'stun', 'heal', 'cleanse', 'counter',
    'invulnerable', 'energyGen', 'aoe', 'invisible', 'statusShield',
    'antiTank'
  ];
  const capabilitiesMet = new Set();

  KEY_CAPABILITIES.forEach(cap => {
    if (mechanics[cap] > 0) {
      capabilitiesMet.add(cap);
    }
  });

  const uniqueCapabilities = capabilitiesMet.size;
  const coverageScore = uniqueCapabilities * 5;

  // Synergy score: roles + mechanics + combos + coverage + a bit of tempo - energy concentration
  const synergyScoreRaw =
    roleScore +
    mechanicScore +
    coverageScore +
    Math.min(comboScore, 30) +
    pressureRating * 0.3 -
    energyTeamPenalty;

  const synergyBreakdown = {
    roleScore,
    mechanicScore,
    comboScore,
    coverageScore,
    pressureRating,
    energyTeamPenalty,
  };

  // Keep clamped version for backward compatibility and display
  const synergyScore = clamp(Math.round(synergyScoreRaw), 0, 100);

  // Strengths / weaknesses / strategies text
  const strengths = []
  const weaknesses = []
  const synergyHighlights = []
  const strategies = []

  // Granular role analysis
  const granularRoles = { nuker: 0, aoe_specialist: 0, dot_specialist: 0, protector: 0, staller: 0, disruptor: 0, enabler: 0 };
  team.forEach(member => {
    const knowledge = getCharacterKnowledge(member.id);
    if (knowledge?.profile?.granularRoles) {
      Object.keys(granularRoles).forEach(r => {
        granularRoles[r] += knowledge.profile.granularRoles[r] || 0;
      });
    }
  });


  // Highlights / strengths based on granular roles
  if (granularRoles.nuker > 0 && granularRoles.enabler > 0) {
    synergyHighlights.push('Energy Battery for Nuker');
  }
  if (granularRoles.staller > 0 && granularRoles.dot_specialist > 0) {
    synergyHighlights.push('Stall & Attrition Combo');
  }
  if (granularRoles.disruptor > 0 && (granularRoles.nuker > 0 || granularRoles.dot_specialist > 0)) {
    synergyHighlights.push('Disruption Creates Openings for Damage');
  }
  if (granularRoles.protector > 0 && (roles.dps > 2.5 || team.some(m => getCharacterKnowledge(m.id)?.profile?.isGlassCannon))) {
    synergyHighlights.push('Protection for High-Value Threats');
  }


  // Strengths
  if (pressureRating >= 75) strengths.push('High-pressure offense');
  if (roles.dps > 2.5 && mechanics.piercing > 0) strengths.push('Excellent anti-tank capabilities');
  if (mechanics.stun > 1 || mechanics.counter > 1) strengths.push('Strong control over the battlefield');
  if (mechanics.cleanse > 0 && mechanics.heal > 0) strengths.push('Robust healing and cleansing');
  if (granularRoles.aoe_specialist > 1.5) strengths.push('Overwhelming AoE pressure');
  if (mechanics.energyGen > 1) strengths.push('Superior energy generation');


  // Weaknesses & Warnings
  const warnings = []

  // Role-based weaknesses
  if (roles.dps < 1.5 && dmgProfile.burstDamage < 90) {
    weaknesses.push('Very low damage output, may struggle to secure kills.');
    warnings.push('⚠️ Lacks a clear win condition.');
  }
  if (roles.dps > 2.5 && granularRoles.protector === 0 && granularRoles.staller === 0) {
    weaknesses.push('Glass Cannon: High damage but extremely fragile.');
  }
  if (granularRoles.disruptor < 1) {
    weaknesses.push('Vulnerable to enemy combos and control.');
  }
  if (granularRoles.protector < 1) {
    weaknesses.push('No healing or cleansing, struggles in long fights.');
  }

  // Mechanic Gaps
  if (mechanics.antiTank === 0 && mechanics.piercing === 0) weaknesses.push('No tools to deal with heavy defense (DR/DD).');
  if (mechanics.cleanse === 0 && mechanics.statusShield === 0) weaknesses.push('Susceptible to stun-locks and affliction damage.');

  // Explicit Coverage Gaps (User Feedback)
  const CAPABILITY_FEEDBACK = {
    'piercing': 'Missing: Piercing Damage (Struggles vs Damage Reduction)',
    'affliction': 'Missing: Afflictions/Stacking (Struggles vs High Defense)',
    'stun': 'Missing: Stun/Control (Cannot stop enemy actions)',
    'heal': 'Missing: Sustain/Healing (Vulnerable to attrition)',
    'cleanse': 'Missing: Cleanse (Vulnerable to debuffs)',
    'counter': 'Missing: Counter/Reflect (Vulnerable to aggressive burst)',
    'invulnerable': 'Missing: Defensive Safety (Invulnerability)',
    'energyGen': 'Missing: Energy Generation',
    'aoe': 'Missing: AoE Damage (Struggles vs multiple threats)'
  };

  KEY_CAPABILITIES.forEach(cap => {
    if ((mechanics[cap] || 0) === 0 && CAPABILITY_FEEDBACK[cap]) {
      // Only add as warning if team size is 3 (full team context)
      if (team.length === 3) {
        // We can be selective here or just list them. 
        // To avoid clutter, maybe only list top 3 missing?
      }
    }
  });

  // Let's add them to a specific analysis field to distinct from generic weaknesses
  const missingCapabilities = KEY_CAPABILITIES.filter(cap => (mechanics[cap] || 0) === 0);



  // Energy problems
  if (hookCounts.highCostThreats > 1 && mechanics.energyGen === 0) {
    weaknesses.push('Energy hungry: many high-cost skills but no energy generation');
    warnings.push('⚠️ High energy requirements without support');
  }

  // Energy color bottleneck
  const totalEnergy = Object.values(energyDistribution).reduce((a, b) => a + b, 0)
  const energyEntries = Object.entries(energyDistribution)
  const dominantEnergy = energyEntries.find(([, count]) => count >= totalEnergy * 0.6)
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



  // Strategies / gameplans
  if (granularRoles.nuker > 1.5) {
    strategies.push('Focus on eliminating a key enemy threat quickly with single-target burst.');
  } else if (granularRoles.aoe_specialist > 1.5) {
    strategies.push('Apply consistent pressure to the entire enemy team with AoE damage.');
  } else if (granularRoles.dot_specialist > 1.2 && granularRoles.staller > 1) {
    strategies.push('Win through attrition by stalling defensively while DoTs wear down the enemy.');
  } else if (granularRoles.disruptor > 1.5 && roles.dps > 1.5) {
    strategies.push('Control the flow of the game by disrupting enemies, then capitalize on openings.');
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
    synergyScoreRaw,
    synergyBreakdown,
    missingCapabilities, // New Field for UI
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
      // Partner fit with main (primary weight - 50%)
      const mainFit = scorePartnerFit(main, candidate)

      // Partner fit with secondary (secondary weight - 30%)
      const secondaryFit = scorePartnerFit(secondary, candidate)

      // Full team synergy (tertiary weight - 20%)
      const teamAnalysis = analyzeTeam([...currentTeam, candidate])

      // Blend: 50% Main Fit, 30% Secondary Fit, 20% Team Balance
      // This ensures the 3rd pick creates strong 1-on-1 pairs rather than just filling a stat sheet.
      const blendedScore = (mainFit.score * 0.5) + (secondaryFit.score * 0.3) + (teamAnalysis.synergyScoreRaw * 0.2)

      return {
        ...candidate,
        buildAroundScore: mainFit.score,
        secondaryFitScore: secondaryFit.score,
        teamSynergyScore: teamAnalysis.synergyScore,
        synergyScore: Math.round(blendedScore),
        buildAroundNotes: [...mainFit.notes, ...secondaryFit.notes]
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
  const knowledge = getCharacterKnowledge(char.id);
  const roles = knowledge?.profile?.granularRoles || {};

  const entries = Object.entries(roles)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  if (!entries.length) return { primary: null, secondary: null };
  const [primary] = entries;
  const secondary = entries[1] || null;

  return {
    primary: primary[0],
    secondary: secondary ? secondary[0] : null
  };
};

const scorePartnerFit = (mainChar, candidate) => {
  const mainKnowledge = getCharacterKnowledge(mainChar.id);
  const candKnowledge = getCharacterKnowledge(candidate.id);
  const mainProfile = mainKnowledge?.profile;
  const candProfile = candKnowledge?.profile;

  if (!mainProfile || !candProfile) return { score: 0, notes: [] };

  const mainRoles = getPrimaryRoles(mainChar);
  const candRoles = getPrimaryRoles(candidate);

  let score = 0;
  const notes = [];

  // Role complementarity using granular roles
  const mainPrimary = mainRoles.primary;
  const candPrimary = candRoles.primary;

  if (['nuker', 'aoe_specialist', 'dot_specialist'].includes(mainPrimary)) {
    if (candPrimary === 'protector') { score += 30; notes.push('Protects the main damage dealer'); }
    if (candPrimary === 'staller') { score += 25; notes.push('Buys time for the damage dealer to scale'); }
    if (candPrimary === 'disruptor') { score += 20; notes.push('Disrupts enemies, creating openings'); }
    if (candPrimary === 'enabler') { score += 25; notes.push('Provides energy for expensive skills'); }
  } else if (mainPrimary === 'protector' || mainPrimary === 'enabler') {
    if (['nuker', 'aoe_specialist', 'dot_specialist'].includes(candPrimary)) {
      score += 30; notes.push('Provides a clear win condition');
    }
  } else if (mainPrimary === 'disruptor') {
    if (candPrimary === 'nuker' || candPrimary === 'dot_specialist') {
      score += 28; notes.push('Capitalizes on disruptions with heavy damage');
    }
  }

  // Explicit mechanic synergies
  const mHooks = mainProfile.hooks;
  const cHooks = candProfile.hooks;

  // TRUE MECHANICS SYNERGIES (Revised Dependency Logic)
  if (mainKnowledge?.dependencies && candKnowledge?.dependencies) {
    const mainNeeds = mainKnowledge.dependencies.unmet || [];
    const candProvides = candKnowledge.dependencies.creates || [];
    mainNeeds.forEach(need => {
      if (candProvides.includes(need)) {
        score += 50;
        notes.push(`Synergy: Provides needed ${need.toUpperCase()}`);
      }
    });
    const candNeeds = candKnowledge.dependencies.unmet || [];
    const mainProvides = mainKnowledge.dependencies.creates || [];
    candNeeds.forEach(need => {
      if (mainProvides.includes(need)) {
        score += 50;
        notes.push(`Synergy: Solves partner's need for ${need.toUpperCase()}`);
      }
    });
  } else {
    // Setup -> Payoff (Legacy Hooks)
    if (mHooks.createsStun && cHooks.needsStunnedTarget) { score += 35; notes.push('Synergy: Sets up stuns for payoff'); }
    if (cHooks.createsStun && mHooks.needsStunnedTarget) { score += 35; notes.push('Synergy: Sets up stuns for payoff'); }
    if (mHooks.createsMark && cHooks.needsMarkedTarget) { score += 35; notes.push('Synergy: Applies marks for payoff'); }
    if (cHooks.createsMark && mHooks.needsMarkedTarget) { score += 35; notes.push('Synergy: Applies marks for payoff'); }
  }

  // TRUE MECHANICS SYNERGIES (New Granular Logic)
  // We look for 'targetHas' conditions which imply external setup needs.
  // We DO NOT score 'userHas' as it implies self-sufficiency (handled by character power, not synergy).

  const checkTrueSynergy = (profileA, profileB, direction) => {
    let bonus = 0;
    const notesFound = [];

    // If profileA has true mechanics skills
    // We need to access the raw skills from the knowledge object?
    // Actually profile doesn't carry the raw skills easily.
    // Let's rely on the aggregated hooks if we mapped them?
    // In analyzeCharacter we mapped 'punisher' but didn't store the raw map.
  };

  // NOTE: For now, the legacy hooks (createsStun / needsStunnedTarget) cover the most important cross-synergies
  // found in the game (Stun/Mark). The Haskell logic 'targetHas "Stunned"' maps to 'needsStunnedTarget' 
  // if we updated mapHooks properly. 

  // Let's ensure mapHooks captures the new granular synergies.
  // In knowledgeEngine.js, we did mapHooks(profile). 
  // But strictly speaking, we need to ensure 'targetHas "Stun"' sets needsStunnedTarget.

  // Enabler -> High-Cost Finisher
  if (mainProfile.isEnergyHungry && candPrimary === 'enabler') { score += 30; notes.push('Synergy: Energy battery for high-cost skills'); }
  if (candProfile.isEnergyHungry && mainPrimary === 'enabler') { score += 30; notes.push('Synergy: Energy battery for high-cost skills'); }

  // Protector -> Glass Cannon
  if (mainProfile.isGlassCannon && candPrimary === 'protector') { score += 30; notes.push('Synergy: Protects a fragile damage-dealer'); }
  if (candProfile.isGlassCannon && mainPrimary === 'protector') { score += 30; notes.push('Synergy: Protects a fragile damage-dealer'); }

  // Staller + DOT Specialist
  if (mainPrimary === 'staller' && candPrimary === 'dot_specialist') { score += 25; notes.push('Synergy: Stalls while DoTs wear down the enemy'); }
  if (candPrimary === 'staller' && mainPrimary === 'dot_specialist') { score += 25; notes.push('Synergy: Stalls while DoTs wear down the enemy'); }

  // --- REFINED ENERGY LOGIC (User Model) ---
  const mainSkills = mainChar.skills || [];
  const candSkills = candidate.skills || [];

  // 1. Identify Spammable Colors (0 Cooldown)
  const mainSpammableColors = new Set();
  const mainHeavyColors = new Set(); // Colors used frequently

  mainSkills.forEach(s => {
    // Ignore generic/black energy
    const cost = (s.energy || []).filter(e => e !== 'random' && e !== 'specific');
    if (cost.length === 0) return;

    if (s.cooldown === 0 || s.cooldown === 'None') {
      cost.forEach(c => mainSpammableColors.add(c));
    }
    cost.forEach(c => mainHeavyColors.add(c));
  });

  // 2. Check Candidate for Conflicts or complements
  let energyScore = 0;

  candSkills.forEach(s => {
    const cost = (s.energy || []).filter(e => e !== 'random' && e !== 'specific');
    if (cost.length === 0) return;

    const isSpammable = (s.cooldown === 0 || s.cooldown === 'None');

    // CONFLICT: Candidate needs spammable energy of a color Main also spams
    const hasConflict = cost.some(c => mainSpammableColors.has(c));
    if (hasConflict && isSpammable) {
      energyScore -= 25;
      notes.push(`Warning: High competition for ${cost[0]} energy`);
    }

    // COMPLEMENT: Candidate uses Red/White when Main uses Blue/Green (or vice versa)
    // Heuristic: If candidate mostly uses colors Main DOESN'T use.
    const uniqueColors = cost.filter(c => !mainHeavyColors.has(c));
    if (uniqueColors.length > 0) {
      energyScore += 5; // Slight bonus for diversification
      // If spammable unique color, big bonus
      if (isSpammable) {
        energyScore += 10;
        notes.push(`Synergy: Exploits unused ${uniqueColors[0]} energy`);
      }
    }
  });

  // 3. Economy Check (Simple)
  // If both are generally heavy on the same color, still apply a small penalty
  // even if cooldowns align, because probability of having 4+ of one color is low.
  const mainEnergy = mainProfile.energy.colors;
  const candEnergy = candProfile.energy.colors;
  Object.keys(mainEnergy).forEach(color => {
    if (mainEnergy[color] >= 2 && candEnergy[color] >= 2) {
      energyScore -= 10; // Reduced from 15 as cooldown logic covers specific conflicts
      if (!notes.some(n => n.includes('competition'))) {
        notes.push('Warning: Heavy load on same energy color');
      }
    }
  });

  score += energyScore;

  return { score, notes };
};

export const recommendPartnersForMain = (mainChar, allCharacters, ownedIds = null, maxResults = 15) => {
  if (!mainChar) return []

  const ownedSet = ownedIds
    ? new Set(Array.isArray(ownedIds) ? ownedIds : Array.from(ownedIds))
    : null

  const candidates = allCharacters
    .filter(c => c && c.id && c.name) // Filter out empty data
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

  // Diversity Logic: Ensure we don't just return 5 of the exact same archetype
  scored.sort((a, b) => b.buildAroundScore - a.buildAroundScore);

  // Group by primary role to ensure variety
  const roleGroups = { tank: [], support: [], control: [], dps: [] };
  const finalDiverseSelection = [];
  const seenIds = new Set();

  scored.forEach(c => {
    const roles = c.synergyBreakdown?.roles || {};
    // Determine primary role
    let primary = 'dps';
    let maxVal = 0;
    Object.entries(roles).forEach(([r, v]) => { if (v > maxVal) { maxVal = v; primary = r; } });

    if (maxVal > 0) roleGroups[primary].push(c);
    else roleGroups['dps'].push(c); // Fallback
  });

  // 1. Pick top overall (Best in Slot)
  if (scored[0]) {
    finalDiverseSelection.push(scored[0]);
    seenIds.add(scored[0].id);
  }

  // 2. Pick top from each other role (if high enough score)
  ['tank', 'support', 'control', 'dps'].forEach(role => {
    const topInRole = roleGroups[role].find(c => !seenIds.has(c.id));
    if (topInRole) {
      // Only include if it's not terrible compared to the best
      // AND has a positive score (don't recommend 0-score trash just for diversity)
      const isViable = topInRole.buildAroundScore > 0 &&
        topInRole.buildAroundScore > scored[0].buildAroundScore * 0.4;

      if (isViable) {
        finalDiverseSelection.push(topInRole);
        seenIds.add(topInRole.id);
      }
    }
  });

  // 3. Fill the rest with highest score remaining
  for (const c of scored) {
    if (finalDiverseSelection.length >= maxResults) break;
    if (!seenIds.has(c.id)) {
      finalDiverseSelection.push(c);
      seenIds.add(c.id);
    }
  }

  // Re-sort final selection by score
  return finalDiverseSelection.sort((a, b) => b.buildAroundScore - a.buildAroundScore);
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
  }

  // Pure Healing/Sustain - need to out-damage or stun
  if ((enemyMechanics.sustain || 0) >= 2) {
    needs.stun += 2      // Stop the healer
    needs.stacking += 2  // Overwhelm with DoTs
    needs.aoe += 2       // Spread damage faster than they heal single target
  }

  // Hard Defense (Invuln/DR) - need bypass
  if ((enemyMechanics.defense || 0) >= 2) {
    needs.antiTank += 5  // CRITICAL: Piercing/Execute
    needs.stacking += 3  // DoTs ignore defense
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

  // Diversity / Coverage Highlight (New)
  const CAPABILITY_FEEDBACK = {
    'piercing': 'Piercing', 'affliction': 'Affliction', 'stun': 'Control',
    'heal': 'Sustain', 'cleanse': 'Cleanse', 'counter': 'Counter',
    'invulnerable': 'Safety', 'energyGen': 'Energy', 'aoe': 'AoE'
  };
  const covered = [];
  Object.keys(CAPABILITY_FEEDBACK).forEach(cap => {
    if (m[cap] > 0) covered.push(CAPABILITY_FEEDBACK[cap]);
  });
  if (covered.length >= 4) {
    reasons.push(`★ High Versatility: Covers ${covered.length} mechanics`);
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
