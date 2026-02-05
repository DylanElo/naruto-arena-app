import { ENERGY_BG_COLORS } from '../utils/colors'

const EnergyIcon = ({ type, size = 'w-4 h-4', className = '' }) => {
  const energyName = type === 'none' ? 'No' : type.charAt(0).toUpperCase() + type.slice(1)
  const label = `${energyName} Energy`

  return (
    <div
      className={`${size} rounded flex items-center justify-center font-bold text-[10px] uppercase border border-white/10 ${ENERGY_BG_COLORS[type] || 'bg-gray-700'} ${className}`}
      aria-label={label}
      title={label}
      role="img"
    >
      {type === 'none' ? '-' : type[0]}
    </div>
  )
}

export default EnergyIcon
