import { useState, useEffect } from 'react';
import { generateMetaTeams, getPlaystyleDescription } from '../utils/metaBuilder';
import { loadCollection } from '../utils/collectionManager';
import { assetPath } from '../utils/assetPath';

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
        <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <div className="relative z-10">
                    <h2 className="text-3xl font-bold text-white mb-2 glow-text">📊 Meta Architect</h2>
                    <p className="text-slate-400 mb-8 max-w-2xl">Leverage AI analysis to discover optimal team compositions from your existing collection, sorted by synergy and estimated win rate.</p>

                    {/* Filters */}
                    <div className="flex flex-wrap items-end gap-6 mb-8">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs uppercase font-bold text-slate-500 tracking-wider">Max Average Cost</label>
                            <input
                                type="number"
                                min="1"
                                max="5"
                                step="0.5"
                                value={filters.maxAvgCost}
                                onChange={(e) => setFilters({ ...filters, maxAvgCost: parseFloat(e.target.value) })}
                                className="w-24 p-3 bg-[rgba(0,0,0,0.3)] border border-[var(--border-subtle)] rounded-xl text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all text-center font-mono font-bold"
                            />
                        </div>
                        <button
                            onClick={generateTeams}
                            disabled={loading || ownedIds.length < 3}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 hover:scale-[1.02]"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Analyzing...
                                </span>
                            ) : 'Generate Meta Teams'}
                        </button>
                    </div>

                    {ownedIds.length < 3 && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-3 text-orange-200 shadow-md">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <span className="font-bold block">Collection Required</span>
                                <span className="text-sm opacity-80">You need to set up your collection first via the Collection tab.</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Meta Teams List */}
            {metaTeams.length > 0 && (
                <div className="space-y-6">
                    {metaTeams.map((teamData, idx) => {
                        const { team, metaScore, analysis } = teamData;
                        const playstyle = getPlaystyleDescription(analysis);

                        return (
                            <div key={idx} className="glass-panel p-6 border-l-4 border-l-purple-500 hover:border-l-purple-400 transition-all hover:translate-x-1 group">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Rank #{idx + 1}</span>
                                            <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                                                {playstyle} Squad
                                            </h3>
                                        </div>
                                        <p className="text-sm text-slate-400 max-w-xl">{analysis.summary || "Balanced team composition with standard synergy loops."}</p>
                                    </div>
                                    <div className="flex items-center gap-4 bg-black/20 p-2 rounded-xl border border-white/5">
                                        <div className="text-right px-2">
                                            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]">{metaScore}</div>
                                            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Meta Score</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Team Members */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    {team.map(char => (
                                        <div key={char.id} className="relative h-24 rounded-lg overflow-hidden border border-white/10 group/card">
                                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10"></div>
                                            <img
                                                src={assetPath(`images/characters/${char.id}.png`)}
                                                alt={char.name}
                                                onError={(e) => e.target.src = 'https://via.placeholder.com/80?text=Ninja'}
                                                className="absolute inset-0 w-full h-full object-cover object-top opacity-60 group-hover/card:opacity-100 group-hover/card:scale-110 transition-all duration-500"
                                            />
                                            <div className="relative z-20 h-full p-3 flex items-center">
                                                <div className="font-bold text-lg text-white text-shadow-md">{char.name}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                                        <div className="text-slate-500 text-xs uppercase font-bold">Synergy</div>
                                        <div className="font-mono text-lg text-cyan-400 font-bold">{analysis.synergyScore}%</div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                                        <div className="text-slate-500 text-xs uppercase font-bold">Avg TTK</div>
                                        <div className="font-mono text-lg text-rose-400 font-bold">{analysis.tempo?.estimatedKillTurns || '—'} <span className="text-xs text-slate-600">turns</span></div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                                        <div className="text-slate-500 text-xs uppercase font-bold">Pressure</div>
                                        <div className="font-mono text-lg text-orange-400 font-bold">{analysis.tempo?.pressureRating || 0}%</div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                                        <div className="text-slate-500 text-xs uppercase font-bold">Cost</div>
                                        <div className="font-mono text-lg text-emerald-400 font-bold">{analysis.avgCost?.toFixed(1) || '—'}</div>
                                    </div>
                                </div>

                                {/* Strengths */}
                                {analysis.strengths && analysis.strengths.length > 0 && (
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 flex gap-2 items-start">
                                        <span className="text-emerald-500 pt-0.5">✓</span>
                                        <div className="text-sm text-slate-300">
                                            <strong className="text-emerald-400 font-bold mr-2">Key Strengths:</strong>
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
                <div className="text-center py-20 opacity-50">
                    <div className="text-6xl mb-4 grayscale">📊</div>
                    <p className="text-xl font-light text-slate-400">Ready to analyze. Click "Generate Meta Teams" to begin.</p>
                </div>
            )}
        </div>
    );
};

export default MetaBuilder;
