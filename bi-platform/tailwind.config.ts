/** @type {import('tailwindcss').Config} */
module.exports = {
  // ↓ هذا السطر هو اللي ينقص — بدونو dark mode ما يخدمش أبدًا
  darkMode: "class",

  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Legacy tokens (kept for backward compat) ──
        primary: "hsl(var(--primary) / <alpha-value>)",
        secondary: "hsl(var(--secondary) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        borderLight: "hsl(var(--border) / <alpha-value>)",

        // ── Full design-system palette ──
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",

        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        "primary-foreground": "hsl(var(--primary-foreground) / <alpha-value>)",
        "secondary-foreground":
          "hsl(var(--secondary-foreground) / <alpha-value>)",

        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        "accent-foreground": "hsl(var(--accent-foreground) / <alpha-value>)",

        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
        },

        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",

        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground":
            "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground":
            "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },

        admin: {
          bg: "hsl(var(--admin-bg) / <alpha-value>)",
          surface: "hsl(var(--admin-surface) / <alpha-value>)",
          sidebar: "hsl(var(--admin-sidebar) / <alpha-value>)",
          "sidebar-fg": "hsl(var(--admin-sidebar-fg) / <alpha-value>)",
          "sidebar-active": "hsl(var(--admin-sidebar-active) / <alpha-value>)",
          accent: "hsl(var(--admin-accent) / <alpha-value>)",
          "accent-light": "hsl(var(--admin-accent-light) / <alpha-value>)",
          "accent-glow": "hsl(var(--admin-accent-glow) / <alpha-value>)",
          header: "hsl(var(--admin-header) / <alpha-value>)",
          info: "hsl(var(--admin-info) / <alpha-value>)",
          "info-foreground":
            "hsl(var(--admin-info-foreground) / <alpha-value>)",
        },
      },

      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "1rem",
        "2xl": "1.5rem",
      },

      boxShadow: {
        soft: "0 4px 20px rgba(0,0,0,0.05)",
        hover: "0 8px 30px rgba(0,0,0,0.1)",
      },

      backgroundImage: {
        "admin-kpi": "var(--admin-kpi-gradient)",
      },

      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleUp: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.05)" },
        },
      },

      animation: {
        fadeIn: "fadeIn 0.4s ease-in-out",
        scaleUp: "scaleUp 0.2s ease-in-out forwards",
      },
    },
  },
  plugins: [],
};
