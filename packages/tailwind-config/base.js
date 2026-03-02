/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        fan: {
          DEFAULT: "#2563eb",
          foreground: "#ffffff",
          600: "#2563eb",
        },
        band: {
          DEFAULT: "#7c3aed",
          foreground: "#ffffff",
          600: "#7c3aed",
        },
        like: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
          500: "#ef4444",
        },
        success: {
          DEFAULT: "#16a34a",
          foreground: "#ffffff",
          600: "#16a34a",
        },
        warning: {
          DEFAULT: "#d97706",
          foreground: "#ffffff",
        },
        error: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },

        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring))",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "oklch(var(--primary))",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary))",
          foreground: "oklch(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted))",
          foreground: "oklch(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "oklch(var(--accent))",
          foreground: "oklch(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive))",
          foreground: "oklch(var(--destructive-foreground))",
        },
        text: {
          primary: "oklch(var(--foreground))",
          secondary: "oklch(var(--muted-foreground))",
          muted: "oklch(var(--muted-foreground))",
          disabled: "oklch(var(--muted-foreground))",
        },
      },

      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        serif: ["var(--font-source-serif)", "ui-serif", "Georgia", "serif"],
        display: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },

      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "calc(var(--radius) + 0.125rem)",
        xl: "calc(var(--radius) + 0.25rem)",
        "2xl": "calc(var(--radius) + 0.5rem)",
      },

      spacing: {
        18: "4.5rem",
        88: "22rem",
        128: "32rem",
      },

      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 250ms ease-out",
        shimmer: "shimmer 1.5s linear infinite",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },

      boxShadow: {
        soft: "0 1px 1px rgba(0,0,0,0.02), 0 2px 6px rgba(0,0,0,0.04)",
        subtle: "0 1px 2px rgba(0,0,0,0.05)",
      },

      transitionDuration: {
        fast: "150ms",
        DEFAULT: "200ms",
        slow: "300ms",
      },
    },
  },
  plugins: [],
};
