/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                industrial: {
                    900: '#0f172a', // slate-900 base
                    800: '#1e293b', // slate-800 panels
                    700: '#334155', // borders
                },
                electric: {
                    cyan: '#06b6d4', // cyan-500
                    blue: '#3b82f6', // blue-500
                    danger: '#ef4444', // red-500
                    success: '#22c55e', // green-500
                    warning: '#eab308', // yellow-500
                }
            },
            fontFamily: {
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', "Segoe UI", 'Roboto', "Helvetica Neue", 'Arial', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
