import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Lucida Grande", "Helvetica Neue", "sans-serif"],
        mono: ["var(--font-mono)", "Monaco", "Lucida Console", "monospace"],
      },
      colors: {
        // Blueberry — ETF / Primary
        blueberry: {
          50:  "#e6f1fb",
          100: "#b8e0f8",
          200: "#88c8ec",
          400: "#5a9fd4",
          500: "#3a8acc",
          600: "#2a6bb0",
          700: "#1a5f9a",
          800: "#0a3a6a",
          900: "#062855",
        },
        // Tangerine — Vehicle / Action primary
        tangerine: {
          50:  "#fff4e8",
          100: "#ffd0a8",
          200: "#ffb478",
          400: "#f5984a",
          500: "#f06820",
          600: "#d05810",
          700: "#a04408",
          800: "#6a2a0a",
          900: "#4a1c05",
        },
        // Lime — Stocks / Positive accent
        lime: {
          50:  "#f0f8e0",
          100: "#d8f0a8",
          200: "#b8e060",
          400: "#98d048",
          500: "#80c020",
          600: "#6aa820",
          700: "#5a9008",
          800: "#2a4a08",
          900: "#1a3005",
        },
        // Strawberry — Cash / Negative accent
        strawberry: {
          50:  "#ffe8ec",
          100: "#ffc0c8",
          200: "#ff98a8",
          400: "#f06878",
          500: "#e84858",
          600: "#c83040",
          700: "#a02030",
          800: "#5a0a18",
          900: "#3a040c",
        },
        // Grape — Crypto / Secondary action
        grape: {
          50:  "#f4ecf8",
          100: "#e0b8e8",
          200: "#c898d8",
          400: "#b878d0",
          500: "#9858c8",
          600: "#8a48b0",
          700: "#6828a0",
          800: "#4a0a6a",
          900: "#2a0440",
        },
        // Bondi — original 1998, neutral primary
        bondi: {
          50:  "#e0f0f4",
          100: "#a8d8e4",
          200: "#78c0d4",
          400: "#48a0bc",
          500: "#1d8aa8",
          600: "#106a85",
          700: "#0a4f65",
          800: "#063a4d",
          900: "#022530",
        },
      },
    },
  },
  plugins: [],
};
export default config;
