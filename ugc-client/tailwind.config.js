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
                    bg: '#090d16',
                    card: '#111827',
                    cardHover: '#172033',
                    border: '#1f293d',
                    accent: '#38bdf8',
                    accentHover: '#0ea5e9',
                    success: '#10b981',
                    warning: '#f59e0b',
                    danger: '#ef4444'
                }
            }
        },
    },
    plugins: [],
}