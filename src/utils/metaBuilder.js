import { analyzeTeam } from './recommendationEngine.js';

/**
 * Generate top meta teams from character pool
 * Uses heuristics to avoid brute-force (N choose 3)
 */
export const generateMetaTeams = (allCharacters, ownedCharacterIds = [], filters = {}) => {
    // Filter to owned characters only
    const availableChars = ownedCharacterIds.length > 0
        ? allCharacters.filter(c => ownedCharacterIds.includes(c.id))
        : allCharacters;

    if (availableChars.length < 3) {
        return []; // Not enough characters
    }

    // PRE-FILTER: Score individual characters and take top 50
    const scoredChars = availableChars.map(c => ({
        ...c,
        individualScore: scoreCharacter(c)
    }))
        .sort((a, b) => b.individualScore - a.individualScore)
        .slice(0, Math.min(50, availableChars.length)); // Top 50 or all if less

    // GENERATE COMBINATIONS (50 choose 3 = ~20,000 max)
    const teams = [];

    for (let i = 0; i < scoredChars.length - 2; i++) {
        for (let j = i + 1; j < scoredChars.length - 1; j++) {
            for (let k = j + 1; k < scoredChars.length; k++) {
                const team = [scoredChars[i], scoredChars[j], scoredChars[k]];

                // Quick filter: must have role balance
                if (!hasRoleBalance(team)) continue;

                // Analyze team
                const analysis = analyzeTeam(team);

                // Apply filters
                if (filters.maxAvgCost && analysis.avgCost > filters.maxAvgCost) continue;
                if (filters.minFlexibility && analysis.energyFlexibility < filters.minFlexibility) continue;

                // Calculate meta score
                const metaScore = calculateMetaScore(analysis);

                teams.push({
                    team,
                    metaScore,
                    analysis
                });
            }
        }
    }

    // Sort by meta score descending
    return teams
        .sort((a, b) => b.metaScore - a.metaScore)
        .slice(0, 10); // Top 10
};

/**
 * Score individual character (for pre-filtering)
 */
const scoreCharacter = (char) => {
    if (!char.skills) return 0;

    let score = 0;

    // Count total skills
    score += char.skills.length * 5;

    // Favor low-cost skills
    char.skills.forEach(skill => {
        if (!skill.energy) return;
        const cost = skill.energy.filter(e => e !== 'none').length;
        if (cost <= 1) score += 10;
        if (cost > 3) score -= 5;
    });

    // Favor damage dealers
    char.skills.forEach(skill => {
        const desc = skill.description || '';
        if (desc.includes('damage')) score += 8;
        if (desc.includes('stun')) score += 10;
        if (desc.includes('immunity') || desc.includes('invulnerable')) score += 12;
    });

    return score;
};

/**
 * Check if team has role balance (at least 1 control, 1 tank/support)
 */
const hasRoleBalance = (team) => {
    let hasControl = false;
    let hasTankOrSupport = false;

    team.forEach(char => {
        if (!char.skills) return;

        char.skills.forEach(skill => {
            const desc = (skill.description || '').toLowerCase();
            const classes = Array.isArray(skill.classes)
                ? skill.classes.join(' ').toLowerCase()
                : (skill.classes || '').toLowerCase();

            // Control indicators
            if (desc.includes('stun') || classes.includes('control') || classes.includes('mental')) {
                hasControl = true;
            }

            // Tank/Support indicators
            if (desc.includes('invulnerable') || desc.includes('reduce damage') ||
                desc.includes('heal') || classes.includes('strategic')) {
                hasTankOrSupport = true;
            }
        });
    });

    return hasControl && hasTankOrSupport;
};

/**
 * Calculate meta score from team analysis
 */
const calculateMetaScore = (analysis) => {
    // Weighted formula
    const synergyWeight = 0.5;
    const flexibilityWeight = 0.2;
    const balanceWeight = 0.15;
    const diversityWeight = 0.15;

    // Synergy score (0-100)
    const synergyScore = analysis.synergyScore || 0;

    // Energy flexibility (0-100)
    // Calculated from avgCost and colorSpread
    const avgCost = analysis.avgCost || 2;
    const flexibility = avgCost <= 1.5 ? 100 : avgCost > 3 ? 30 : 70;

    // Role balance (0-100)
    const roles = analysis.roles || { tank: 0, support: 0, control: 0, dps: 0 };
    const hasControl = roles.control >= 1;
    const hasTankOrSupport = (roles.tank + roles.support) >= 1;
    const balance = (hasControl && hasTankOrSupport) ? 100 : 50;

    // Mechanic diversity (0-100)
    const mechanics = analysis.mechanics || {};
    const uniqueMechanics = Object.values(mechanics).filter(v => v > 0).length;
    const diversity = (uniqueMechanics / 17) * 100; // 17 total mechanics

    // Calculate weighted score
    const metaScore =
        (synergyScore * synergyWeight) +
        (flexibility * flexibilityWeight) +
        (balance * balanceWeight) +
        (diversity * diversityWeight);

    return Math.round(metaScore);
};

/**
 * Get playstyle description for a team
 */
export const getPlaystyleDescription = (analysis) => {
    const { mechanics, roles, tempo } = analysis;

    // Determine playstyle based on team composition
    if (mechanics.stun >= 4 && roles.control >= 2) {
        return 'Control Lock: Disable enemies and dictate pace';
    }

    if (mechanics.setup > 0 && mechanics.immunity > 0) {
        return 'Setup Archetype: Safe buffing into explosive payoff';
    }

    if (tempo && tempo.estimatedKillTurns <= 3) {
        return 'Aggressive Rush: Fast burst damage for quick wins';
    }

    if (mechanics.punisher > 0 && roles.control >= 1) {
        return 'Trap & Punish: Force enemies into bad choices';
    }

    if (roles.dps >= 2 && tempo && tempo.pressureRating >= 80) {
        return 'High Pressure DPS: Constant damage output';
    }

    if ((roles.tank + roles.support) >= 2) {
        return 'Sustain & Survive: Outlast enemies with defense';
    }

    return 'Balanced Composition: Flexible strategy';
};
