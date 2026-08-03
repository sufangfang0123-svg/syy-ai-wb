import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F5F7F5",
        foreground: "#17231F",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#17231F",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#17231F",
        },
        primary: {
          DEFAULT: "#2E8B70",
          foreground: "#FFFFFF",
          50: "#E8F5F0",
          100: "#D0EBE0",
          200: "#B0D9CC",
          300: "#8AC4AE",
          400: "#5EAA8F",
          500: "#2E8B70",
          600: "#1F6755",
          700: "#1A5246",
          800: "#16403A",
          900: "#123530",
        },
        secondary: {
          DEFAULT: "#F8FAF9",
          foreground: "#40504A",
        },
        muted: {
          DEFAULT: "#F8FAF9",
          foreground: "#7A8A83",
        },
        accent: {
          DEFAULT: "#E8F5F0",
          foreground: "#1F6755",
        },
        destructive: {
          DEFAULT: "#D9635C",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#E49A3A",
          foreground: "#FFFFFF",
        },
        border: "#E4EAE7",
        input: "#E4EAE7",
        ring: "#2E8B70",
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "4px",
      },
      fontFamily: {
        sans: [
          "PingFang SC",
          "Microsoft YaHei",
          "Noto Sans SC",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
