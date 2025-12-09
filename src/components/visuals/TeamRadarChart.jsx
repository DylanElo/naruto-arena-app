import React, { useMemo } from 'react';

const TeamRadarChart = ({ roles, size = 200 }) => {
    // Normalize logic: Max possible score per role is 15 (3 chars * 5 rating)
    // We'll use 15 as the 100% baseline, but allow overflow if needed (though 15 is hard cap currently)
    const MAX_VAL = 15;

    const data = useMemo(() => {
        const dps = Math.min(roles.dps || 0, MAX_VAL);
        const tank = Math.min(roles.tank || 0, MAX_VAL);
        const support = Math.min(roles.support || 0, MAX_VAL);
        const control = Math.min(roles.control || 0, MAX_VAL);
        return { Offense: dps, Defense: tank, Support: support, Control: control };
    }, [roles]);

    // Graph configuration
    const center = size / 2;
    const radius = size * 0.35; // Leave room for labels
    const angleStep = (Math.PI * 2) / 4;

    const axes = Object.keys(data);

    // Helper to get coordinates
    const getCoordinates = (value, index) => {
        const angle = index * angleStep - Math.PI / 2; // Start from top
        const r = (value / MAX_VAL) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    // Calculate polygon points
    const points = axes.map((key, i) => {
        const { x, y } = getCoordinates(data[key], i);
        return `${x},${y}`;
    }).join(' ');

    // Calculate grid polygons (25%, 50%, 75%, 100%)
    const gridLevels = [0.25, 0.5, 0.75, 1];

    return (
        <div className="relative flex flex-col items-center justify-center">
            <svg width={size} height={size} className="overflow-visible">
                <defs>
                    <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="rgba(6, 182, 212, 0.4)" />
                        <stop offset="100%" stopColor="rgba(6, 182, 212, 0.05)" />
                    </radialGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Grid Lines */}
                {gridLevels.map((level, i) => (
                    <polygon
                        key={i}
                        points={axes.map((_, idx) => {
                            const angle = idx * angleStep - Math.PI / 2;
                            const r = radius * level;
                            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                        }).join(' ')}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="1"
                        strokeDasharray={i === 3 ? "0" : "2 2"}
                    />
                ))}

                {/* Axes Lines */}
                {axes.map((_, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const x = center + radius * Math.cos(angle);
                    const y = center + radius * Math.sin(angle);
                    return (
                        <line
                            key={i}
                            x1={center}
                            y1={center}
                            x2={x}
                            y2={y}
                            stroke="rgba(255, 255, 255, 0.1)"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Data Polygon */}
                <polygon
                    points={points}
                    fill="url(#radarGradient)"
                    stroke="#22d3ee" // Cyan-400
                    strokeWidth="2"
                    filter="url(#glow)"
                    className="transition-all duration-700 ease-out"
                />

                {/* Data Points */}
                {axes.map((key, i) => {
                    const coords = getCoordinates(data[key], i);
                    return (
                        <circle
                            key={i}
                            cx={coords.x}
                            cy={coords.y}
                            r="3"
                            fill="#22d3ee" // Cyan
                            className="transition-all duration-700 ease-out"
                        />
                    );
                })}

                {/* Labels */}
                {axes.map((key, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    // Push labels out a bit further than radius
                    const labelRadius = radius + 20;
                    const x = center + labelRadius * Math.cos(angle);
                    const y = center + labelRadius * Math.sin(angle);

                    // Text Anchor logic
                    let textAnchor = 'middle';
                    if (Math.abs(Math.cos(angle)) > 0.1) {
                        // textAnchor = Math.cos(angle) > 0 ? 'start' : 'end'; // Not needed for pure diamond shape usually
                    }

                    return (
                        <g key={key}>
                            <text
                                x={x}
                                y={y}
                                dy="0.35em"
                                textAnchor={textAnchor}
                                fill="var(--text-secondary)"
                                fontSize="10"
                                fontWeight="bold"
                                className="uppercase tracking-wider shadow-black drop-shadow-md"
                            >
                                {key}
                            </text>
                            <text
                                x={x}
                                y={y + 12}
                                dy="0.35em"
                                textAnchor={textAnchor}
                                fill="#22d3ee"
                                fontSize="10"
                                fontWeight="bold"
                            >
                                {Math.round((data[key] / MAX_VAL) * 100)}%
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default TeamRadarChart;
