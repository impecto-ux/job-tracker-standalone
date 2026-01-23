/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                'nexus-black': '#09090b', // zinc-950
                'nexus-gray': '#27272a',  // zinc-800
                'nexus-primary': '#10b981', // emerald-500
            }
        },
    },
    plugins: [],
}
