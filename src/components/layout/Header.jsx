import React from 'react';
import { ENERGY_BG_COLORS } from '../../utils/colors';

const Header = ({ activeTab, setActiveTab, fullTeamAnalysis, teamEnergyMix, ownedProgress, ownedCharacters, charactersData, selectedTeam }) => {
    return (
        <header className="relative z-20 px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-dark-tertiary bg-dark-secondary/80 backdrop-blur-xl shadow-lg">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4">
                    <div className="w-full sm:w-auto text-center sm:text-left">
                        <div className="inline-flex items-center gap-3 px-3 py-2 rounded-full bg-dark-primary shadow-md border border-dark-tertiary">
                            <span className="text-[10px] tracking-[0.25em] text-brand-primary uppercase">Naruto Arena</span>
                            <span className="text-[10px] text-light-secondary/80">Squad Architect</span>
                        </div>
                    </div>
                    <div className="w-full sm:w-auto flex flex-wrap justify-center gap-2 text-sm">
                        <StatBox label="Synergy" value={`${fullTeamAnalysis.synergyScore}%`} detail="Team Health" />
                        <StatBox label="Energy" detail={selectedTeam.length === 0 ? 'N/A' : `${teamEnergyMix.spread}% ${teamEnergyMix.dominant || ''}`}>
                            <span className={`px-2 py-1 text-xs rounded-full border ${teamEnergyMix.dominant ? ENERGY_BG_COLORS[teamEnergyMix.dominant] : 'bg-dark-tertiary border-dark-tertiary text-light-secondary'}`}>
                                {teamEnergyMix.dominant ? teamEnergyMix.dominant.toUpperCase() : 'Balanced'}
                            </span>
                        </StatBox>
                        <StatBox label="Collection" value={`${ownedProgress}%`} detail={`${ownedCharacters.size}/${charactersData.length}`} />
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-1 sm:gap-2 bg-dark-primary/80 p-1.5 rounded-2xl border border-dark-tertiary/50 backdrop-blur-sm">
                    <NavButton label="Builder" icon="🛠️" isActive={activeTab === 'builder'} onClick={() => setActiveTab('builder')} />
                    <NavButton label="Collection" icon="📚" isActive={activeTab === 'collection'} onClick={() => setActiveTab('collection')} />
                    <NavButton label="Counter" icon="🎯" isActive={activeTab === 'counter'} onClick={() => setActiveTab('counter')} />
                    <NavButton label="Meta" icon="🛰️" isActive={activeTab === 'meta'} onClick={() => setActiveTab('meta')} />
                </div>
            </div>
        </header>
    );
};

const StatBox = ({ label, value, detail, children }) => (
    <div className="bg-dark-primary/50 border border-dark-tertiary/50 rounded-2xl px-3 py-2 min-w-[120px] text-center sm:text-left shadow-md">
        <div className="text-[10px] uppercase text-brand-primary/80">{label}</div>
        {value && <div className="text-2xl font-bold text-brand-secondary">{value}</div>}
        {children}
        <div className="text-[9px] text-light-secondary/60 mt-0.5">{detail}</div>
    </div>
);

const NavButton = ({ label, icon, isActive, onClick }) => (
    <button onClick={onClick} className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold transition-all text-xs sm:text-sm flex items-center justify-center gap-2 ${isActive ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-dark-primary shadow-md' : 'text-light-secondary hover:bg-dark-tertiary/50'}`}>
        <span className="hidden sm:inline">{icon}</span>
        <span>{label}</span>
    </button>
);

export default Header;
