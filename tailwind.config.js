/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: '#00A8FF', // A vibrant blue
                    secondary: '#00C2FF', // A lighter, complementary blue
                },
                dark: {
                    primary: '#1a1a1a', // A deep, near-black
                    secondary: '#2a2a2a', // A slightly lighter dark gray
                    tertiary: '#3a3a3a', // An even lighter gray for accents
                },
                light: {
                    primary: '#ffffff', // Pure white
                    secondary: '#f2f2f2', // A very light gray
                },
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'], // A modern, clean font
            },
        },
    },
    plugins: [],
}
