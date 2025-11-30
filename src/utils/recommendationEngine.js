
// Keywords to identify roles based on skill descriptions
const ROLE_KEYWORDS = {
    tank: ['damage reduction', 'destructible defense', 'invulnerable', 'counter', 'reflect'],
    support: ['heal', 'remove harmful effects', 'energy', 'invulnerable to', 'defense'],
    control: ['stun', 'unable to reduce damage', 'remove energy', 'cooldowns increased', 'unable to be used'],
    dps: ['damage', 'piercing', 'affliction', 'critical', 'additional damage']
};

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
    if (!team || team.length < 3) {
        return {
            roles: { tank: 0, support: 0, control: 0, dps: 0 },
            energyDistribution: { green: 0, red: 0, blue: 0, white: 0, black: 0 },
            maxDPE: 0,
            avgDPE: 0,
            strengths: [],
            weaknesses: [],
            strategies: []
        };
    }

    const roles = { tank: 0, support: 0, control: 0, dps: 0 };
    const energyDistribution = { green: 0, red: 0, blue: 0, white: 0, black: 0 };
    const dpeValues = [];

    // Analyze each team member
    team.forEach(member => {
        const memberRoles = analyzeCharacter(member);
        Object.keys(memberRoles).forEach(r => roles[r] += memberRoles[r]);

        if (member.skills) {
            member.skills.forEach(skill => {
                if (skill.energy) {
                    skill.energy.forEach(e => {
                        if (energyDistribution[e] !== undefined) energyDistribution[e]++;
                    });
                }
                const dpe = damagePerEnergy(skill);
                if (dpe > 0) dpeValues.push(dpe);
            });
        }
    });

    const maxDPE = dpeValues.length > 0 ? Math.max(...dpeValues) : 0;
    const avgDPE = dpeValues.length > 0 ? dpeValues.reduce((a, b) => a + b, 0) / dpeValues.length : 0;

    const strengths = [];
    const weaknesses = [];
    const strategies = [];

    // Analyze strengths
    if (avgDPE > 30) strengths.push("High damage output - can eliminate enemies quickly");
    if (roles.control >= 3) strengths.push("Excellent crowd control - can disrupt enemy strategies");
    if (roles.support >= 2) strengths.push("Strong defensive capabilities - good survivability");

    const energyColors = Object.values(energyDistribution).filter(v => v > 0).length;
    if (energyColors >= 3) strengths.push("Flexible energy options - less vulnerable to energy drought");

    const lowEnergyCost = dpeValues.filter(dpe => dpe >= 20).length;
    if (lowEnergyCost >= 3) strengths.push("Energy efficient - can apply pressure early");

    // Analyze weaknesses
    if (avgDPE < 15) weaknesses.push("Weak damage output - may struggle to finish enemies");
    if (roles.control < 1) weaknesses.push("No crowd control - vulnerable to enemy combos");
    if (roles.support < 1) weaknesses.push("Limited survivability - risky against aggressive teams");

    const totalEnergySkills = Object.values(energyDistribution).reduce((a, b) => a + b, 0);
    const maxEnergyColor = Math.max(...Object.values(energyDistribution));
    if (maxEnergyColor / totalEnergySkills > 0.6) {
        const dominantColor = Object.keys(energyDistribution).find(k => energyDistribution[k] === maxEnergyColor);
        weaknesses.push(`Energy bottleneck risk - heavily dependent on ${dominantColor} energy`);
    }

    // Generate strategies
    if (avgDPE > 25 && roles.support < 2) {
        strategies.push("Aggressive playstyle - focus on eliminating high-priority targets quickly before they can respond");
    }
    if (roles.control >= 2 && roles.support >= 1) {
        strategies.push("Defensive playstyle - use stuns to control the battlefield while sustaining your team");
    }
    if (roles.tank >= 1 && roles.dps >= 2 && roles.control >= 1) {
        strategies.push("Balanced playstyle - adapt to your opponent's strategy and counter accordingly");
    }
    if (lowEnergyCost >= 3) {
        strategies.push("Early pressure - spam low-cost skills in early turns to build momentum");
    }
    if (maxDPE > 40) {
        strategies.push("Save energy for finishers - use high-damage skills when enemies are weakened");
    }
    if (roles.control >= 3) {
        strategies.push("Chain stuns - coordinate crowd control to keep dangerous enemies locked down");
    }

    // Default strategy if none matched
    if (strategies.length === 0) {
        strategies.push("Standard playstyle - balance offense and defense based on team composition");
    }

    return {
        roles,
        energyDistribution,
        maxDPE,
        avgDPE,
        strengths,
        weaknesses,
        strategies
    };
};
