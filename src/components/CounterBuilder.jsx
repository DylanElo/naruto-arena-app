import { useState, useMemo } from 'react';
import { buildCounterTeam } from '../utils/counterBuilder';
import { loadCollection } from '../utils/collectionManager';

const CounterBuilder = ({ allCharacters }) => {
    const [enemyTeam, setEnemyTeam] = useState([]);
    const [counterPicks, setCounterPicks] = useState([]);
    const [search, setSearch] = useState('');

    const ownedIds = loadCollection();

    const addEnemyChar = (char) => {
        if (enemyTeam.length < 3 && !enemyTeam.find(c => c.id === char.id)) {
            const newEnemy = [...enemyTeam, char];
            setEnemyTeam(newEnemy);

            // Auto-calculate counters
            if (newEnemy.length > 0) {
                const counters = buildCounterTeam(newEnemy, allCharacters, ownedIds, []);
                setCounterPicks(counters);
            }
        }
    };

    const removeEnemyChar = (charId) => {
        const newEnemy = enemyTeam.filter(c => c.id !== charId);
        setEnemyTeam(newEnemy);

        if (newEnemy.length > 0) {
            const counters = buildCounterTeam(newEnemy, allCharacters, ownedIds, []);
            setCounterPicks(counters);
        } else {
            setCounterPicks([]);
        }
    };

    const filteredChars = useMemo(() => {
        const q = search.toLowerCase()
        return allCharacters.filter(c => {
            const name = c._searchName || c.name.toLowerCase()
            return name.includes(q)
        })
    }, [allCharacters, search])

    return (
        <div className="space-y-6">
            <div className="bg-dark-secondary rounded-2xl border border-dark-tertiary p-6">
                <h2 className="text-2xl font-bold text-brand-primary mb-4">🎯 Counter Team Builder</h2>
                <p className="text-light-secondary mb-4">Select enemy team to get counter suggestions</p>

                {/* Enemy Team Selection */}
                <div className="mb-6">
                    <h3 className="font-bold text-light-secondary mb-3">Enemy Team ({enemyTeam.length}/3)</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map(index => {
                            const char = enemyTeam[index];
                            return (
                                <div key={index} className="h-24 bg-dark-primary rounded-lg border-2 border-dashed border-dark-tertiary flex items-center justify-center">
                                    {char ? (
                                        <div className="w-full h-full flex items-center bg-red-900/30 border-2 border-red-500 rounded-lg relative">
                                            <img
                                                src={`/naruto-arena-app/images/characters/${char.id}.png`}
                                                alt={char.name}
                                                onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=Enemy'}
                                                className="h-full w-24 object-cover"
                                            />
                                            <div className="p-2 flex-1 min-w-0">
                                                <div className="font-bold text-sm truncate text-light-primary">{char.name}</div>
                                                <button
                                                    onClick={() => removeEnemyChar(char.id)}
                                                    className="text-xs text-red-400 hover:text-red-300 mt-1"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-light-secondary/50 text-sm">Empty</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Counter Picks */}
                {counterPicks.length > 0 && (
                    <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                        <h3 className="font-bold text-green-300 mb-3">✓ Top Counter Picks</h3>
                        <div className="space-y-2">
                            {counterPicks.slice(0, 5).map(char => (
                                <div key={char.id} className="bg-dark-primary/50 p-3 rounded border border-dark-tertiary">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-light-primary">{char.name}</div>
                                            <div className="text-xs text-green-400">Counter Score: {char.counterScore}</div>
                                        </div>
                                        <div className="text-2xl">{char.counterScore >= 50 ? '🔥' : '✓'}</div>
                                    </div>
                                    <div className="text-sm text-light-secondary">{char.counterReason}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Character Selection */}
            <div className="bg-dark-secondary rounded-2xl border border-dark-tertiary p-4">
                <input
                    type="text"
                    placeholder="Search characters..."
                    aria-label="Search characters"
                    className="w-full p-2 bg-dark-primary border border-dark-tertiary rounded text-light-primary focus:border-brand-primary focus:outline-none mb-4"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                    {filteredChars.slice(0, 40).map(char => (
                        <div
                            key={char.id}
                            className="bg-dark-primary rounded-lg p-2 border border-dark-tertiary hover:border-brand-primary cursor-pointer transition-colors"
                            onClick={() => addEnemyChar(char)}
                        >
                            <div className="flex items-center gap-2">
                                <img
                                    src={`/naruto-arena-app/images/characters/${char.id}.png`}
                                    alt={char.name}
                                    onError={(e) => e.target.src = 'https://via.placeholder.com/50?text=?'}
                                    className="w-12 h-12 object-cover rounded"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-light-primary truncate">{char.name}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CounterBuilder;
