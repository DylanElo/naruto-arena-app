import { useState, useEffect } from 'react';
import { generateMetaTeams, getPlaystyleDescription } from '../utils/metaBuilder';
import { loadCollection } from '../utils/collectionManager';

const MetaBuilder = ({ allCharacters }) => {
    const [metaTeams, setMetaTeams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        maxAvgCost: 3,
        minFlexibility: 0
    });

    const ownedIds = loadCollection();

    const generateTeams = () => {
        setLoading(true);
        // Add small delay to show loading state
        setTimeout(() => {
            const teams = generateMetaTeams(allCharacters, ownedIds, filters);
            setMetaTeams(teams);
            setLoading(false);
        }, 500);
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-6">
                <h2 className="text-2xl font-bold text-orange-300 mb-4">📊 Meta Team Generator</h2>
                <p className="text-gray-400 mb-4">Find optimal team compositions from your collection</p>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-300">Max Avg Cost:</label>
                        <input
                            type="number"
                            min="1"
                            max="5"
                            step="0.5"
                            value={filters.maxAvgCost}
                            onChange={(e) => setFilters({ ...filters, maxAvgCost: parseFloat(e.target.value) })}
                            className="w-20 p-1 bg-gray-900 border border-gray-600 rounded text-white focus:border-orange-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={generateTeams}
                        disabled={loading || ownedIds.length < 3}
                        className="bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2 rounded font-bold transition-colors"
                    >
                        {loading ? 'Generating...' : 'Generate Meta Teams'}
                    </button>
                </div>

                {ownedIds.length < 3 && (
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 text-yellow-300 text-sm">
                        ⚠️ You need to set up your collection first (Collection tab)
                    </div>
                )}
            </div>

            {/* Meta Teams List */}
            {metaTeams.length > 0 && (
                <div className="space-y-4">
                    {metaTeams.map((teamData, idx) => {
                        const { team, metaScore, analysis } = teamData;
                        const playstyle = getPlaystyleDescription(analysis);

                        return (
                            <div key={idx} className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-orange-300">
                                            #{idx + 1} Team
                                        </h3>
                                        <p className="text-sm text-gray-400 italic">{playstyle}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-green-400">{metaScore}</div>
                                        <div className="text-xs text-gray-500">Meta Score</div>
                                    </div>
                                </div>

                                {/* Team Members */}
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {team.map(char => (
                                        <div key={char.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                                            <div className="flex items-center">
                                                <img
                                                    src={`/naruto-arena-app/images/characters/${char.id}.png`}
                                                    alt={char.name}
                                                    onError={(e) => e.target.src = 'https://via.placeholder.com/80?text=Ninja'}
                                                    className="w-20 h-20 object-cover"
                                                />
                                                <div className="p-2 flex-1 min-w-0">
                                                    <div className="font-bold text-sm text-white truncate">{char.name}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div className="bg-gray-800/50 p-2 rounded">
                                        <div className="text-gray-400">Synergy</div>
                                        <div className="font-bold text-white">{analysis.synergyScore}%</div>
                                    </div>
                                    <div className="bg-gray-800/50 p-2 rounded">
                                        <div className="text-gray-400">TTK</div>
                                        <div className="font-bold text-white">{analysis.tempo?.estimatedKillTurns || '—'}</div>
                                    </div>
                                    <div className="bg-gray-800/50 p-2 rounded">
                                        <div className="text-gray-400">Pressure</div>
                                        <div className="font-bold text-white">{analysis.tempo?.pressureRating || 0}%</div>
                                    </div>
                                    <div className="bg-gray-800/50 p-2 rounded">
                                        <div className="text-gray-400">Avg Cost</div>
                                        <div className="font-bold text-white">{analysis.avgCost?.toFixed(1) || '—'}</div>
                                    </div>
                                </div>

                                {/* Strengths */}
                                {analysis.strengths && analysis.strengths.length > 0 && (
                                    <div className="mt-3 bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                                        <div className="text-xs text-green-300 font-bold mb-1">Strengths</div>
                                        <div className="text-sm text-gray-300">
                                            {analysis.strengths.slice(0, 3).join(' • ')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {metaTeams.length === 0 && !loading && (
                <div className="text-center text-gray-500 py-12">
                    Click "Generate Meta Teams" to find optimal compositions
                </div>
            )}
        </div>
    );
};

export default MetaBuilder;
