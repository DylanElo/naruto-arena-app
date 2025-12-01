
// Keywords to identify roles based on skill descriptions
const ROLE_KEYWORDS = {
    tank: ['damage reduction', 'destructible defense', 'invulnerable', 'counter', 'reflect'],
    support: ['heal', 'remove harmful effects', 'energy', 'invulnerable to', 'defense'],
    control: ['stun', 'unable to reduce damage', 'remove energy', 'cooldowns increased', 'unable to be used'],
    dps: ['damage', 'piercing', 'affliction', 'critical', 'additional damage']
}

const SUSTAIN_KEYWORDS = {
    healing: ['heal', 'recover', 'restore health', 'regain', 'regenerat'],
    mitigation: ['reduce damage', 'ignore', 'destructible defense', 'block', 'shield', 'invulnerable'],
    cleanse: ['remove', 'cleanse', 'purge', 'cure', 'harmful effects'],
    energy: ['gain', 'random energy', 'additional energy', 'extra energy']
}

const CONTROL_KEYWORDS = ['stun', 'cooldown', 'counter', 'interrupt', 'disable', 'unable to']

const DEFAULT_ANALYSIS = {
    roles: { tank: 0, support: 0, control: 0, dps: 0 },
    energyDistribution: { green: 0, red: 0, blue: 0, white: 0, black: 0 },
    maxDPE: 0,
    avgDPE: 0,
    strengths: [],
    weaknesses: [],
    strategies: [],
    synergyHighlights: [],
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

// Analyze a character to determine their primary roles
// Analyze a character to determine their primary roles
export const analyzeCharacter = (char) => {
    const roles = { tank: 0, support: 0, control: 0, dps: 0 };

    if (!char.skills) return roles;

    char.skills.forEach(skill => {
        const desc = (skill.description || '').toLowerCase();
        const classes = (skill.classes || '').toLowerCase();

        // Check keywords in description
        if (ROLE_KEYWORDS.tank.some(k => desc.includes(k))) roles.tank++;
        if (ROLE_KEYWORDS.support.some(k => desc.includes(k))) roles.support++;
        if (ROLE_KEYWORDS.control.some(k => desc.includes(k))) roles.control++;
        if (ROLE_KEYWORDS.dps.some(k => desc.includes(k))) roles.dps++;

        // Check classes
        if (classes.includes('mental') || classes.includes('control')) roles.control++;
        if (classes.includes('affliction') || classes.includes('physical') || classes.includes('energy')) roles.dps++;
        if (classes.includes('strategic')) roles.support++; // Strategic is often support/utility
    });

    return roles;
};

const extractSkillDamage = (skill) => {
    if (!skill) return 0

    if (typeof skill.damage === 'number' && skill.damage > 0) {
        return skill.damage
    }

    if (skill.description) {
        const desc = skill.description.toLowerCase()
        const match = desc.match(/(\d+)\s*(?:damage|dmg)/)
        if (match && match[1]) {
            return parseInt(match[1], 10)
        }
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

    Object.entries(SUSTAIN_KEYWORDS).forEach(([type, keywords]) => {
        if (keywords.some(k => desc.includes(k))) {
            summary[type] = 1
        }
    })

    if (typeof skill.heal === 'number' && skill.heal > 0) {
        summary.healing = 1
    }

    return summary
}

const getBestDamageSkill = (char) => {
    if (!char || !Array.isArray(char.skills)) return { damage: 0, energyCost: 0, control: 0 }

    let best = { damage: 0, energyCost: 0, control: 0 }

    char.skills.forEach(skill => {
        const damage = extractSkillDamage(skill)
        const energyCost = getEnergyCost(skill)
        const control = CONTROL_KEYWORDS.some(k => (skill.description || '').toLowerCase().includes(k)) ? 1 : 0

        if (damage > best.damage) {
            best = { damage, energyCost: Math.max(1, energyCost), control }
        }
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

    return {
        burstDamage,
        burstEnergy,
        estimatedKillTurns,
        costToKill,
        pressureRating
    }
}

// Calculate a synergy score for a candidate character joining a team
export const calculateSynergy = (team, candidate) => {
    let score = 0;
    const teamRoles = { tank: 0, support: 0, control: 0, dps: 0 };
    const teamEnergy = { green: 0, red: 0, blue: 0, white: 0 };

    // Analyze current team
    team.forEach(member => {
        const memberRoles = analyzeCharacter(member);
        Object.keys(memberRoles).forEach(r => teamRoles[r] += memberRoles[r]);

        member.skills.forEach(skill => {
            skill.energy.forEach(e => {
                if (teamEnergy[e] !== undefined) teamEnergy[e]++;
            });
        });
    });

    const candidateRoles = analyzeCharacter(candidate);

    // 1. Role Synergy: Reward filling gaps
    // Ideal composition (heuristic): 1 Tank/Support, 1 Control, 1 DPS
    // Or at least a mix.
    if (teamRoles.tank + teamRoles.support < 2 && (candidateRoles.tank > 0 || candidateRoles.support > 0)) score += 20;
    if (teamRoles.control < 2 && candidateRoles.control > 0) score += 15;
    if (teamRoles.dps < 3 && candidateRoles.dps > 0) score += 10;

    // 2. Energy Balance: Penalize overlapping energy costs
    let energyPenalty = 0;
    if (candidate.skills) {
        candidate.skills.forEach(skill => {
            if (skill.energy) {
                skill.energy.forEach(e => {
                    if (e !== 'black' && e !== 'none' && teamEnergy[e] !== undefined) {
                        // High penalty if team already uses this color heavily (> 3 skills using it)
                        if (teamEnergy[e] > 3) energyPenalty += 10;
                        else if (teamEnergy[e] > 1) energyPenalty += 5;
                    }
                });
            }
        });
    }
    score -= energyPenalty;

    // 3. Diversity Bonus: Slight bonus for different energy types
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
        if (teamEnergy[e] === 0) score += 5; // Brings a new energy type
    });

    // 4. Energy Efficiency Bonus: reward high damage per energy
    const candidateMaxDPE = getMaxDPE(candidate);
    if (candidateMaxDPE > 0) {
        // Scale modestly so it doesn't dominate role/energy logic
        score += Math.round(candidateMaxDPE * 0.5);
    }

    return score;
};

// Helper: damage per energy for a single skill
function damagePerEnergy(skill) {
    let dmg = 0;

    // 1. Try to get damage from skill.damage property
    if (typeof skill.damage === 'number' && skill.damage > 0) {
        dmg = skill.damage;
    } else if (skill.description) {
        // 2. If not found, try to extract from description
        const desc = skill.description.toLowerCase();
        // Regex to find numbers followed by "damage" or "dmg"
        const match = desc.match(/(\d+)\s*(?:damage|dmg)/);
        if (match && match[1]) {
            dmg = parseInt(match[1], 10);
        }
    }

    const energyCount = (skill.energy && Array.isArray(skill.energy))
        ? skill.energy.filter(e => e !== 'none' && e !== 'black').length
        : 0;
    return energyCount > 0 ? dmg / energyCount : 0;
}

// Helper: maximum DPE across all skills of a character
function getMaxDPE(char) {
    if (!char.skills) return 0;
    let max = 0;
    char.skills.forEach(skill => {
        const dpe = damagePerEnergy(skill);
        if (dpe > max) max = dpe;
    });
    return max;
}

// Get top N suggestions for the current team
export const getSuggestions = (allCharacters, currentTeam, count = 5) => {
    if (currentTeam.length === 3) return []; // Team full

    // Filter out characters already in the team
    const candidates = allCharacters.filter(c => !currentTeam.find(m => m.id === c.id));

    // Score each candidate (synergyScore already includes DPE bonus)
    const scoredCandidates = candidates.map(char => ({
        ...char,
        synergyScore: calculateSynergy(currentTeam, char)
    }));

    // Sort by score descending and return top N
    return scoredCandidates.sort((a, b) => b.synergyScore - a.synergyScore).slice(0, count);
};

// Analyze a complete team to identify strengths, weaknesses, and strategies
export const analyzeTeam = (team) => {
    if (!team || team.length === 0) {
        return { ...DEFAULT_ANALYSIS }
    }

    const roles = { tank: 0, support: 0, control: 0, dps: 0 }
    const energyDistribution = { green: 0, red: 0, blue: 0, white: 0, black: 0 }
    const dpeValues = []
    const sustain = { healingTools: 0, mitigationTools: 0, cleanseTools: 0 }

    // Analyze each team member
    team.forEach(member => {
        const memberRoles = analyzeCharacter(member)
        Object.keys(memberRoles).forEach(r => roles[r] += memberRoles[r])

        if (member.skills) {
            member.skills.forEach(skill => {
                if (skill.energy) {
                    skill.energy.forEach(e => {
                        if (energyDistribution[e] !== undefined) energyDistribution[e]++
                    })
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

    const maxDPE = dpeValues.length > 0 ? Math.max(...dpeValues) : 0
    const avgDPE = dpeValues.length > 0 ? dpeValues.reduce((a, b) => a + b, 0) / dpeValues.length : 0

    const strengths = []
    const weaknesses = []
    const strategies = []

    // Analyze strengths
    if (avgDPE > 30) strengths.push('High damage output - can eliminate enemies quickly')
    if (roles.control >= 3) strengths.push('Excellent crowd control - can disrupt enemy strategies')
    if (roles.support >= 2 || sustain.healingTools >= 2) strengths.push('Strong defensive toolkit - good survivability')

    const energyColors = Object.values(energyDistribution).filter(v => v > 0).length
    if (energyColors >= 3) strengths.push('Flexible energy options - less vulnerable to energy drought')

    const lowEnergyCost = dpeValues.filter(dpe => dpe >= 20).length
    if (lowEnergyCost >= 3) strengths.push('Energy efficient - can apply pressure early')
    if (sustain.cleanseTools >= 1) strengths.push('Can cleanse debuffs to keep tempo')

    // Analyze weaknesses
    if (avgDPE < 15) weaknesses.push('Weak damage output - may struggle to finish enemies')
    if (roles.control < 1) weaknesses.push('Limited crowd control - vulnerable to enemy combos')
    if (roles.support < 1 && sustain.healingTools === 0) weaknesses.push('Low survivability - risky against aggressive teams')

    const totalEnergySkills = Math.max(1, Object.values(energyDistribution).reduce((a, b) => a + b, 0))
    const maxEnergyColor = Math.max(...Object.values(energyDistribution))
    if (totalEnergySkills > 0 && maxEnergyColor / totalEnergySkills > 0.6) {
        const dominantColor = Object.keys(energyDistribution).find(k => energyDistribution[k] === maxEnergyColor)
        weaknesses.push(`Energy bottleneck risk - heavily dependent on ${dominantColor} energy`)
    }

    // Generate strategies
    if (avgDPE > 25 && roles.support < 2) {
        strategies.push('Aggressive playstyle - delete high-priority targets quickly before they can respond')
    }
    if (roles.control >= 2 && (roles.support >= 1 || sustain.mitigationTools > 0)) {
        strategies.push('Defensive playstyle - use control to slow fights while sustaining your front line')
    }
    if (roles.tank >= 1 && roles.dps >= 2 && roles.control >= 1) {
        strategies.push('Balanced playstyle - pivot between peel and burst depending on matchups')
    }
    if (lowEnergyCost >= 3) {
        strategies.push('Early pressure - spam low-cost skills in early turns to build momentum')
    }
    if (maxDPE > 40) {
        strategies.push('Save energy for finishers - use high-damage skills when enemies are weakened')
    }
    if (roles.control >= 3) {
        strategies.push('Chain stuns - coordinate crowd control to keep dangerous enemies locked down')
    }

    // Default strategy if none matched
    if (strategies.length === 0) {
        strategies.push('Standard playstyle - balance offense and defense based on team composition')
    }

    const tempo = estimateTempo(team, maxDPE)

    const synergyHighlights = []
    const roleCoverage = ['tank', 'support', 'control', 'dps'].filter(role => roles[role] > 0).length

    if (roleCoverage >= 3) synergyHighlights.push('Diverse role coverage supports adaptable strategies')
    if (energyColors >= 3) synergyHighlights.push('Multi-color energy spread reduces dependency on draws')
    if (tempo.estimatedKillTurns && tempo.estimatedKillTurns <= 2) synergyHighlights.push('Explosive burst potential - can secure early eliminations')
    if (sustain.healingTools > 0 && sustain.mitigationTools > 0) synergyHighlights.push('Layered sustain lets carries stay active longer')
    if (roles.control >= 2 && tempo.pressureRating > 50) synergyHighlights.push('Crowd control sets up kill turns reliably')

    const synergyScore = clamp(
        Math.round(
            roleCoverage * 15 +
            energyColors * 8 +
            (tempo.pressureRating * 0.35) +
            (sustain.healingTools + sustain.mitigationTools) * 5
        ),
        0,
        100
    )

    return {
        roles,
        energyDistribution,
        maxDPE,
        avgDPE,
        strengths,
        weaknesses,
        strategies,
        synergyHighlights,
        tempo,
        sustain,
        synergyScore
    }
}
