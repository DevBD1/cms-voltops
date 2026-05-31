/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        midnight: "#0A0E1A",          // Base Canvas
        "slate-navy": "#141A29",      // Borderless Card Surface
        "elevated-navy": "#1E2538",   // Inputs / Active Toggles
        "border-slate": "#1E293B",    // Subtle outlines
        "cyan-glow": "#00E5FF",       // Primary interactive signals
        "neon-green": "#39FF14",      // Semantic success status color
        "indigo-blue": "#2563EB",     // Brand Gradient Start
        "muted": "#94A3B8",           // Soft Slate-Gray for labels/accent text
      },
      fontFamily: {
        sora: ["Sora"],
        inter: ["Inter"],
      },
    },
  },
  plugins: [],
}
