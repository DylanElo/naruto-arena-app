import React from 'react';
import { ENERGY_BG_COLORS } from '../../utils/colors';

const Header = ({ activeTab, setActiveTab, fullTeamAnalysis, teamEnergyMix, ownedProgress, ownedCharacters, charactersData, selectedTeam }) => {
    return (
        <header className="relative z-10 px-4 md:px-10 pt-8 pb-6 border-b border-dark-tertiary bg-dark-secondary backdrop-blur-xl shadow-lg">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-dark-primary shadow-lg border border-dark-tertiary">
                            <span className="text-xs tracking-[0.35em] text-brand-primary uppercase">Naruto Arena</span>
                            <span className="text-[11px] text-light-secondary">Squad Architect</span>
                        </div>
                        <h1 className="mt-4 text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-secondary to-light-primary drop-shadow-lg">
                            Shinobi Theorycrafting Hub
                        </h1>
                        <p className="text-light-secondary mt-4 max-w-3xl text-sm md:text-base leading-relaxed">
                            A modern, sleek cockpit for the Naruto-Arena meta. Draft, analyze, and archive squads with a new dark theme and vibrant accents.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                        <div className="bg-dark-primary border border-dark-tertiary rounded-2xl px-4 py-3 min-w-[160px] shadow-lg">
                            <div className="text-xs uppercase text-brand-primary">Synergy Health</div>
                            <div className="text-3xl font-extrabold text-brand-secondary">{fullTeamAnalysis.synergyScore}%</div>
                            <div className="text-[10px] text-light-secondary/70">Live across slots</div>
                        </div>
                        <div className="bg-dark-primary border border-dark-tertiary rounded-2xl px-4 py-3 min-w-[160px] shadow-lg">
                            <div className="text-xs uppercase text-brand-primary">Energy Focus</div>
                            <div className="flex items-center gap-2 text-sm text-light-primary font-semibold">
                                <span className={`px-2 py-1 rounded-full border ${teamEnergyMix.dominant ? ENERGY_BG_COLORS[teamEnergyMix.dominant] : 'bg-dark-tertiary border-dark-tertiary text-light-secondary'}`}>
                                    {teamEnergyMix.dominant ? teamEnergyMix.dominant.toUpperCase() : 'Balanced'}
                                </span>
                                <span className="text-brand-secondary text-xs">{teamEnergyMix.spread}% concentration</span>
                            </div>
                            <div className="text-[10px] text-light-secondary/70">{selectedTeam.length === 0 ? 'Add ninjas to see the mix' : 'Higher % means riskier economy'}</div>
                        </div>
                        <div className="bg-dark-primary border border-dark-tertiary rounded-2xl px-4 py-3 min-w-[160px] shadow-lg">
                            <div className="text-xs uppercase text-brand-primary">Collection</div>
                            <div className="text-3xl font-extrabold text-brand-secondary">{ownedProgress}%</div>
                            <div className="text-[10px] text-brand-primary/70">{ownedCharacters.size} owned / {charactersData.length}</div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 bg-dark-primary p-2 rounded-2xl border border-dark-tertiary backdrop-blur">
                    <button onClick={() => setActiveTab('builder')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-semibold transition-all ${activeTab === 'builder' ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-dark-primary shadow-lg' : 'text-light-secondary hover:bg-dark-tertiary'}`}>
                        🛠️ Builder
                    </button>
                    <button onClick={() => setActiveTab('collection')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-semibold transition-all ${activeTab === 'collection' ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-dark-primary shadow-lg' : 'text-light-secondary hover:bg-dark-tertiary'}`}>
                        📚 Collection
                    </button>
                    <button onClick={() => setActiveTab('counter')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-semibold transition-all ${activeTab === 'counter' ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-dark-primary shadow-lg' : 'text-light-secondary hover:bg-dark-tertiary'}`}>
                        🎯 Counter Lab
                    </button>
                    <button onClick={() => setActiveTab('meta')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-semibold transition-all ${activeTab === 'meta' ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-dark-primary shadow-lg' : 'text-light-secondary hover:bg-dark-tertiary'}`}>
                        🛰️ Meta Decks
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
