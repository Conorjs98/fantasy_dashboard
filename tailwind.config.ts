import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        card: "#111111",
        "card-hover": "#181818",
        accent: "#00d4ff",
        gold: "#ffd700",
        silver: "#c0c0c0",
        bronze: "#cd7f32",
        muted: "#666666",
        "text-primary": "#e0e0e0",
        "text-secondary": "#999999",
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
