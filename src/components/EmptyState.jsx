import React from 'react'

const EmptyState = ({ message = "No results found", subtext = "Try adjusting your filters", onClear }) => {
  return (
    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-500 fill-mode-forwards">
      <div
        className="w-16 h-16 mb-4 rounded-full bg-konoha-800 border-2 border-konoha-700 flex items-center justify-center text-3xl text-gray-600"
        aria-hidden="true"
      >
        🔍
      </div>
      <h3 className="text-lg font-display font-bold text-white mb-1">{message}</h3>
      <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">{subtext}</p>
      {onClear && (
        <button
          onClick={onClear}
          className="px-6 py-2 bg-konoha-800 border border-konoha-700 text-chakra-blue font-bold text-xs uppercase tracking-wider rounded-full hover:bg-konoha-700 hover:border-chakra-blue transition-all focus:outline-none focus:ring-2 focus:ring-chakra-blue"
          aria-label="Clear all filters and search"
        >
          Clear Filters
        </button>
      )}
    </div>
  )
}

export default EmptyState
