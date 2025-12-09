import React from 'react';
import { ENERGY_BG_COLORS } from '../../utils/colors';

const Header = ({ activeTab, setActiveTab, fullTeamAnalysis, teamEnergyMix, teamEnergyCounts, ownedProgress, ownedCharacters, charactersData, selectedTeam }) => {
    return (
        <header className="relative z-10 px-4 md:px-10 pt-8 pb-6 border-b border-[var(--border-subtle)] bg-[rgba(5,5,5,0.8)] backdrop-blur-xl sticky top-0">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.03)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-slow"></div>
                            <span className="text-[10px] tracking-[0.2em] text-cyan-400/80 uppercase font-mono">Protocol: Arena</span>
                        </div>
                        <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-white glow-text">
                            ANTIGRAVITY <span className="text-cyan-400 font-light opacity-50">BUILDER</span>
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-2 max-w-2xl text-sm leading-relaxed font-light">
                            Advanced combat simulation and team architecture. Design your squad with precision.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm">
                        <div className="glass-panel px-5 py-4 min-w-[140px] flex flex-col justify-between group">
                            <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] group-hover:text-cyan-400 transition-colors">Synergy</div>
                            <div className="text-2xl font-mono font-bold text-white mt-1 group-hover:glow-text transition-all">{fullTeamAnalysis.synergyScore}%</div>
                            <div className="w-full h-1 bg-[var(--border-subtle)] mt-2 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-400" style={{ width: `${fullTeamAnalysis.synergyScore}%` }}></div>
                            </div>
                        </div>

                        <div className="glass-panel px-5 py-4 min-w-[160px] flex flex-col justify-between group">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] group-hover:text-cyan-400 transition-colors">Energy Mix</div>
                            </div>

                            <div className="flex items-end gap-1.5 h-8 mt-1">
                                {['green', 'red', 'blue', 'white'].map(type => {
                                    const count = teamEnergyCounts ? teamEnergyCounts[type] || 0 : 0;
                                    const max = Math.max(1, ...Object.values(teamEnergyCounts || {}));
                                    const height = count > 0 ? Math.max(20, (count / max) * 100) : 10;

                                    const colors = {
                                        green: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
                                        red: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
                                        blue: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]',
                                        white: 'bg-slate-200 shadow-[0_0_8px_rgba(226,232,240,0.5)]'
                                    };

                                    return (
                                        <div key={type} className="flex-1 flex flex-col items-center gap-1 group/bar">
                                            <div
                                                className={`w-full rounded-t-sm transition-all duration-500 ${count > 0 ? colors[type] : 'bg-white/5'}`}
                                                style={{ height: `${height}%` }}
                                            ></div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="text-[9px] text-[var(--text-secondary)] mt-1 flex justify-between px-0.5 opacity-60">
                                <span>G</span><span>R</span><span>B</span><span>W</span>
                            </div>
                        </div>

                        <div className="glass-panel px-5 py-4 min-w-[140px] flex flex-col justify-between group">
                            <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] group-hover:text-cyan-400 transition-colors">Database</div>
                            <div className="text-2xl font-mono font-bold text-white mt-1 group-hover:glow-text transition-all">{ownedProgress}%</div>
                            <div className="text-[10px] text-[var(--text-secondary)] mt-1 opacity-60">{ownedCharacters.size} / {charactersData.length}</div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-2 p-1 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[var(--border-subtle)] w-fit backdrop-blur-md">
                    {[
                        { id: 'builder', label: 'Builder', icon: '⚡' },
                        { id: 'collection', label: 'Archive', icon: '💠' },
                        { id: 'counter', label: 'Counter Lab', icon: '🎯' },
                        { id: 'meta', label: 'Meta Data', icon: '📊' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-[rgba(255,255,255,0.08)] text-white shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] border border-[var(--border-subtle)]'
                                : 'text-[var(--text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
                                }`}
                        >
                            <span className="mr-2 opacity-70">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </header>
    );
};

export default Header;
