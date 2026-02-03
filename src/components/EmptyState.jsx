import React from 'react'

const EmptyState = ({ message, subtext, action }) => (
  <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-50 animate-in fade-in zoom-in duration-300">
    <div className="text-4xl mb-4" role="img" aria-label="Empty">🌪️</div>
    <h3 className="text-xl font-display font-bold text-white mb-2">{message}</h3>
    {subtext && <p className="text-sm text-gray-400 mb-6 max-w-xs">{subtext}</p>}
    {action}
  </div>
)

export default EmptyState
