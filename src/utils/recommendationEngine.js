import { getCharacterKnowledge } from './knowledgeEngine'

// --- CONSTANTS & DICTIONARIES ---

// Basic Roles
const ROLE_KEYWORDS = {
    tank: ['damage reduction', 'destructible defense', 'invulnerable', 'counter', 'reflect', 'absorb'],
    support: ['heal', 'remove harmful effects', 'energy', 'invulnerable to', 'defense', 'protect'],
    control: ['stun', 'unable to reduce damage', 'remove energy', 'cooldowns increased', 'unable to be used', 'disable'],
    dps: ['damage', 'piercing', 'affliction', 'critical', 'additional damage']
}

// Advanced Mechanics Parser (Regex)
const MECHANIC_PATTERNS = {
    // Triggers
    triggerOnAction: /uses a new skill|when they use|if that enemy uses/i,
    triggerOnHit: /affected by|if used on/i,

    // Effects
    skillSteal: /skill will be replaced|copy/i,
    stacking: /(this skill stacks|damage increases|affliction damage|damage (?:each|per) turn|damage for \d+ turns)/i,
    aoe: /damage to all|all enemies/i,
    energyGen: /gain \d+ .* energy|additional energy/i,

    // Keywords
    counter: /counter|reflect|copy/i,
    invisible: /invisible|hidden/i,
    immunity: /ignore all harmful effects|invulnerable to|immune|remove all harmful effects/i,
    piercing: /piercing damage|ignores invulnerability|ignores defense/i,
    antiTank: /unable to reduce damage|ignore all enemy stun effects/i,
    cleanse: /remove harmful effects|cure|purge/i,
    stun: /stun|unable to use skills/i,
    invulnerable: /invulnerable/i,

    // V4: Advanced Mechanics
    achievement: /^Achievement:|Achievement,/i,
    setup: /For \d+ turns?,.*will/i
}

const MECHANIC_ALIAS = {
    cleanse: 'cleanse',
    energyGain: 'energyGen',
    invulnerable: 'invulnerable',
    counter: 'counter',
    stun: 'stun',
    aoe: 'aoe',
    dot: 'stacking',
    detonate: 'stacking',
    execute: 'antiTank'
}

// Synergy Matrix: Defines how Mechanic A (Row) interacts with Mechanic B (Column)
// Positive = Good Synergy, Negative = Anti-Synergy
const SYNERGY_MATRIX = {
    stun: {
        punisher: -20, // BAD: Stun prevents enemy from acting, Punisher needs action (e.g. Ino S)
        dot: 5,        // GOOD: Enemy takes damage while stunned
        setup: 15,     // GOOD: Stun allows setup chars to stack/prepare
        glassCannon: 10 // GOOD: Protects squishy chars
    },
    invulnerable: {
        glassCannon: 20, // GOOD: Protects squishy DPS
        healer: 5        // OK: Reduces healing pressure
    },
    energyGen: {
        highCost: 15,   // GOOD: Feeds energy-hungry chars
        spam: 10        // GOOD: Allows constant skill usage
    },
    punisher: {
        control: -10,   // BAD: Generally anti-synergy with hard control (stuns), but ok with soft control (slows)
        taunt: 15       // GOOD: Force enemies to attack/act (if taunt forces action) - *Concept*
    },
    immunity: {
        glassCannon: 25, // EXCELLENT: Keeps carry alive/acting
        channeling: 15   // GOOD: Prevents interruption
    },
    setup: {
        immunity: 15,      // GOOD: Protection while buffing
        invulnerable: 15,  // GOOD: Safe setup time
        energyGen: 10      // GOOD: More energy = easier to setup
    },
    achievement: {
        control: 10,       // GOOD: Control enemies while unlocking
        support: 5         // GOOD: Support helps survive to unlock
    }
}

const DEFAULT_ANALYSIS = {
    roles: { tank: 0, support: 0, control: 0, dps: 0 },
    mechanics: {
        counter: 0, invisible: 0, immunity: 0, piercing: 0, punisher: 0, antiTank: 0, cleanse: 0,
        aoe: 0, stacking: 0, energyGen: 0, skillSteal: 0, stun: 0, invulnerable: 0,
        triggerOnAction: 0, triggerOnHit: 0, achievement: 0, setup: 0
    },
    energyDistribution: { green: 0, red: 0, blue: 0, white: 0, black: 0 },
    maxDPE: 0,
    avgDPE: 0,
    strengths: [],
    weaknesses: [],
    strategies: [],
    synergyHighlights: [],
    warnings: [], // NEW: For anti-synergies
    tempo: {
        burstDamage: 0,
        burstEnergy: 0,
        estimatedKillTurns: null,
        costToKill: null,
        pressureRating: 0
    },
    sustain: { healingTools: 0, mitigationTools: 0, cleanseTools: 0 },
    synergyScore: 0
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const buildTeamHookProfile = (members = []) => {
    const hooks = { setups: 0, payoffs: 0, sustain: 0, energySupport: 0, highCostThreats: 0 }
    const hookNames = { setups: new Set(), payoffs: new Set(), sustain: new Set(), energySupport: new Set(), highCostThreats: new Set() }

    members.forEach(member => {
        const knowledge = member?.id ? getCharacterKnowledge(member.id) : null
        if (!knowledge) return

        const hasHighCost = knowledge.skillProfiles.some(skill => skill.tags.includes('highCost') || skill.tags.includes('finisher'))
        if (hasHighCost) {
            hooks.highCostThreats += 1
            hookNames.highCostThreats.add(knowledge.name)
        }

        if (knowledge.hooks) {
            if (knowledge.hooks.setups?.length) {
                hooks.setups += knowledge.hooks.setups.length
                hookNames.setups.add(knowledge.name)
            }
            if (knowledge.hooks.payoffs?.length) {
                hooks.payoffs += knowledge.hooks.payoffs.length
                hookNames.payoffs.add(knowledge.name)
            }
            if (knowledge.hooks.sustain?.length) {
                hooks.sustain += knowledge.hooks.sustain.length
                hookNames.sustain.add(knowledge.name)
            }
            if (knowledge.hooks.energySupport?.length) {
                hooks.energySupport += knowledge.hooks.energySupport.length
                hookNames.energySupport.add(knowledge.name)
            }
        }
    })

    return { hooks, hookNames }
}

const evaluateHookSynergy = (teamProfile, candidateKnowledge) => {
    if (!candidateKnowledge) return { hookScore: 0, notes: [] }
    const notes = []
    let hookScore = 0

    if (candidateKnowledge.hooks.setups?.length && teamProfile.hooks.payoffs > 0) {
        hookScore += candidateKnowledge.hooks.setups.length * 6
        notes.push('Setup pieces found payoffs already on the board')
    }
    if (candidateKnowledge.hooks.payoffs?.length && teamProfile.hooks.setups > 0) {
        hookScore += candidateKnowledge.hooks.payoffs.length * 6
        notes.push('Finisher skills can cash in existing marks/DoTs')
    }
    if (candidateKnowledge.hooks.energySupport?.length && teamProfile.hooks.highCostThreats > 0) {
        hookScore += candidateKnowledge.hooks.energySupport.length * 4
        notes.push('Battery tools feeding expensive carries')
    }
    if (candidateKnowledge.hooks.sustain?.length && teamProfile.hooks.highCostThreats > 0) {
        hookScore += candidateKnowledge.hooks.sustain.length * 3
        notes.push('Protection/cleanse to keep finishers alive')
    }

    return { hookScore, notes }
}

// --- ANALYSIS LOGIC ---

export const analyzeCharacter = (char) => {
    const knowledge = char?.id ? getCharacterKnowledge(char.id) : null
    const roles = { tank: 0, support: 0, control: 0, dps: 0 };
    const mechanics = {
        counter: 0, invisible: 0, immunity: 0, piercing: 0, punisher: 0, antiTank: 0, cleanse: 0,
        aoe: 0, stacking: 0, energyGen: 0, skillSteal: 0, stun: 0, invulnerable: 0,
        triggerOnAction: 0, triggerOnHit: 0, achievement: 0, setup: 0
    };
    // NEW: Track which skills trigger which mechanic
    const mechanicDetails = {
        counter: [], invisible: [], immunity: [], piercing: [], punisher: [], antiTank: [], cleanse: [],
        aoe: [], stacking: [], energyGen: [], skillSteal: [], stun: [], invulnerable: [],
        triggerOnAction: [], triggerOnHit: [], achievement: [], setup: []
    };

    if (knowledge) {
        Object.keys(roles).forEach(r => roles[r] += knowledge.roles?.[r] || 0)
        Object.keys(mechanics).forEach(m => mechanics[m] += knowledge.mechanics?.[m] || 0)

        knowledge.skillProfiles.forEach(skill => {
            skill.tags.forEach(tag => {
                const mapped = MECHANIC_ALIAS[tag]
                if (mapped && mechanicDetails[mapped] !== undefined) {
                    mechanicDetails[mapped].push(`${skill.name} (${tag})`)
                }
            })
        })
    }

    if (!char.skills) return { roles, mechanics, mechanicDetails, knowledge };

    char.skills.forEach(skill => {
        const desc = (skill.description || '').toLowerCase();
        const classes = (skill.classes || '').toLowerCase();
        const skillName = skill.name;

        // 1. Role Detection
        if (ROLE_KEYWORDS.tank.some(k => desc.includes(k))) roles.tank++;
        if (ROLE_KEYWORDS.support.some(k => desc.includes(k))) roles.support++;
        if (ROLE_KEYWORDS.control.some(k => desc.includes(k))) roles.control++;
        if (ROLE_KEYWORDS.dps.some(k => desc.includes(k))) roles.dps++;

        // Class-based Role Boosts
        if (classes.includes('mental') || classes.includes('control')) roles.control++;
        if (classes.includes('affliction') || classes.includes('physical') || classes.includes('energy')) roles.dps++;
        if (classes.includes('strategic')) roles.support++;

        // 2. Advanced Mechanics Detection (Regex)
        Object.entries(MECHANIC_PATTERNS).forEach(([key, regex]) => {
            if (regex.test(desc)) {
                mechanics[key]++;
                mechanicDetails[key].push(skillName);
            }
        });

        // Special Logic: Punisher Detection
        if (MECHANIC_PATTERNS.triggerOnAction.test(desc)) {
            mechanics.punisher++;
            mechanicDetails.punisher.push(skillName);
        }

        // Special Logic: Class-based overrides (with basic invulnerability filter)
        if (classes.includes('instant') && classes.includes('strategic') && desc.includes('invulnerable')) {
            // REFINEMENT: Ignore basic invulnerability skills (1 turn duration, 4 turn CD)
            const isBasicInvuln = /invulnerable for 1 turn/i.test(desc) && (skill.cooldown === 4 || skill.cooldown === '4');

            if (!isBasicInvuln) {
                mechanics.immunity++;
                mechanics.invulnerable++;
                mechanicDetails.immunity.push(skillName);
                mechanicDetails.invulnerable.push(skillName);
            }
        }
    });

    return { roles, mechanics, mechanicDetails, knowledge };
};

// --- SYNERGY CALCULATION ---

export const calculateSynergy = (team, candidate) => {
    let score = 0;
    const teamHookProfile = buildTeamHookProfile(team)
    const candidateKnowledge = candidate?.id ? getCharacterKnowledge(candidate.id) : null
    const teamProfile = {
        roles: { tank: 0, support: 0, control: 0, dps: 0 },
        mechanics: {
            counter: 0, invisible: 0, immunity: 0, piercing: 0, punisher: 0, antiTank: 0, cleanse: 0,
            aoe: 0, stacking: 0, energyGen: 0, skillSteal: 0, stun: 0, invulnerable: 0,
            triggerOnAction: 0, triggerOnHit: 0
        },
        energy: { green: 0, red: 0, blue: 0, white: 0 }
    };

    // 1. Build Team Profile
    team.forEach(member => {
        const { roles, mechanics } = analyzeCharacter(member);
        Object.keys(roles).forEach(r => teamProfile.roles[r] += roles[r]);
        Object.keys(mechanics).forEach(m => teamProfile.mechanics[m] += (mechanics[m] || 0));

        member.skills.forEach(skill => {
            skill.energy.forEach(e => {
                if (teamProfile.energy[e] !== undefined) teamProfile.energy[e]++;
            });
        });
    });

    const { roles: candidateRoles, mechanics: candidateMechanics } = analyzeCharacter(candidate);

    // 2. Role Synergy (Base)
    if (teamProfile.roles.tank + teamProfile.roles.support < 2 && (candidateRoles.tank > 0 || candidateRoles.support > 0)) score += 20;
    if (teamProfile.roles.control < 2 && candidateRoles.control > 0) score += 15;
    if (teamProfile.roles.dps < 3 && candidateRoles.dps > 0) score += 10;

    // 3. Matrix-Based Synergy (The "Brain")

    // Check Candidate Mechanics vs Team Mechanics
    Object.keys(candidateMechanics).forEach(cMech => {
        if (candidateMechanics[cMech] > 0) {
            // Check against every mechanic present in the team
            Object.keys(teamProfile.mechanics).forEach(tMech => {
                if (teamProfile.mechanics[tMech] > 0) {
                    // Look up interaction in Matrix
                    // Try both directions: Matrix[tMech][cMech] and Matrix[cMech][tMech]

                    // Team affects Candidate
                    if (SYNERGY_MATRIX[tMech] && SYNERGY_MATRIX[tMech][cMech]) {
                        score += SYNERGY_MATRIX[tMech][cMech];
                    }

                    // Candidate affects Team
                    if (SYNERGY_MATRIX[cMech] && SYNERGY_MATRIX[cMech][tMech]) {
                        score += SYNERGY_MATRIX[cMech][tMech];
                    }
                }
            });
        }
    });

    // 4. Specific Logic Overrides

    // Anti-Tank Need
    if (teamProfile.mechanics.piercing === 0 && teamProfile.mechanics.antiTank === 0) {
        if (candidateMechanics.piercing > 0 || candidateMechanics.antiTank > 0) score += 15;
    }

    // Energy Balance
    let energyPenalty = 0;
    if (candidate.skills) {
        candidate.skills.forEach(skill => {
            if (skill.energy) {
                skill.energy.forEach(e => {
                    if (e !== 'black' && e !== 'none' && teamProfile.energy[e] !== undefined) {
                        if (teamProfile.energy[e] > 3) energyPenalty += 10;
                        else if (teamProfile.energy[e] > 1) energyPenalty += 5;
                    }
                });
            }
        });
    }
    score -= energyPenalty;

    // Diversity Bonus
    const candidateEnergyTypes = new Set();
    if (candidate.skills) {
        candidate.skills.forEach(s => {
            if (s.energy) {
                s.energy.forEach(e => {
                    if (e !== 'black' && e !== 'none') candidateEnergyTypes.add(e);
                });
            }
        });
    }
    candidateEnergyTypes.forEach(e => {
        if (teamProfile.energy[e] === 0) score += 5;
    });

    const hookResult = evaluateHookSynergy(teamHookProfile, candidateKnowledge)
    score += hookResult.hookScore

    const normalizedScore = Math.round(score / Math.max(team.length + 1, 2))

    return normalizedScore;
};

// --- HELPERS ---

const extractSkillDamage = (skill) => {
    if (!skill) return 0
    if (typeof skill.damage === 'number' && skill.damage > 0) return skill.damage
    if (skill.description) {
        const desc = skill.description.toLowerCase()

        // Capture periodic/affliction damage with duration (e.g., 15 affliction damage for 3 turns)
        const dotMatch = desc.match(/(\d+)\s+(?:affliction )?damage[^.]*?for\s+(\d+)\s+turns?/)
        if (dotMatch && dotMatch[1] && dotMatch[2]) {
            const perTick = parseInt(dotMatch[1], 10)
            const turns = parseInt(dotMatch[2], 10)
            if (!Number.isNaN(perTick) && !Number.isNaN(turns)) {
                return perTick * Math.max(1, turns)
            }
        }

        // Permanent or "each turn" afflictions without explicit end: assume 3-turn expectation
        const permanentDotMatch = desc.match(/(\d+)\s+(?:affliction )?damage[^.]*each turn.*permanent/)
        if (permanentDotMatch && permanentDotMatch[1]) {
            const perTick = parseInt(permanentDotMatch[1], 10)
            if (!Number.isNaN(perTick)) return perTick * 3
        }

        const match = desc.match(/(\d+)\s*(?:damage|dmg)/)
        if (match && match[1]) return parseInt(match[1], 10)
    }
    return 0
}

const getEnergyCost = (skill) => {
    if (!skill || !Array.isArray(skill.energy)) return 0
    return skill.energy.filter(e => e !== 'none').length
}

const summarizeSustain = (skill) => {
    const summary = { healing: 0, mitigation: 0, cleanse: 0, energy: 0 }
    const desc = (skill.description || '').toLowerCase()
    // Simple keyword check for sustain
    if (desc.includes('heal') || desc.includes('restore health')) summary.healing = 1;
    if (desc.includes('reduce damage') || desc.includes('invulnerable')) summary.mitigation = 1;
    if (desc.includes('remove harmful')) summary.cleanse = 1;
    return summary
}

const getBestDamageSkill = (char) => {
    if (!char || !Array.isArray(char.skills)) return { damage: 0, energyCost: 0, control: 0 }
    let best = { damage: 0, energyCost: 0, control: 0 }
    char.skills.forEach(skill => {
        const damage = extractSkillDamage(skill)
        const energyCost = getEnergyCost(skill)
        const control = ROLE_KEYWORDS.control.some(k => (skill.description || '').toLowerCase().includes(k)) ? 1 : 0
        if (damage > best.damage) best = { damage, energyCost: Math.max(1, energyCost), control }
    })
    return best
}

const estimateTempo = (team, maxDPE) => {
    let burstDamage = 0
    let burstEnergy = 0
    let controlPieces = 0
    team.forEach(member => {
        const bestSkill = getBestDamageSkill(member)
        burstDamage += bestSkill.damage
        burstEnergy += bestSkill.energyCost
        controlPieces += bestSkill.control
    })
    const baseHP = 100
    const estimatedKillTurns = burstDamage > 0 ? Math.max(1, Math.ceil(baseHP / Math.max(1, burstDamage))) : null
    const costToKill = burstDamage > 0 ? Math.max(1, Math.ceil((baseHP / Math.max(1, burstDamage)) * Math.max(burstEnergy, team.length))) : null
    const controlBonus = clamp(controlPieces * 8, 0, 20)
    const pressureRating = clamp(Math.round((burstDamage / 120) * 55 + (maxDPE / 45) * 25 + controlBonus), 0, 100)
    return { burstDamage, burstEnergy, estimatedKillTurns, costToKill, pressureRating }
}

function damagePerEnergy(skill) {
    let dmg = extractSkillDamage(skill);
    const energyCount = (skill.energy && Array.isArray(skill.energy))
        ? skill.energy.filter(e => e !== 'none' && e !== 'black').length
        : 0;
    return energyCount > 0 ? dmg / energyCount : 0;
}

function getMaxDPE(char) {
    if (!char.skills) return 0;
    let max = 0;
    char.skills.forEach(skill => {
        const dpe = damagePerEnergy(skill);
        if (dpe > max) max = dpe;
    });
    return max;
}

// --- EXPORTS ---

export const getSuggestions = (allCharacters, currentTeam, count = 5) => {
    if (currentTeam.length === 3) return [];
    const candidates = allCharacters.filter(c => !currentTeam.find(m => m.id === c.id));
    const scoredCandidates = candidates.map(char => ({
        ...char,
        synergyScore: calculateSynergy(currentTeam, char)
    }));
    return scoredCandidates.sort((a, b) => b.synergyScore - a.synergyScore).slice(0, count);
};
// Analyze Team
export const analyzeTeam = (team) => {
    if (!team || team.length === 0) return { ...DEFAULT_ANALYSIS }

    const roles = { tank: 0, support: 0, control: 0, dps: 0 }
    const mechanics = {
        counter: 0, invisible: 0, immunity: 0, piercing: 0, punisher: 0, antiTank: 0, cleanse: 0,
        aoe: 0, stacking: 0, energyGen: 0, skillSteal: 0, stun: 0, invulnerable: 0,
        triggerOnAction: 0, triggerOnHit: 0, achievement: 0, setup: 0
    }
    // NEW: Aggregate details
    const teamMechanicDetails = {
        counter: [], invisible: [], immunity: [], piercing: [], punisher: [], antiTank: [], cleanse: [],
        aoe: [], stacking: [], energyGen: [], skillSteal: [], stun: [], invulnerable: [],
        triggerOnAction: [], triggerOnHit: [], achievement: [], setup: []
    };

    const energyDistribution = { green: 0, red: 0, blue: 0, white: 0, black: 0 }
    const dpeValues = []
    const sustain = { healingTools: 0, mitigationTools: 0, cleanseTools: 0 }
    const warnings = []
    const { hooks: hookCounts, hookNames } = buildTeamHookProfile(team)

    // V4: Energy Flexibility Tracking
    let lowCostSkillCount = 0
    let totalSkillCost = 0
    let totalSkills = 0
    const uniqueColors = new Set()

    // Analyze Team
    team.forEach(member => {
        const { roles: memberRoles, mechanics: memberMechanics, mechanicDetails } = analyzeCharacter(member)
        Object.keys(memberRoles).forEach(r => roles[r] += memberRoles[r])
        Object.keys(memberMechanics).forEach(m => mechanics[m] += (memberMechanics[m] || 0))

        // Aggregate mechanic details with character names
        if (mechanicDetails) {
            Object.keys(mechanicDetails).forEach(m => {
                if (mechanicDetails[m] && mechanicDetails[m].length > 0) {
                    mechanicDetails[m].forEach(skillName => {
                        teamMechanicDetails[m].push(`${member.name}: ${skillName}`);
                    });
                }
            });
        }

        if (member.skills) {
            member.skills.forEach(skill => {
                // Energy distribution tracking
                if (skill.energy) {
                    skill.energy.forEach(e => {
                        if (energyDistribution[e] !== undefined) energyDistribution[e]++
                        if (e !== 'none' && e !== 'black') uniqueColors.add(e)
                    })

                    // V4: Energy flexibility calculation
                    const skillCost = skill.energy.filter(e => e !== 'none').length
                    totalSkillCost += skillCost
                    totalSkills++
                    if (skillCost <= 1) lowCostSkillCount++
                }

                const dpe = damagePerEnergy(skill)
                if (dpe > 0) dpeValues.push(dpe)
                const sustainValues = summarizeSustain(skill)
                sustain.healingTools += sustainValues.healing
                sustain.mitigationTools += sustainValues.mitigation
                sustain.cleanseTools += sustainValues.cleanse
            })
        }
    })

    // Check for Anti-Synergies (Warnings)
    if (mechanics.stun > 0 && mechanics.punisher > 0) {
        warnings.push("Potential Anti-Synergy: Stuns may prevent Punisher skills (like Ino S) from triggering.");
    }

    const maxDPE = dpeValues.length > 0 ? Math.max(...dpeValues) : 0
    const avgDPE = dpeValues.length > 0 ? dpeValues.reduce((a, b) => a + b, 0) / dpeValues.length : 0

    const strengths = []
    const weaknesses = []
    const strategies = []

    // Helper to format evidence
    const getEvidence = (mechanicKey) => {
        const details = teamMechanicDetails[mechanicKey];
        if (!details || details.length === 0) return "";
        // Limit to top 2 examples to keep it concise
        return ` (${details.slice(0, 2).join(', ')})`;
    };

    // Strengths
    if (avgDPE > 30) strengths.push('High damage output')
    if (roles.control >= 3) strengths.push(`Excellent crowd control${getEvidence('stun')}`)
    if (mechanics.antiTank > 0) strengths.push(`Shield Breaker (Anti-Tank)${getEvidence('antiTank')}`)
    if (mechanics.piercing >= 2) strengths.push(`Armor Piercing${getEvidence('piercing')}`)
    if (mechanics.immunity >= 1) strengths.push(`Effect Immunity${getEvidence('immunity')}`)
    if (mechanics.counter >= 1) strengths.push(`Counter-Play${getEvidence('counter')}`)
    if (mechanics.invisible >= 1) strengths.push(`Stealth Tactics${getEvidence('invisible')}`)
    if (mechanics.energyGen > 0) strengths.push(`Energy Generation${getEvidence('energyGen')}`)
    if (mechanics.aoe >= 2) strengths.push(`AoE Pressure${getEvidence('aoe')}`)

    // Weaknesses
    if (avgDPE < 15) weaknesses.push('Low damage output')
    if (roles.control < 1) weaknesses.push('Vulnerable to combos (Low Control)')
    if (mechanics.antiTank === 0 && mechanics.piercing === 0) weaknesses.push('Struggles against heavy defense')
    if (sustain.healingTools === 0 && sustain.mitigationTools === 0) weaknesses.push('No sustain/healing')

    // Strategies
    if (mechanics.punisher > 0) strategies.push(`Trap & Punish: Force enemies to make bad choices${getEvidence('punisher')}`)
    if (mechanics.stacking > 0) strategies.push(`Ramp Up: Survive early game to stack damage${getEvidence('stacking')}`)
    if (mechanics.energyGen > 0 && maxDPE > 40) strategies.push('Battery: Feed energy to your carry')
    if (mechanics.aoe >= 2) strategies.push('Spread Pressure: Whittle down entire enemy team')

    // V4: Energy Flexibility Insights
    const avgCost = totalSkills > 0 ? totalSkillCost / totalSkills : 0
    const colorSpread = uniqueColors.size

    if (avgCost <= 1.5) strengths.push('Energy Efficient (low avg cost)')
    if (lowCostSkillCount >= 6) strengths.push('High Action Consistency (6+ low-cost skills)')
    if (colorSpread >= 4) strengths.push('Energy Flexible (4+ colors)')
    if (mechanics.setup > 0) strengths.push(`Setup Archetype${getEvidence('setup')}`)
    if (mechanics.achievement > 0) strengths.push(`Achievement Potential${getEvidence('achievement')}`)

    const totalEnergyTokens = Object.values(energyDistribution).reduce((a, b) => a + b, 0)
    const dominantEnergyCount = Math.max(...Object.values(energyDistribution))
    const dominantEnergyRatio = totalEnergyTokens > 0 ? dominantEnergyCount / totalEnergyTokens : 0

    if (avgCost >= 2.2) warnings.push(`⚠️ High Energy Requirements (avg ${avgCost.toFixed(1)})`)
    if (colorSpread <= 2 || dominantEnergyRatio >= 0.55) {
        const dominantLabel = Object.entries(energyDistribution)
            .sort((a, b) => b[1] - a[1])
            .filter(([type, count]) => count > 0)
            .map(([type]) => type)[0]
        const reason = colorSpread <= 2 ? 'only 1-2 colors' : `${Math.round(dominantEnergyRatio * 100)}% ${dominantLabel}`
        warnings.push(`⚠️ Energy Bottleneck (${reason})`)
    }

    const tempo = estimateTempo(team, maxDPE)

    // Synergy Score Calculation
    const comboHighlights = []
    if (hookCounts.setups > 0 && hookCounts.payoffs > 0) {
        comboHighlights.push(`Setup → Payoff chain (${Array.from(hookNames.setups).join(', ')} into ${Array.from(hookNames.payoffs).join(', ')})`)
    }
    if (hookCounts.energySupport > 0 && hookCounts.highCostThreats > 0) {
        comboHighlights.push(`Energy battery online (${Array.from(hookNames.energySupport).join(', ')} feeding ${Array.from(hookNames.highCostThreats).join(', ')})`)
    }
    if (hookCounts.sustain > 0 && hookCounts.highCostThreats > 0) {
        comboHighlights.push(`Protect-the-carry tools (${Array.from(hookNames.sustain).join(', ')} covering ${Array.from(hookNames.highCostThreats).join(', ')})`)
    }

    const synergyHighlights = []
    if (mechanics.immunity > 0 && roles.dps >= 2) synergyHighlights.push('Immunity protects Carries')
    if (mechanics.stun > 0 && mechanics.setup > 0) synergyHighlights.push('Stun allows safe setup')
    synergyHighlights.push(...comboHighlights)

    // V4: Energy Flexibility Modifiers
    let energyFlexibilityBonus = 0
    if (avgCost <= 1.5) energyFlexibilityBonus += 10
    if (lowCostSkillCount >= 6) energyFlexibilityBonus += 10
    if (mechanics.setup > 0) energyFlexibilityBonus += 5
    if (avgCost >= 2.2) energyFlexibilityBonus -= clamp(Math.round((avgCost - 2) * 10), 10, 20)
    if (colorSpread <= 2 || dominantEnergyRatio >= 0.55) energyFlexibilityBonus -= 10

    const totalRoles = Object.values(roles).reduce((a, b) => a + b, 0)
    const totalMechanics = Object.values(mechanics).reduce((a, b) => a + b, 0)
    const slotBaseline = Math.max(team.length, 1)
    const roleDensity = totalRoles / (slotBaseline * 2)
    const mechanicDensity = totalMechanics / (slotBaseline * 3)
    const comboScore = Math.min(hookCounts.setups, hookCounts.payoffs) * 6
        + Math.min(hookCounts.energySupport, hookCounts.highCostThreats) * 4
        + Math.min(hookCounts.sustain, hookCounts.highCostThreats) * 3

    const synergyScore = clamp(
        Math.round(
            (roleDensity * 30) +
            (mechanicDensity * 20) +
            (tempo.pressureRating * 0.25) +
            energyFlexibilityBonus +
            Math.min(comboScore, 25) -
            (warnings.length * 12)
        ),
        0,
        100
    )

    return {
        roles,
        mechanics,
        energyDistribution,
        maxDPE,
        avgDPE,
        strengths,
        weaknesses,
        strategies,
        synergyHighlights,
        warnings,
        tempo,
        sustain,
        synergyScore
    }
}
