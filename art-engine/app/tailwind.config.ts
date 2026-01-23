import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#050505",
                foreground: "#F0F0F0",
                accent: "#FF3300",
                surface: "#111111",
            },
            fontFamily: {
                display: ["var(--font-archivo)", "sans-serif"],
                body: ["var(--font-jetbrains)", "monospace"],
            },
            borderRadius: {
                DEFAULT: "0px",
                lg: "0px",
                md: "0px",
                sm: "0px",
            },
        },
    },
    plugins: [],
};
export default config;
