/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#ffffff",
        ink: "#1e293b",
        muted: "#64748b",
        line: "#e2e8f0",
        sand: "#f1f5f9",
        rust: "#c2410c",
        due: "#d97706",
        ok: "#15803d",
        navy: "#0f2744",
      },
      keyframes: {
        page: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        pop: {
          from: { opacity: "0", transform: "scale(0.96) translateY(-4px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        page: "page 0.35s ease-out",
        pop: "pop 0.16s ease-out",
      },
    },
  },
  plugins: [],
};
