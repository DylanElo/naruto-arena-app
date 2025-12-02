import { getCharacterKnowledge } from './knowledgeEngine'
import { GameState, Character } from '../engine/models.js';
import { analyzeGameState as analyzeGameStateSimulation } from '../engine/analyzer.js';

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
    const enemyHP = 100 // HP per enemy
    const enemyCount = 3 // Standard team size
    const totalEnemyHP = enemyHP * enemyCount // 300 total HP to clear
    const estimatedKillTurns = burstDamage > 0 ? Math.max(1, Math.ceil(totalEnemyHP / Math.max(1, burstDamage))) : null
    const costToKill = burstDamage > 0 ? Math.max(1, Math.ceil((totalEnemyHP / Math.max(1, burstDamage)) * Math.max(burstEnergy, team.length))) : null
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

/**
 * ENHANCED: Analyze team using SIMULATION ENGINE
 * Provides actual damage calculations and kill threat analysis
 */
export const analyzeTeamWithSimulation = (team, enemyTeam = null) => {
    // Get base analysis
    const baseAnalysis = analyzeTeam(team);

    // If no enemy team provided, return base analysis
    if (!enemyTeam || enemyTeam.length === 0) {
        return { ...baseAnalysis, simulation: null };
    }

    try {
        // Create game state
        const gameState = new GameState();
        gameState.teams[0] = team.map(c => new Character(c));
        gameState.teams[1] = enemyTeam.map(c => new Character(c));

        // Run simulation analysis
        const simAnalysis = analyzeGameStateSimulation(gameState, 0);

        // Add simulation insights to base analysis
        const enhancedStrengths = [...baseAnalysis.strengths];
        const enhancedWeaknesses = [...baseAnalysis.weaknesses];

        // Add simulation-based insights
        if (simAnalysis.killThreat > 50) {
            enhancedStrengths.push('🎯 High kill threat detected (can eliminate enemies)');
        }

        if (simAnalysis.hpDelta > 50) {
            enhancedStrengths.push('💪 Strong HP advantage');
        } else if (simAnalysis.hpDelta < -50) {
            enhancedWeaknesses.push('⚠️ Significant HP disadvantage');
        }

        if (simAnalysis.energyEfficiency > 150) {
            enhancedStrengths.push('⚡ Excellent energy generation');
        }

        return {
            ...baseAnalysis,
            strengths: enhancedStrengths,
            weaknesses: enhancedWeaknesses,
            simulation: {
                hpDelta: simAnalysis.hpDelta,
                killThreat: simAnalysis.killThreat,
                energyEfficiency: simAnalysis.energyEfficiency,
                cooldownPressure: simAnalysis.cooldownPressure,
                overallScore: simAnalysis.overallScore
            }
        };
    } catch (error) {
        console.warn('Simulation engine failed, using base analysis:', error);
        return { ...baseAnalysis, simulation: null };
    }
}

// --- BUILD AROUND A CHARACTER --------------------------------------

/**
 * Get a normalized primary / secondary role for a character
 */
const getPrimaryRoles = (char) => {
    const { roles } = analyzeCharacter(char)
    const entries = Object.entries(roles || {})
        .filter(([_, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])

    if (entries.length === 0) return { primary: null, secondary: null }
    const [primary] = entries
    const secondary = entries[1] || null

    return {
        primary: primary[0],
        secondary: secondary ? secondary[0] : null
    }
}

/**
 * Score how well candidate covers what the main character lacks.
 * This is *purely* role & mechanics based, using the manual-grounded tags from knowledgeEngine.
 */
const scorePartnerFit = (mainChar, candidate) => {
    const mainProfile = analyzeCharacter(mainChar)
    const candProfile = analyzeCharacter(candidate)

    const mainRoles = getPrimaryRoles(mainChar)
    const candRoles = getPrimaryRoles(candidate)

    let score = 0
    const notes = []

    // 1) Basic role complementarity
    if (mainRoles.primary === 'dps') {
        if (candRoles.primary === 'support') { score += 25; notes.push('brings sustain and utility to a carry') }
        if (candRoles.primary === 'tank') { score += 20; notes.push('frontline / protection for a glass cannon') }
        if (candRoles.primary === 'control') { score += 15; notes.push('adds control so your DPS can hit safely') }
    } else if (mainRoles.primary === 'support') {
        if (candRoles.primary === 'dps') { score += 25; notes.push('gives you a clear damage win condition') }
        if (candRoles.primary === 'control') { score += 20; notes.push('locks enemies while you sustain') }
    } else if (mainRoles.primary === 'control') {
        if (candRoles.primary === 'dps') { score += 25; notes.push('control + damage pairing') }
        if (candRoles.primary === 'tank') { score += 15; notes.push('frontline control style') }
    } else if (mainRoles.primary === 'tank') {
        if (candRoles.primary === 'dps') { score += 20; notes.push('tank + carry core') }
        if (candRoles.primary === 'support') { score += 15; notes.push('very grindy, sustain-heavy core') }
    }

    // 2) Manual-based mechanics synergy (using knowledgeEngine mechanics)
    const mMech = mainProfile.mechanics
    const cMech = candProfile.mechanics

    // a) Stun + setup: control protects setup / DoT
    if (mMech.stun > 0 && cMech.setup > 0) {
        score += 15
        notes.push('your stuns give them safe setup turns')
    }
    if (mMech.setup > 0 && cMech.stun > 0) {
        score += 15
        notes.push('their stuns give your setup time to stack')
    }

    // b) Affliction / stacking + control: they sit and burn
    if (mMech.stacking > 0 && cMech.stun > 0) {
        score += 10
        notes.push('control keeps enemies under your DoTs/affliction')
    }
    if (cMech.stacking > 0 && mMech.stun > 0) {
        score += 10
        notes.push('your control keeps enemies under their DoTs/affliction')
    }

    // c) Anti-tank tools + DoT / affliction
    if (mMech.antiTank > 0 && cMech.stacking > 0) {
        score += 10
        notes.push('anti-tank tools plus DoTs to break defensive teams')
    }
    if (cMech.antiTank > 0 && mMech.stacking > 0) {
        score += 10
        notes.push('DoTs plus anti-tank tools to punish DR/DD')
    }

    // d) Energy synergies: battery + high-cost carry
    const mKnowledge = mainProfile.knowledge
    const cKnowledge = candProfile.knowledge
    const mainHasHighCost = mKnowledge?.skillProfiles?.some(sk =>
        sk.tags.includes('highCost') || sk.tags.includes('finisher')
    )
    const candHasEnergySupport = cKnowledge?.hooks?.energySupport?.length > 0

    if (mainHasHighCost && candHasEnergySupport) {
        score += 20
        notes.push('they act as an energy battery for your expensive skills')
    }

    // e) Protect-the-carry: invul / shields / heals around a DPS
    const mainIsCarry = mainHasHighCost || (mainRoles.primary === 'dps' && mMech.piercing + mMech.stacking > 0)
    const candHasProtection =
        cMech.immunity > 0 || cMech.invulnerable > 0 || cMech.cleanse > 0

    if (mainIsCarry && candHasProtection) {
        score += 20
        notes.push('they can keep your main threat alive (invul / DR / cleanse)')
    }

    // 3) Energy color complementarity (avoid identical heavy-color spam)
    const mainEnergy = { green: 0, red: 0, blue: 0, white: 0 }
    const candEnergy = { green: 0, red: 0, blue: 0, white: 0 }

    const countColors = (char, bucket) => {
        (char.skills || []).forEach(skill => {
            (skill.energy || []).forEach(e => {
                if (e && e !== 'black' && e !== 'none' && bucket[e] !== undefined) {
                    bucket[e]++
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

/**
 * Build-around helper:
 *  - mainChar: the character you want to build around (object with id, name, skills)
 *  - allCharacters: full roster (characters.json)
 *  - ownedIds: optional Set or array of ids you actually own (for Collection mode)
 */
export const recommendPartnersForMain = (mainChar, allCharacters, ownedIds = null, maxResults = 15) => {
    if (!mainChar) return []

    const ownedSet = ownedIds
        ? new Set(Array.isArray(ownedIds) ? ownedIds : Array.from(ownedIds))
        : null

    const candidates = allCharacters.filter(c => c.id !== mainChar.id)
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

// --- COUNTER LOGIC (MANUAL-DRIVEN / TAG-BASED) -------------------------

/**
 * Derive what kind of tools we NEED against an enemy team,
 * based on their mechanics coming from analyzeTeam(enemyTeam).
 *
 * Manual mapping:
 * - immunity  ≈ damage reduction / destructible defense / unpierceable DR
 * - invulnerable ≈ invulnerability tools (targeting denial)
 * - stacking ≈ affliction / DoT / health-steal style attrition
 * - antiTank ≈ piercing / finishers that ignore or break DR/DD
 * - stun / counter ≈ hard control
 * - cleanse ≈ heal / cleanse / sustain vs affliction & DoTs
 * - energyGen ≈ extra energy generation / ramp tools
 */
const deriveCounterNeeds = (enemyMechanics) => {
    const needs = {
        antiTank: 0,
        stacking: 0,
        cleanse: 0,
        stun: 0,
        immunity: 0,
        counter: 0,
        energyGen: 0
    };

    // Baseline: some control, some anti-tank, some sustain is always good
    needs.stun += 1;
    needs.antiTank += 1;
    needs.cleanse += 1;

    // Tanky / DR-heavy / invul spam: we want affliction & anti-tank
    if ((enemyMechanics.immunity || 0) >= 2 || (enemyMechanics.invulnerable || 0) >= 2) {
        needs.antiTank += 3;   // piercing / finishers
        needs.stacking += 2;   // affliction / DoT
    }

    // Heavy affliction / DoT pressure: we want cleanse + some control
    if ((enemyMechanics.stacking || 0) >= 3) {
        needs.cleanse += 3;
        needs.stun += 1;
    }

    // Stun / hard control spam: we want immunity / invul / counters
    if ((enemyMechanics.stun || 0) >= 3 || (enemyMechanics.counter || 0) >= 2) {
        needs.immunity += 3;   // DR / invul / ignore harmful
        needs.counter += 2;    // reflect / counter back
        needs.cleanse += 1;    // to clear harmful chains
    }

    // Big AoE damage: we want sustain + some mitigation
    if ((enemyMechanics.aoe || 0) >= 3) {
        needs.cleanse += 2;
        needs.immunity += 1;
    }

    // High energy generation: we want pressure + some way to keep up
    if ((enemyMechanics.energyGen || 0) >= 2) {
        needs.stun += 2;       // slow their ramp
        needs.counter += 1;
        needs.energyGen += 1;  // or keep up with them
    }

    return needs;
};

/**
 * Score how well a single candidate's mechanics match our "needs".
 * This works at the CHARACTER level (not full team),
 * which is how the CounterBuilder UI currently suggests picks.
 */
const scoreCounterCandidateVsNeeds = (candidateMechanics, needs) => {
    let score = 0;
    const contributions = {};

    const contribute = (key, weight = 1) => {
        const have = candidateMechanics[key] || 0;
        const need = needs[key] || 0;
        if (have <= 0 || need <= 0) return;
        const contrib = Math.min(have, need) * weight;
        score += contrib;
        contributions[key] = contrib;
    };

    // Heavier weights for the most important counter mechanics
    contribute('antiTank', 4);   // vs DR/DD/invul walls
    contribute('stacking', 3);   // affliction / DoT vs tanks
    contribute('cleanse', 3);    // vs affliction & AoE pressure
    contribute('stun', 3);       // generic control / tempo
    contribute('immunity', 2);   // survive stuns / DoT
    contribute('counter', 2);    // reflect key skills
    contribute('energyGen', 2);  // keep up in long games

    return { score, contributions };
};

/**
 * Tag-based counter score for a single candidate vs an enemy team.
 * Optionally considers currentTeam synergy.
 */
export const scoreCounterCandidateByTags = (candidate, enemyTeam, currentTeam = []) => {
    if (!candidate || !enemyTeam || enemyTeam.length === 0) return 0;

    // 1) What is the enemy actually doing?
    const enemyAnalysis = analyzeTeam(enemyTeam);
    const enemyMechanics = enemyAnalysis.mechanics || {};
    const needs = deriveCounterNeeds(enemyMechanics);

    // 2) What does this candidate bring?
    const candidateProfile = analyzeCharacter(candidate);
    const { score: counterFitScore } = scoreCounterCandidateVsNeeds(candidateProfile.mechanics, needs);

    // 3) Optional: how well do they fit with the current team?
    let synergyBonus = 0;
    if (currentTeam && currentTeam.length > 0) {
        const teamAnalysis = analyzeTeam([...currentTeam, candidate]);
        const synergyScore = teamAnalysis.synergyScore || 0;
        // We downscale synergy so it doesn't overshadow the counter fit
        synergyBonus = synergyScore * 0.25;
    }

    const finalScore = Math.round((counterFitScore * 10) + synergyBonus);
    return Math.max(0, finalScore);
};

/**
 * Human-readable explanation for WHY a candidate is a good counter
 * using manual-based tags (affliction vs DR, cleanse vs DoT, etc.).
 */
export const explainCounterFitByTags = (candidate, enemyTeam) => {
    if (!candidate || !enemyTeam || enemyTeam.length === 0) {
        return 'No enemy team to counter.';
    }

    const enemyAnalysis = analyzeTeam(enemyTeam);
    const enemyMechanics = enemyAnalysis.mechanics || {};
    const needs = deriveCounterNeeds(enemyMechanics);
    const profile = analyzeCharacter(candidate);
    const m = profile.mechanics || {};

    const reasons = [];

    if ((needs.antiTank || 0) > 0 && (m.antiTank || m.piercing || 0) > 0) {
        reasons.push('✓ Anti-tank tools vs their DR / defenses');
    }
    if ((needs.stacking || 0) > 0 && (m.stacking || 0) > 0) {
        reasons.push('✓ Affliction / DoT pressure vs defensive teams');
    }
    if ((needs.cleanse || 0) > 0 && (m.cleanse || 0) > 0) {
        reasons.push('✓ Cleanse / sustain vs their affliction / DoT');
    }
    if ((needs.stun || 0) > 0 && (m.stun || 0) > 0) {
        reasons.push('✓ Crowd control to slow their combo');
    }
    if ((needs.immunity || 0) > 0 && ((m.immunity || 0) > 0 || (m.invulnerable || 0) > 0)) {
        reasons.push('✓ Damage reduction / invulnerability vs their control');
    }
    if ((needs.counter || 0) > 0 && (m.counter || 0) > 0) {
        reasons.push('✓ Counters / reflection vs key enemy skills');
    }
    if ((needs.energyGen || 0) > 0 && (m.energyGen || 0) > 0) {
        reasons.push('✓ Extra energy to keep up in longer matches');
    }

    if (!reasons.length) {
        reasons.push('General good mechanics and stats vs this team');
    }

    return reasons.join(' | ');
};

/**
 * High-level helper:
 * Recommend individual counter PICKS (characters) against an enemy team,
 * using manual-tag-based logic instead of the simulation engine.
 *
 * - enemyTeam: array of 1–3 enemy character objects
 * - allCharacters: full roster (characters.json)
 * - ownedIds: optional array/Set of character IDs you actually own
 */
export const recommendCounterCandidatesByTags = (
    enemyTeam,
    allCharacters,
    ownedIds = null,
    currentTeam = [],
    maxResults = 15
) => {
    if (!enemyTeam || enemyTeam.length === 0) return [];

    const ownedSet = ownedIds
        ? new Set(Array.isArray(ownedIds) ? ownedIds : Array.from(ownedIds))
        : null;

    const availableChars = allCharacters.filter(c =>
        (!ownedSet || ownedSet.has(c.id)) &&
        !enemyTeam.find(e => e.id === c.id) &&
        !currentTeam.find(t => t.id === c.id)
    );

    const scored = availableChars.map(char => {
        const score = scoreCounterCandidateByTags(char, enemyTeam, currentTeam);
        const reason = explainCounterFitByTags(char, enemyTeam);
        return {
            ...char,
            counterScoreByTags: score,
            counterReasonByTags: reason
        };
    });

    return scored
        .sort((a, b) => b.counterScoreByTags - a.counterScoreByTags)
        .slice(0, maxResults);
};
