import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./constants/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // 1. BACKGROUNDS (Dark Mode Base - Rich Black)
        fill: {
          1: "#0F1113", // Main background (Rich Black)
          2: "#1A1D21", // Secondary background (Cards/Sidebar)
        },
        // 2. PRIMARY BRAND COLORS (Emerald & Mint)
        bankGradient: "#027A48", // Deep Emerald for gradients
        primary: {
          500: "#12B76A", // Vibrant Mint (Main Brand)
          600: "#039855", // Deep Emerald (Hover)
          700: "#027A48", // Dark Emerald (Active)
        },
        // 3. ACCENTS (Mint for success/highlights)
        success: {
          25: "#ECFDF3",
          100: "#D1FADF",
          400: "#47CD89", // Added missing mint green shade
          500: "#12B76A", // Vibrant Mint (Highlights)
          600: "#039855",
          700: "#027A48",
          900: "#05603A",
        },
        // Keep utility colors adapted for dark backgrounds
        pink: {
          25: "#2D1F2B",
          100: "#FCE7F6",
          500: "#EE46BC",
          600: "#DD2590",
          700: "#C11574",
          900: "#851651",
        },
        blue: {
          25: "#1A2332",
          100: "#D1E9FF",
          500: "#2E90FA",
          600: "#1570EF",
          700: "#175CD3",
          900: "#194185",
        },
        sky: {
          1: "#0F1113", // Matches fill.1 for dark mode
        },
        // 4. TEXT COLORS (Cool-toned for Emerald theme)
        black: {
          1: "#FFFFFF", // Main text (White)
          2: "#D0D5DD", // Secondary text (Cool Light Gray)
        },
        gray: {
          25: "#F9FAFB",   //  Lightest (was 900)
          200: "#EAECF0",  // Light
          300: "#D0D5DD",  // Medium-light
          500: "#98A2B3",  // Medium (unchanged)
          600: "#667085",  // Medium-dark
          700: "#475467",  // Dark
          800: "#1F2328",  // Darker
          900: "#111827",  // Darkest (for dark mode popover)
        },
      },
      backgroundImage: {
        "bank-gradient": "linear-gradient(90deg, #027A48 0%, #12B76A 100%)",
        "gradient-mesh": "url('/icons/gradient-mesh.svg')",
        "bank-green-gradient":
          "linear-gradient(90deg, #027A48 0%, #039855 100%)",
      },
      boxShadow: {
        form: "0px 1px 2px 0px rgba(16, 24, 40, 0.05)",
        chart:
          "0px 1px 3px 0px rgba(16, 24, 40, 0.10), 0px 1px 2px 0px rgba(16, 24, 40, 0.06)",
        profile:
          "0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)",
        creditCard: "8px 10px 16px 0px rgba(0, 0, 0, 0.05)",
      },
      fontFamily: {
        inter: "var(--font-inter)",
        "ibm-plex-serif": "var(--font-ibm-plex-serif)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
