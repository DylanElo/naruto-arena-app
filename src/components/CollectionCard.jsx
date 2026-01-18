import { memo } from 'react'
import { assetPath } from '../utils/assetPath'

const CollectionCard = memo(({ char, owned, onToggle }) => {
    return (
        <button
            type="button"
            aria-label={`${char.name} - ${owned ? 'Owned' : 'Not Owned'}`}
            aria-pressed={owned}
            className={`relative rounded-lg overflow-hidden cursor-pointer transition-all border group w-full text-left p-0 ${owned
                ? 'border-chakra-blue/50 bg-konoha-800 shadow-neon-blue'
                : 'border-konoha-700 bg-konoha-900/50 opacity-60 hover:opacity-100 hover:border-gray-500'
                }`}
            onClick={() => onToggle(char.id)}
        >
            <div className="aspect-square relative">
                <img
                    src={assetPath(`images/characters/${char.id}.png`)}
                    alt={char.name}
                    loading="lazy"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=?' }}
                    className={`w-full h-full object-cover transition-transform duration-500 ${!owned && 'grayscale'} group-hover:scale-110`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-konoha-950 via-transparent to-transparent"></div>
                {owned && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-chakra-blue shadow-neon-blue"></div>}
            </div>

            <div className="p-2 absolute bottom-0 w-full">
                <div className={`text-xs font-bold truncate ${owned ? 'text-white' : 'text-gray-500'}`}>{char.name}</div>
            </div>
        </button>
    )
})

CollectionCard.displayName = 'CollectionCard'

export default CollectionCard
