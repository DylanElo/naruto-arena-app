import { ENERGY_BG_COLORS } from '../utils/colors'

const EnergyIcon = ({ type, size = 'w-4 h-4' }) => {
  const label = type === 'none' ? 'No energy cost' : `${type} energy`
  const char = type === 'none' ? '-' : type[0]

  return (
    <div
      className={`${size} rounded flex items-center justify-center font-bold text-[10px] uppercase border border-white/10 ${ENERGY_BG_COLORS[type] || 'bg-gray-700'}`}
      role="img"
      aria-label={label}
    >
      <span aria-hidden="true">{char}</span>
    </div>
  )
}

export default EnergyIcon
