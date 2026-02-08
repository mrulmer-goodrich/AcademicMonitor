import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b1b2a",
        sand: "#f4efe6",
        ocean: "#2d6a9f",
        sun: "#e3b341",
        coral: "#e07a5f",
        mint: "#6bbf8a"
      },
      fontFamily: {
        display: ["'Space Grotesk'", "ui-sans-serif", "system-ui"],
        body: ["'IBM Plex Sans'", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        soft: "0 10px 30px rgba(11, 27, 42, 0.12)",
        lift: "0 18px 40px rgba(11, 27, 42, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
