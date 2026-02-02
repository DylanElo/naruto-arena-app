import React from 'react'

const EmptyState = ({ message, subtext, action }) => (
    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-70 animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-konoha-800 rounded-full flex items-center justify-center mb-4 text-2xl text-chakra-blue border border-konoha-700 shadow-neon-blue">
            ⚡
        </div>
        <h3 className="font-display text-lg text-white mb-2 tracking-wide">{message}</h3>
        {subtext && <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6 leading-relaxed">{subtext}</p>}
        {action && (
            <div className="mt-2">
                {action}
            </div>
        )}
    </div>
)

export default EmptyState
