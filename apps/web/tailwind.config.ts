import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/game/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wild: {
          ink: "#0e0a14",
          parch: "#f4ecd8",
          accent: "#c9b78f",
          flora: "#3c9a4a",
          gal: "#f4d03f",
          aq: "#1f78d1",
          th: "#ff6b3d",
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', "ui-monospace", "monospace"],
        body: ['"Inter"', "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};

export default config;
