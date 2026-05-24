import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        arc: {
          // Dark mode
          bg:          "#0d1420",
          card:        "#111c2d",
          border:      "#1e2f44",
          // Light mode
          "bg-light":    "#f3f2f7",
          "card-light":  "#ffffff",
          "border-light":"#e2e0ea",
          // Brand
          primary:     "#4d8ee9",
          primaryHover:"#2563eb",
          primaryLight:"#5fbfff",
          // Text
          text:        "#f0f4ff",
          "text-light":  "#1a2236",
          muted:       "#6b7a99",
          "muted-light": "#6b6580",
          // Status
          success:     "#10b981",
          warning:     "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
