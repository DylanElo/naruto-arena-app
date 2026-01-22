import { useState, useMemo } from 'react'
import {
    initializeCollectionByLevel,
    getCollectionStats
} from '../utils/collectionManager'
import { getCharacterKnowledge } from '../utils/knowledgeEngine'
import CollectionCard from './CollectionCard'

const CollectionManager = ({ allCharacters, ownedIds, onToggle, onBatchUpdate }) => {
    const [userLevel, setUserLevel] = useState('')
    const [showSetup, setShowSetup] = useState((ownedIds.size ?? ownedIds.length) === 0)
    const [search, setSearch] = useState('')
    const [activeFilter, setActiveFilter] = useState('ALL')

    // Bolt Optimization: Memoize stats to avoid recalc on unrelated renders
    const stats = useMemo(() => getCollectionStats(allCharacters, ownedIds), [allCharacters, ownedIds])

    const handleLevelSetup = () => {
        const level = parseInt(userLevel)
        if (level >= 1 && level <= 40) {
            const ids = initializeCollectionByLevel(level, allCharacters)
            onBatchUpdate(ids)
            setShowSetup(false)
        }
    }

    // Bolt Optimization: Memoize filtering to prevent O(N) lookup on every render (e.g. when toggling cards)
    const filteredChars = useMemo(() => {
        const q = search ? search.toLowerCase() : null
        return allCharacters.filter(c => {
            // 1. Search text
            if (q && !c.name.toLowerCase().includes(q)) return false

            // 2. Mechanic filter (requires checking knowledge base)
            if (activeFilter !== 'ALL') {
                const knowledge = getCharacterKnowledge(c.id)
                if (!knowledge) return false

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
    }, [allCharacters, search, activeFilter])

    if (showSetup) {
        return (
            <div className="glass-panel p-8 max-w-lg mx-auto rounded-xl relative overflow-hidden">
                <h2 className="text-2xl font-display font-bold text-chakra-blue mb-2">🎮 Collection Setup</h2>
                <p className="text-gray-400 mb-6 text-sm">Tell us your Naruto-Arena level and we'll auto-mark everything you've unlocked.</p>
                <input
                    type="number"
                    min="1"
                    max="40"
                    value={userLevel}
                    onChange={(e) => setUserLevel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLevelSetup()}
                    placeholder="Enter level (1-40)"
                    aria-label="User level"
                    className="w-full p-3 bg-konoha-900 border border-konoha-700 rounded-lg text-white mb-4 focus:border-chakra-blue outline-none"
                />
                <div className="flex gap-2">
                    <button onClick={handleLevelSetup} className="flex-1 bg-chakra-blue text-black py-3 font-bold uppercase clip-tech hover:bg-white transition-colors">
                        Auto-import
                    </button>
                    <button onClick={() => setShowSetup(false)} className="flex-1 bg-konoha-800 border border-konoha-700 text-gray-400 py-3 font-bold uppercase clip-tech hover:text-white hover:border-white transition-colors">
                        Skip
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="glass-panel p-6 rounded-xl">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-chakra-blue mb-1">Archive Access</p>
                        <h2 className="text-2xl font-display font-bold text-white">Your Arsenal</h2>
                    </div>
                    <div className="flex items-center gap-3 bg-konoha-900 border border-konoha-700 rounded-lg px-4 py-2">
                        <div className="text-[10px] uppercase text-gray-500">Unlocked</div>
                        <div className="text-xl font-display text-chakra-blue">{stats.owned}</div>
                        <div className="text-xs text-gray-600">/ {stats.total}</div>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search archive..."
                                aria-label="Search archive"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full p-3 bg-konoha-900 border border-konoha-700 rounded-lg text-white focus:border-chakra-blue outline-none"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    aria-label="Clear search"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowSetup(true)}
                            className="bg-konoha-800 border border-konoha-700 text-chakra-blue px-6 py-2 rounded-lg font-bold hover:bg-konoha-700 transition-colors"
                        >
                            Reset Level
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {['ALL', 'STUN', 'AOE', 'HEAL', 'PIERCING', 'AFFLICTION', 'DEFENSE', 'ENERGY'].map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all border ${activeFilter === f
                                    ? 'bg-chakra-blue/20 border-chakra-blue text-chakra-blue shadow-neon-blue'
                                    : 'bg-konoha-900 border-konoha-700 text-gray-500 hover:border-gray-400'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredChars.map(char => {
                    const owned = ownedIds.has ? ownedIds.has(char.id) : ownedIds.includes(char.id)
                    return (
                        <CollectionCard
                            key={char.id}
                            char={char}
                            owned={owned}
                            onToggle={onToggle}
                        />
                    )
                })}
            </div>
        </div>
    )
}

// Keeping it inline above for standardizing styles.

export default CollectionManager
