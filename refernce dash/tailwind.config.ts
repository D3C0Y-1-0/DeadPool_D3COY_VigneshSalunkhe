import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
        body:    ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          purple:  "#8b5cf6",
          violet:  "#6e44ff",
          fuchsia: "#d946ef",
          indigo:  "#6366f1",
          cyan:    "#06b6d4",
        },
        surface: {
          base:    "#05050f",
          card:    "#0c0d1a",
          elevated:"#111228",
          overlay: "#0a0b17",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139,92,246,0.25), transparent)",
        "purple-glow":
          "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(139,92,246,0.3), transparent)",
      },
      boxShadow: {
        "glow-sm":  "0 0 16px rgba(139,92,246,0.4)",
        "glow-md":  "0 0 32px rgba(139,92,246,0.5)",
        "glow-lg":  "0 0 60px rgba(139,92,246,0.4), 0 0 120px rgba(139,92,246,0.2)",
        "glow-btn": "0 0 24px rgba(110,68,255,0.65)",
        "card":     "0 24px 80px rgba(0,0,0,0.8), 0 0 40px rgba(139,92,246,0.08)",
        "inset-top":"inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      animation: {
        "twinkle":       "twinkle 3s ease-in-out infinite",
        "nebula-1":      "nebulaDrift1 18s ease-in-out infinite",
        "nebula-2":      "nebulaDrift2 22s ease-in-out infinite",
        "beam-shimmer":  "beamShimmer 4s ease-in-out infinite",
        "stream-flow":   "streamFlow 6s linear infinite",
        "float":         "floatY 5s ease-in-out infinite",
        "fade-in-up":    "fadeInUp 0.7s ease both",
        "fade-in":       "fadeIn 0.5s ease both",
        "gradient":      "gradientShift 6s ease infinite",
        "pulse-ring":    "pulseRing 2s ease-out infinite",
        "slow-rotate":   "slowRotate 40s linear infinite",
        "star-twinkle":  "twinkle 4s ease-in-out infinite",
        "slide-up":      "fadeInUp 0.6s ease both",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.15", transform: "scale(0.8)" },
          "50%":       { opacity: "1",    transform: "scale(1.2)" },
        },
        nebulaDrift1: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%":       { transform: "translate(40px,-30px) scale(1.05)" },
          "66%":       { transform: "translate(-20px,20px) scale(0.97)" },
        },
        nebulaDrift2: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "40%":       { transform: "translate(-50px,25px) scale(1.08)" },
          "70%":       { transform: "translate(30px,-15px) scale(0.95)" },
        },
        beamShimmer: {
          "0%, 100%": { opacity: "0.85" },
          "50%":       { opacity: "1" },
        },
        streamFlow: {
          from: { strokeDashoffset: "600" },
          to:   { strokeDashoffset: "0" },
        },
        floatY: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-8px)" },
        },
        gradientShift: {
          "0%":   { backgroundPosition: "0% 50%" },
          "50%":  { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        pulseRing: {
          "0%":   { transform: "scale(1)",   opacity: "0.8" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        slowRotate: {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(32px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
