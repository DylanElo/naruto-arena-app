const EmptyState = ({ message, subtext, onClear }) => {
  return (
    <div className="col-span-full flex flex-col items-center justify-center p-8 text-center bg-konoha-800/20 border border-dashed border-konoha-700 rounded-xl">
      <div className="text-4xl mb-3 opacity-50 select-none" aria-hidden="true">🍃</div>
      <h3 className="text-lg font-display font-bold text-white mb-2">{message}</h3>
      {subtext && <p className="text-gray-400 text-sm mb-6 max-w-sm">{subtext}</p>}
      {onClear && (
        <button
          onClick={onClear}
          className="px-6 py-2 bg-konoha-700 hover:bg-konoha-600 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-chakra-blue"
        >
          Clear Filters
        </button>
      )}
    </div>
  )
}

export default EmptyState
