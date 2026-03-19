/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: "#0f1117",
          hover: "#1e2433",
          active: "#1a2235",
          border: "#1f2937",
          text: "#9ca3af",
          textActive: "#f9fafb",
        },
        brand: {
          green: "#22c55e",
          greenDark: "#16a34a",
          greenLight: "#dcfce7",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
