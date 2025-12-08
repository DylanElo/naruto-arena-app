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
            <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-8 shadow-lg max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-orange-300 mb-4">🎮 Collection Setup</h2>
                <p className="text-gray-300 mb-6">What's your Naruto Arena level? This will auto-import all characters you've unlocked.</p>
                <input
                    type="number"
                    min="1"
                    max="40"
                    value={userLevel}
                    onChange={(e) => setUserLevel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLevelSetup()}
                    placeholder="Enter level (1-40)"
                    className="w-full p-3 bg-gray-900 border border-gray-600 rounded text-white mb-4 focus:border-orange-500 focus:outline-none"
                />
                <div className="flex gap-2">
                    <button onClick={handleLevelSetup} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-2 rounded font-bold transition-colors">
                        Auto-import Characters
                    </button>
                    <button onClick={() => setShowSetup(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded font-bold transition-colors">
                        Skip (Manual)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-6 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-orange-300">📚 My Character Collection</h2>
                    <div className="text-sm">
                        <span className="text-gray-400">Own ed: </span>
                        <span className="text-white font-bold">{stats.owned} / {stats.total}</span>
                        <span className="text-green-400 ml-2">({stats.percentage}%)</span>
                    </div>
                </div>

                <div className="flex gap-3 mb-4">
                    <input
                        type="text"
                        placeholder="Search characters..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 p-2 bg-gray-900 border border-gray-600 rounded text-white focus:border-orange-500 focus:outline-none"
                    />
                    <button
                        onClick={() => setShowSetup(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold transition-colors"
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
                                ? 'border-green-500 bg-green-900/20 hover:bg-green-900/30'
                                : 'border-gray-700 bg-gray-900/50 hover:bg-gray-800/50 opacity-50'
                                }`}
                            onClick={() => handleToggle(char.id)}
                        >
                            <img
                                src={`/naruto-arena-app/images/characters/${char.id}.png`}
                                alt={char.name}
                                onError={(e) => e.target.src = 'https://via.placeholder.com/100?text=?'}
                                className="w-full h-32 object-cover"
                            />
                            <div className="p-2 bg-gray-900/80">
                                <div className="text-xs text-white font-bold truncate">{char.name}</div>
                            </div>
                            {owned && (
                                <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold">
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
