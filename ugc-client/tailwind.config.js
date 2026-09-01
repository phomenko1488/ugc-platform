/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // "Slate & Raw Terracotta" — эдиториальная палитра в стиле передовых архитектурных
                // и дизайн-студий. Глубокий минеральный уголь в сочетании с благородной терракотой
                // вместо заезженного золота, неона и синевы.
                brand: {
                    bg: '#0d0e11',          // Глубокий минеральный уголь с холодным полутоном
                    card: '#16181c',        // Плотные архитектурные панели
                    cardHover: '#21242b',   // Выразительный тактильный отклик
                    border: '#2e333d',      // Строгие графитовые границы
                    accent: '#e05a33',      // Сырая терракота (Raw Terracotta) — смелый, нешаблонный акцент
                    accentHover: '#f06c45', // Яркий терракотовый ховер
                    success: '#3b8a61',     // Сложный приглушенный изумрудно-травяной
                    warning: '#d99b36',     // Архитектурный охровый для статусов
                    danger: '#cf4646',      // Плотный глиняный красный для ошибок
                    // The palette's own name promises a "Slate" half alongside the terracotta —
                    // this is where it actually shows up: a dusty steel-blue for informational/
                    // in-progress states, replacing the generic Tailwind `sky-*` swatches those
                    // states borrowed before this token existed (a cool default, not a choice).
                    info: '#5b7fa3',
                    infoHover: '#6f95bb',
                },
                ash: '#b8bcc4',             // Чистый серебристо-платиновый текст для высокой четкости
            },
            fontFamily: {
                display: ['"Big Shoulders Display"', 'sans-serif'],
                sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
            },
        },
    },
    plugins: [],
}