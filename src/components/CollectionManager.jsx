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

    const FilterButton = ({ label, filterKey, color }) => (
        <button
            onClick={() => setActiveFilter(filterKey)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${activeFilter === filterKey
                    ? `bg-${color}-500 border-${color}-400 text-white shadow-md`
                    : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
        >
            {label}
        </button>
    )

    if (showSetup) {
        return (
            <div className="bg-white/80 rounded-3xl border border-white/60 p-8 shadow-2xl shadow-sky-100/80 max-w-lg mx-auto backdrop-blur-xl relative overflow-hidden">
                <div className="absolute inset-x-6 top-0 h-24 bg-gradient-to-r from-sky-100 via-white to-pink-50 blur-3xl pointer-events-none"></div>
                <h2 className="text-3xl font-black text-sky-700 mb-3 tracking-tight">🎮 Collection Setup</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">Tell us your Naruto-Arena level and we'll auto-mark everything you've unlocked so your builder starts warm.</p>
                <input
                    type="number"
                    min="1"
                    max="40"
                    value={userLevel}
                    onChange={(e) => setUserLevel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLevelSetup()}
                    placeholder="Enter level (1-40)"
                    className="w-full p-3 bg-white/80 border border-slate-200 rounded-xl text-slate-900 mb-4 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-none"
                />
                <div className="flex gap-2">
                    <button onClick={handleLevelSetup} className="flex-1 bg-gradient-to-r from-sky-500 to-blue-500 hover:shadow-lg hover:shadow-sky-200/80 text-white py-3 rounded-xl font-semibold transition-all">
                        Auto-import characters
                    </button>
                    <button onClick={() => setShowSetup(false)} className="flex-1 bg-white/80 border border-slate-200 hover:border-rose-300 hover:text-rose-500 text-slate-700 py-3 rounded-xl font-semibold transition-all">
                        Skip (Manual)
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white/70 rounded-3xl border border-white/70 p-6 shadow-2xl shadow-sky-100/60 backdrop-blur-xl">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-sky-500">Collection vault</p>
                        <h2 className="text-3xl font-black text-slate-900">📚 My Character Collection</h2>
                        <p className="text-slate-600 text-sm mt-1">Tap any card to toggle ownership. The grid lights up when you own it.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 via-white to-sky-50 border border-emerald-100 rounded-2xl px-4 py-3 shadow-inner shadow-emerald-100/70">
                        <div className="text-xs uppercase text-emerald-600">Owned</div>
                        <div className="text-3xl font-black text-emerald-600">{stats.owned}</div>
                        <div className="text-sm text-slate-500">/ {stats.total} ({stats.percentage}%)</div>
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
                                className="w-full p-3 bg-white/80 border border-slate-200 rounded-xl text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
                        </div>
                        <button
                            onClick={() => setShowSetup(true)}
                            className="bg-gradient-to-r from-sky-500 to-blue-500 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-sky-200/70 hover:scale-[1.01] transition-all"
                        >
                            Reset by level
                        </button>
                    </div>

                    {/* MECHANIC FILTERS */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        <FilterButton label="All" filterKey="ALL" color="slate" />
                        <FilterButton label="⚡ Stun" filterKey="STUN" color="yellow" />
                        <FilterButton label="💥 AoE" filterKey="AOE" color="red" />
                        <FilterButton label="💚 Heal" filterKey="HEAL" color="emerald" />
                        <FilterButton label="🗡️ Pierce" filterKey="PIERCING" color="purple" />
                        <FilterButton label="☠️ DoT" filterKey="AFFLICTION" color="pink" />
                        <FilterButton label="🛡️ Defense" filterKey="DEFENSE" color="blue" />
                        <FilterButton label="🔋 Energy" filterKey="ENERGY" color="cyan" />
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
                                ? 'border-2 border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-sky-50 shadow-lg shadow-emerald-100'
                                : 'border border-slate-200 bg-white shadow-sm hover:shadow-md'
                                }`}
                            onClick={() => handleToggle(char.id)}
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/80 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <img
                                src={assetPath(`images/characters/${char.id}.png`)}
                                alt={char.name}
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=?' }}
                                className="w-full h-32 object-cover"
                            />
                            <div className="p-3 bg-white/90 backdrop-blur flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-slate-900 font-bold truncate">{char.name}</div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-400">#{char.id}</div>
                                </div>
                                <div className={`text-[10px] px-2 py-1 rounded-full border ${owned ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                    {owned ? 'Owned' : 'Locked'}
                                </div>
                            </div>
                            {owned && (
                                <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold shadow-lg shadow-emerald-200">
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

export default CollectionManager
