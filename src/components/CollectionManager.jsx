import { useState } from 'react';
import {
    initializeCollectionByLevel,
    loadCollection,
    toggleCharacter,
    getCollectionStats
} from '../utils/collectionManager';

const CollectionManager = ({ allCharacters, ownedIds, onToggle, onBatchUpdate }) => {
    const [userLevel, setUserLevel] = useState('');
    const [showSetup, setShowSetup] = useState(ownedIds.length === 0);
    const [search, setSearch] = useState('');
    const stats = getCollectionStats(allCharacters, ownedIds);

    const handleLevelSetup = () => {
        const level = parseInt(userLevel);
        if (level >= 1 && level <= 40) {
            const ids = initializeCollectionByLevel(level, allCharacters);
            onBatchUpdate(ids);
            setShowSetup(false);
        }
    };

    const handleToggle = (charId) => {
        onToggle(charId);
    };

    const filteredChars = allCharacters.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    if (showSetup) {
        return (
            <div className="bg-white/90 rounded-2xl border border-slate-200 p-8 shadow-xl max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-sky-700 mb-4">🎮 Collection Setup</h2>
                <p className="text-slate-600 mb-6">What's your Naruto Arena level? This will auto-import all characters you've unlocked.</p>
                <input
                    type="number"
                    min="1"
                    max="40"
                    value={userLevel}
                    onChange={(e) => setUserLevel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLevelSetup()}
                    placeholder="Enter level (1-40)"
                    className="w-full p-3 bg-white border border-slate-200 rounded text-slate-900 mb-4 focus:border-sky-500 focus:outline-none"
                />
                <div className="flex gap-2">
                    <button onClick={handleLevelSetup} className="flex-1 bg-sky-500 hover:bg-sky-400 text-white py-2 rounded font-bold transition-colors">
                        Auto-import Characters
                    </button>
                    <button onClick={() => setShowSetup(false)} className="flex-1 bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-500 text-slate-700 py-2 rounded font-bold transition-colors">
                        Skip (Manual)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white/90 rounded-2xl border border-slate-200 p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-sky-700">📚 My Character Collection</h2>
                    <div className="text-sm">
                        <span className="text-slate-500">Owned: </span>
                        <span className="text-slate-900 font-bold">{stats.owned} / {stats.total}</span>
                        <span className="text-emerald-600 ml-2">({stats.percentage}%)</span>
                    </div>
                </div>

                <div className="flex gap-3 mb-4">
                    <input
                        type="text"
                        placeholder="Search characters..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 p-2 bg-white border border-slate-200 rounded text-slate-900 focus:border-sky-500 focus:outline-none"
                    />
                    <button
                        onClick={() => setShowSetup(true)}
                        className="bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded font-bold transition-colors"
                    >
                        Reset by Level
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredChars.map(char => {
                    const owned = ownedIds.includes(char.id);
                    return (
                        <div
                            key={char.id}
                            className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${owned
                                ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                                : 'border-slate-200 bg-white hover:bg-slate-50 opacity-70'
                                }`}
                            onClick={() => handleToggle(char.id)}
                        >
                            <img
                                src={`/naruto-arena-app/images/characters/${char.id}.png`}
                                alt={char.name}
                                onError={(e) => e.target.src = 'https://via.placeholder.com/100?text=?'}
                                className="w-full h-32 object-cover"
                            />
                            <div className="p-2 bg-white/80">
                                <div className="text-xs text-slate-900 font-bold truncate">{char.name}</div>
                            </div>
                            {owned && (
                                <div className="absolute top-1 right-1 bg-emerald-400 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold">
                                    ✓
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CollectionManager;
