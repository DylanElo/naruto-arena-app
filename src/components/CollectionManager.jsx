import { useState, useEffect } from 'react';
import {
    initializeCollectionByLevel,
    loadCollection,
    toggleCharacter,
    getCollectionStats
} from '../utils/collectionManager';

const CollectionManager = ({ allCharacters }) => {
    const [ownedIds, setOwnedIds] = useState(loadCollection());
    const [userLevel, setUserLevel] = useState('');
    const [showSetup, setShowSetup] = useState(ownedIds.length === 0);
    const [search, setSearch] = useState('');
    const stats = getCollectionStats(allCharacters);

    const handleLevelSetup = () => {
        const level = parseInt(userLevel);
        if (level >= 1 && level <= 40) {
            const ids = initializeCollectionByLevel(level, allCharacters);
            setOwnedIds(ids);
            setShowSetup(false);
        }
    };

    const handleToggle = (charId) => {
        const updated = toggleCharacter(charId);
        setOwnedIds(updated);
    };

    const filteredChars = allCharacters.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    if (showSetup) {
        return (
            <div className="collection-setup">
                <h2>Collection Setup</h2>
                <p>What's your Naruto Arena level?</p>
                <input
                    type="number"
                    min="1"
                    max="40"
                    value={userLevel}
                    onChange={(e) => setUserLevel(e.target.value)}
                    placeholder="Enter level (1-40)"
                />
                <button onClick={handleLevelSetup}>
                    Auto-import Characters
                </button>
                <button onClick={() => setShowSetup(false)}>
                    Skip (Manual Select)
                </button>
            </div>
        );
    }

    return (
        <div className="collection-manager">
            <div className="collection-header">
                <h2>My Character Collection</h2>
                <div className="stats">
                    <span>{stats.owned} / {stats.total} ({stats.percentage}%)</span>
                </div>
            </div>

            <div className="controls">
                <input
                    type="text"
                    placeholder="Search characters..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button onClick={() => setShowSetup(true)}>
                    Reset by Level
                </button>
            </div>

            <div className="character-grid">
                {filteredChars.map(char => {
                    const owned = ownedIds.includes(char.id);
                    return (
                        <div
                            key={char.id}
                            className={`character-card ${owned ? 'owned' : 'locked'}`}
                            onClick={() => handleToggle(char.id)}
                        >
                            <img
                                src={`/naruto-arena-app/images/characters/${char.id}.jpg`}
                                alt={char.name}
                                onError={(e) => e.target.src = '/naruto-arena-app/placeholder.jpg'}
                            />
                            <div className="char-name">{char.name}</div>
                            {owned && <div className="checkmark">✓</div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CollectionManager;
