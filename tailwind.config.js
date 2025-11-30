/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    safelist: [
        'translate-x-0',
        'translate-x-4',
        'transition-transform',
        'transition-colors',
        'duration-200',
        'duration-300',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
            },
            colors: {
                gray: {
                    750: '#2d3748',
                    850: '#1a202c',
                    950: '#171923',
                },
                // Brand colors from landing page
                brand: {
                    blue: '#0066ff',
                    'blue-dark': '#0052cc',
                    'blue-light': '#3385ff',
                    orange: '#e19136',
                    'orange-dark': '#c77d2a',
                    'orange-light': '#f0a550',
                }
            }
        },
    },
    plugins: [],
}
