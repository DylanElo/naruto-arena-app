import { useState } from 'react';
import { buildCounterTeam } from '../utils/counterBuilder';
import { loadCollection } from '../utils/collectionManager';
import { assetPath } from '../utils/assetPath';

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

    const filteredChars = allCharacters.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <div className="relative z-10">
                    <h2 className="text-3xl font-bold text-white mb-2 glow-text">🎯 Counter Tactics</h2>
                    <p className="text-slate-400 mb-8 max-w-2xl">Construct the enemy team below to receive AI-powered counter recommendations based on mechanical weaknesses and elemental disadvantages.</p>

                    {/* Enemy Team Selection */}
                    <div className="mb-8">
                        <h3 className="text-sm uppercase tracking-widest text-rose-400 font-bold mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                            Target Enemy Team ({enemyTeam.length}/3)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl">
                            {[0, 1, 2].map(index => {
                                const char = enemyTeam[index];
                                return (
                                    <div key={index} className={`h-32 rounded-xl border-2 flex items-center justify-center transition-all ${char
                                        ? 'border-rose-500/50 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                                        : 'border-dashed border-[var(--border-subtle)] bg-white/5 hover:bg-white/10 hover:border-white/20'
                                        }`}>
                                        {char ? (
                                            <div className="w-full h-full flex items-center relative group overflow-hidden rounded-xl">
                                                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent z-10"></div>
                                                <img
                                                    src={assetPath(`images/characters/${char.id}.png`)}
                                                    alt={char.name}
                                                    onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=Enemy'}
                                                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500"
                                                />
                                                <div className="relative z-20 p-4 w-full flex justify-between items-center">
                                                    <div className="font-black text-lg text-white text-shadow-md">{char.name}</div>
                                                    <button
                                                        onClick={() => removeEnemyChar(char.id)}
                                                        className="w-8 h-8 rounded-full bg-black/50 hover:bg-rose-500 text-white flex items-center justify-center transition-colors border border-white/10"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-slate-600">
                                                <span className="text-2xl">+</span>
                                                <span className="text-xs uppercase font-bold tracking-wider">Select Enemy</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Counter Picks */}
                    {counterPicks.length > 0 && (
                        <div className="glass-panel border-emerald-500/30 bg-emerald-900/10 p-6 relative overflow-hidden">
                            <div className="absolute -left-10 top-0 w-1 h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
                            <h3 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
                                <span>✓</span> Tactical Solutions
                            </h3>
                            <div className="grid gap-4">
                                {counterPicks.slice(0, 5).map(char => (
                                    <div key={char.id} className="bg-black/40 p-4 rounded-xl border border-emerald-500/20 hover:border-emerald-500/50 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center group">
                                        <img
                                            src={assetPath(`images/characters/${char.id}.png`)}
                                            alt={char.name}
                                            className="w-16 h-16 rounded-lg object-cover border border-white/10 group-hover:scale-105 transition-transform"
                                        />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="font-bold text-lg text-white">{char.name}</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs uppercase text-emerald-500 font-bold tracking-wider">Advantage</span>
                                                    <div className="text-emerald-400 font-mono font-bold">{Math.round(char.counterScore)}%</div>
                                                </div>
                                            </div>
                                            <div className="text-sm text-slate-400 leading-relaxed border-l-2 border-emerald-500/20 pl-3">
                                                {char.counterReason}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Character Selection */}
            <div className="glass-panel p-6">
                <input
                    type="text"
                    placeholder="Search characters to add to enemy team..."
                    className="w-full p-4 bg-[rgba(0,0,0,0.3)] border border-[var(--border-subtle)] rounded-xl text-white focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all mb-6"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {filteredChars.slice(0, 40).map(char => (
                        <div
                            key={char.id}
                            className="bg-white/5 rounded-xl p-2 border border-white/5 hover:bg-white/10 hover:border-rose-500/30 cursor-pointer transition-all hover:scale-105 group"
                            onClick={() => addEnemyChar(char)}
                        >
                            <div className="flex items-center gap-3">
                                <img
                                    src={assetPath(`images/characters/${char.id}.png`)}
                                    alt={char.name}
                                    onError={(e) => e.target.src = 'https://via.placeholder.com/50?text=?'}
                                    className="w-10 h-10 object-cover rounded-lg grayscale group-hover:grayscale-0 transition-all"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-xs text-slate-300 group-hover:text-white truncate">{char.name}</div>
                                    <div className="text-[10px] text-slate-500">#{char.id}</div>
                                </div>
                                <div className="text-rose-500 opacity-0 group-hover:opacity-100 font-bold">+</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CounterBuilder;
