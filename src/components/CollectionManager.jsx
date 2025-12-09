import { useState } from 'react'
import {
    initializeCollectionByLevel,
    getCollectionStats
} from '../utils/collectionManager'
import { assetPath } from '../utils/assetPath'
import { getCharacterKnowledge } from '../utils/knowledgeEngine'

const CollectionManager = ({ allCharacters, ownedIds, onToggle, onBatchUpdate }) => {
    const [userLevel, setUserLevel] = useState('')
    const [showSetup, setShowSetup] = useState(ownedIds.length === 0)
    const [search, setSearch] = useState('')
    const [activeFilter, setActiveFilter] = useState('ALL')
    const stats = getCollectionStats(allCharacters, ownedIds)

    const handleLevelSetup = () => {
        const level = parseInt(userLevel)
        if (level >= 1 && level <= 40) {
            const ids = initializeCollectionByLevel(level, allCharacters)
            onBatchUpdate(ids)
            setShowSetup(false)
        }
    }

    const handleToggle = (charId) => {
        onToggle(charId)
    }

    // Filter logic - combines search + mechanic filter
    const filteredChars = allCharacters.filter(c => {
        // 1. Search text
        if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false

        // 2. Mechanic filter (requires checking knowledge base)
        if (activeFilter !== 'ALL') {
            const knowledge = getCharacterKnowledge(c.id)
            if (!knowledge) return false

            // Using V2 profile if available, falling back to legacy mechanics
            const mech = knowledge.profile?.mechanics || knowledge.mechanics

            switch (activeFilter) {
                case 'STUN': return mech.stun > 0
                case 'AOE': return mech.aoe > 0
                case 'HEAL': return (mech.heal || 0) + (mech.healthSteal || 0) > 0
                case 'PIERCING': return (mech.piercing || 0) > 0
                case 'AFFLICTION': return (mech.affliction || 0) + (mech.dot || 0) > 0
                case 'DEFENSE': return (mech.invulnerable || 0) + (mech.damageReduction || 0) > 0
                case 'ENERGY': return (mech.energyGain || 0) > 0
                default: return true
            }
        }
        return true
    })

    const FilterButton = ({ label, filterKey }) => (
        <button
            onClick={() => setActiveFilter(filterKey)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border ${activeFilter === filterKey
                ? `bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]`
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
        >
            {label}
        </button>
    )

    if (showSetup) {
        return (
            <div className="glass-panel p-8 shadow-2xl max-w-lg mx-auto relative overflow-hidden mt-10">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight glow-text">🎮 Collection Setup</h2>
                <p className="text-slate-400 mb-6 leading-relaxed">Tell us your Naruto-Arena level and we'll auto-mark everything you've unlocked so your builder starts warm.</p>
                <input
                    type="number"
                    min="1"
                    max="40"
                    value={userLevel}
                    onChange={(e) => setUserLevel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLevelSetup()}
                    placeholder="Enter level (1-40)"
                    className="w-full p-4 bg-[rgba(0,0,0,0.4)] border border-[var(--border-subtle)] rounded-xl text-white mb-6 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                />
                <div className="flex gap-3">
                    <button onClick={handleLevelSetup} className="flex-1 btn-primary py-3 rounded-xl font-bold">
                        Auto-import characters
                    </button>
                    <button onClick={() => setShowSetup(false)} className="flex-1 btn-ghost py-3 rounded-xl font-semibold border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/50">
                        Skip (Manual)
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 via-purple-500 to-cyan-500 opacity-50 group-hover:opacity-80 transition-opacity"></div>

                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-cyan-400 mb-1">Collection vault</p>
                        <h2 className="text-3xl font-black text-white glow-text">MY CHARACTER COLLECTION</h2>
                        <p className="text-slate-400 text-sm mt-2 max-w-xl">Tap any card to toggle ownership. The grid lights up and pulses when you own a character.</p>
                    </div>
                    <div className="flex items-center gap-4 bg-[rgba(0,0,0,0.3)] border border-[var(--border-subtle)] rounded-2xl px-6 py-4 backdrop-blur-sm">
                        <div className="text-xs uppercase text-cyan-500/80 font-bold tracking-wider">Owned</div>
                        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">{stats.owned}</div>
                        <div className="text-sm text-slate-500 font-medium">/ {stats.total} <span className="text-xs ml-1 opacity-50">({stats.percentage}%)</span></div>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-3">
                        <div className="flex-1 min-w-[220px] relative group/search">
                            <input
                                type="text"
                                placeholder="Search characters or titles..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full p-3 pl-12 bg-[rgba(0,0,0,0.3)] border border-[var(--border-subtle)] rounded-xl text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-cyan-400 transition-colors">⌕</span>
                        </div>
                        <button
                            onClick={() => setShowSetup(true)}
                            className="bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 px-5 py-3 rounded-xl font-semibold transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] flex items-center gap-2"
                        >
                            <span className="text-lg">↺</span> Reset by level
                        </button>
                    </div>

                    {/* MECHANIC FILTERS */}
                    <div className="flex flex-wrap gap-2 pt-2 pb-1">
                        <FilterButton label="All" filterKey="ALL" />
                        <FilterButton label="⚡ Stun" filterKey="STUN" />
                        <FilterButton label="💥 AoE" filterKey="AOE" />
                        <FilterButton label="💚 Heal" filterKey="HEAL" />
                        <FilterButton label="🗡️ Pierce" filterKey="PIERCING" />
                        <FilterButton label="☠️ DoT" filterKey="AFFLICTION" />
                        <FilterButton label="🛡️ Defense" filterKey="DEFENSE" />
                        <FilterButton label="🔋 Energy" filterKey="ENERGY" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-10">
                {filteredChars.map(char => {
                    const owned = ownedIds.includes(char.id)
                    return (
                        <div
                            key={char.id}
                            className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group ${owned
                                ? 'glass-panel border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] scale-[1.02] z-10'
                                : 'bg-white/5 border border-white/5 opacity-60 hover:opacity-100 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:z-10'
                                }`}
                            onClick={() => handleToggle(char.id)}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 transition-opacity ${owned ? 'opacity-80' : 'opacity-60'}`}></div>

                            {/* Glow effect on hover */}
                            <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity z-20"></div>

                            <img
                                src={assetPath(`images/characters/${char.id}.png`)}
                                alt={char.name}
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=?' }}
                                className={`w-full h-40 object-cover object-top transition-transform duration-500 ${owned ? 'group-hover:scale-110' : 'grayscale group-hover:grayscale-0'}`}
                                loading="lazy"
                            />

                            <div className="absolute bottom-0 left-0 right-0 p-3 z-30 flex items-center justify-between">
                                <div className="min-w-0">
                                    <div className={`text-xs font-bold truncate ${owned ? 'text-white text-shadow-sm' : 'text-slate-400'}`}>{char.name}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">#{char.id}</div>
                                </div>

                                {owned ? (
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500 text-black text-xs font-bold shadow-[0_0_10px_rgba(6,182,212,0.6)]">
                                        ✓
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-slate-600 text-slate-600 text-[10px] group-hover:border-slate-400 group-hover:text-slate-400">
                                        +
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default CollectionManager
