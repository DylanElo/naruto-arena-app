/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Shinobi OS Palette
                chakra: {
                    blue: '#00F0FF', // Neon Cyan (Energy)
                    glow: '#00F0FF40',
                    red: '#FF2A00', // Kurama Orange (Power)
                    purple: '#BD00FF', // Void/Genjutsu
                },
                konoha: {
                    950: '#02040a', // Deepest Abyss
                    900: '#050a14', // Background
                    800: '#0a1629', // Card Surface
                    700: '#142847', // Borders
                },
                glass: {
                    base: 'rgba(5, 10, 20, 0.7)',
                    light: 'rgba(255, 255, 255, 0.05)',
                    border: 'rgba(255, 255, 255, 0.1)',
                },
                // Legacy support (mapping to new system)
                brand: {
                    primary: '#00F0FF',
                    secondary: '#FF2A00',
                },
                dark: {
                    primary: '#050a14',
                    secondary: '#0a1629',
                    tertiary: '#142847',
                },
                light: {
                    primary: '#e2e8f0',
                    secondary: '#94a3b8',
                }
            },
            fontFamily: {
                sans: ['Outfit', 'Inter', 'sans-serif'],
                display: ['Orbitron', 'sans-serif'], // For Headers/Numbers
            },
            boxShadow: {
                'neon-blue': '0 0 10px rgba(0, 240, 255, 0.5)',
                'neon-red': '0 0 10px rgba(255, 42, 0, 0.5)',
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                }
            }
        },
    },
    plugins: [],
}
