/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'selector', // or 'class' - v4 uses 'selector' as preferred, but 'class' is alias.
    theme: {
        extend: {},
    },
    plugins: [],
}
