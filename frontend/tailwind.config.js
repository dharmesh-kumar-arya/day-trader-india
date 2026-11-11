/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b0e14",
        surface: "#121722",
        "surface-raised": "#1a2232",
        border: "#242e42",
        brand: "#3b82f6",
        bull: "#10b981",
        bear: "#ef4444",
        accent: "#f59e0b",
      }
    },
  },
  plugins: [],
}

