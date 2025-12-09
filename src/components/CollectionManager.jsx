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

    if (showSetup) {
        return (
            <div className="bg-dark-secondary rounded-3xl border border-dark-tertiary p-8 shadow-2xl max-w-lg mx-auto backdrop-blur-xl relative overflow-hidden">
                <h2 className="text-3xl font-black text-brand-primary mb-3 tracking-tight">🎮 Collection Setup</h2>
                <p className="text-light-secondary mb-6 leading-relaxed">Tell us your Naruto-Arena level and we'll auto-mark everything you've unlocked so your builder starts warm.</p>
                <input
                    type="number"
                    min="1"
                    max="40"
                    value={userLevel}
                    onChange={(e) => setUserLevel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLevelSetup()}
                    placeholder="Enter level (1-40)"
                    className="w-full p-3 bg-dark-primary border border-dark-tertiary rounded-xl text-light-primary mb-4 focus:border-brand-primary focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                />
                <div className="flex gap-2">
                    <button onClick={handleLevelSetup} className="flex-1 bg-gradient-to-r from-brand-primary to-brand-secondary hover:shadow-lg text-dark-primary py-3 rounded-xl font-semibold transition-all">
                        Auto-import characters
                    </button>
                    <button onClick={() => setShowSetup(false)} className="flex-1 bg-dark-secondary border border-dark-tertiary hover:border-rose-500 hover:text-rose-500 text-light-secondary py-3 rounded-xl font-semibold transition-all">
                        Skip (Manual)
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-dark-secondary rounded-3xl border border-dark-tertiary p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-brand-primary">Collection vault</p>
                        <h2 className="text-3xl font-black text-light-primary">📚 My Character Collection</h2>
                        <p className="text-light-secondary text-sm mt-1">Tap any card to toggle ownership. The grid lights up when you own it.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-dark-primary border border-dark-tertiary rounded-2xl px-4 py-3 shadow-inner">
                        <div className="text-xs uppercase text-brand-primary">Owned</div>
                        <div className="text-3xl font-black text-brand-secondary">{stats.owned}</div>
                        <div className="text-sm text-light-secondary">/ {stats.total} ({stats.percentage}%)</div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 mb-4">
                    <div className="flex flex-wrap gap-3">
                        <div className="flex-1 min-w-[220px] relative">
                            <input
                                type="text"
                                placeholder="Search characters or titles..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full p-3 bg-dark-primary border border-dark-tertiary rounded-xl text-light-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-secondary focus:outline-none"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-light-secondary text-sm">⌕</span>
                        </div>
                        <button
                            onClick={() => setShowSetup(true)}
                            className="bg-gradient-to-r from-brand-primary to-brand-secondary text-dark-primary px-5 py-3 rounded-xl font-semibold shadow-lg hover:scale-[1.01] transition-all"
                        >
                            Reset by level
                        </button>
                    </div>

                    {/* MECHANIC FILTERS */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        <FilterButton label="All" filterKey="ALL" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                        <FilterButton label="⚡ Stun" filterKey="STUN" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                        <FilterButton label="💥 AoE" filterKey="AOE" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                        <FilterButton label="💚 Heal" filterKey="HEAL" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                        <FilterButton label="🗡️ Pierce" filterKey="PIERCING" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                        <FilterButton label="☠️ DoT" filterKey="AFFLICTION" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                        <FilterButton label="🛡️ Defense" filterKey="DEFENSE" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                        <FilterButton label="🔋 Energy" filterKey="ENERGY" activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredChars.map(char => {
                    const owned = ownedIds.includes(char.id)
                    return (
                        <div
                            key={char.id}
                            className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all group ${owned
                                ? 'border-2 border-brand-secondary bg-dark-tertiary shadow-lg'
                                : 'border border-dark-tertiary bg-dark-secondary shadow-sm hover:shadow-md'
                                }`}
                            onClick={() => handleToggle(char.id)}
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-dark-primary/40 via-transparent to-dark-primary/80 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <img
                                src={assetPath(`images/characters/${char.id}.png`)}
                                alt={char.name}
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=?' }}
                                className="w-full h-32 object-cover"
                            />
                            <div className="p-3 bg-dark-secondary/90 backdrop-blur flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-light-primary font-bold truncate">{char.name}</div>
                                    <div className="text-[11px] uppercase tracking-wide text-light-secondary">#{char.id}</div>
                                </div>
                                <div className={`text-[10px] px-2 py-1 rounded-full border ${owned ? 'bg-brand-primary border-brand-secondary text-dark-primary' : 'bg-dark-tertiary border-dark-tertiary text-light-secondary'}`}>
                                    {owned ? 'Owned' : 'Locked'}
                                </div>
                            </div>
                            {owned && (
                                <div className="absolute top-2 right-2 bg-brand-primary text-dark-primary rounded-full w-7 h-7 flex items-center justify-center font-bold shadow-lg">
                                    ✓
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// This component is defined outside of CollectionManager to prevent re-creation on every render.
// It receives activeFilter and setActiveFilter as props to manage state.
const FilterButton = ({ label, filterKey, activeFilter, setActiveFilter }) => (
    <button
        onClick={() => setActiveFilter(filterKey)}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${activeFilter === filterKey
                ? `bg-brand-primary border-brand-secondary text-dark-primary shadow-md`
                : 'bg-dark-secondary border-dark-tertiary text-light-secondary hover:bg-dark-tertiary'
            }`}
    >
        {label}
    </button>
);

export default CollectionManager
