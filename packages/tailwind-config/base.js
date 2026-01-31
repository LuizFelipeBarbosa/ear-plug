/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* ============================================
           ELECTRIC INDIE-BRUTALIST PALETTE
           ============================================ */
        
        // Core Background Colors
        night: {
          DEFAULT: "#0F0F0F",
          secondary: "#1A1A1A",
          tertiary: "#252525",
        },
        
        // Electric Lime - High Priority CTA
        lime: {
          DEFAULT: "#C2FF00",
          dark: "#9FD900",
          glow: "rgba(194, 255, 0, 0.4)",
        },
        
        // Vivid Violet - Secondary Metrics
        violet: {
          DEFAULT: "#8B5CF6",
          dark: "#7C3AED",
          light: "#A78BFA",
          glow: "rgba(139, 92, 246, 0.4)",
        },
        
        // shadcn/ui CSS Variable Mappings
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Primary - Electric Lime
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#F7FEE7",
          100: "#ECFCCB",
          200: "#D9F99D",
          300: "#BEF264",
          400: "#A3E635",
          500: "#C2FF00", // Electric Lime
          600: "#9FD900",
          700: "#84CC16",
          800: "#65A30D",
          900: "#3F6212",
          950: "#1A2E05",
        },
        
        // Secondary - Vivid Violet
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6", // Vivid Violet
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
          950: "#2E1065",
        },
        
        // Accent - Electric Lime (same as primary for consistency)
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        
        // Destructive
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        
        // Muted - Dark Grays
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        
        // Popover - Dark Theme
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        
        // Card - Dark Theme
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        // Surface Colors for Component Backgrounds
        surface: {
          DEFAULT: "#0F0F0F",
          secondary: "#1A1A1A",
          tertiary: "#252525",
          elevated: "#2A2A2A",
        },
        
        // Semantic Colors
        success: {
          DEFAULT: "#22C55E",
          dark: "#16A34A",
          light: "#4ADE80",
        },
        warning: {
          DEFAULT: "#F59E0B",
          dark: "#D97706",
          light: "#FBBF24",
        },
        error: {
          DEFAULT: "#EF4444",
          dark: "#DC2626",
          light: "#F87171",
        },
        
        // Text Colors
        text: {
          primary: "#FFFFFF",
          secondary: "#A1A1AA",
          muted: "#71717A",
          disabled: "#52525B",
        },
      },
      
      fontFamily: {
        // Display - Bold Condensed (Street Poster Style)
        display: ["var(--font-oswald)", "var(--font-geist)", "system-ui", "sans-serif"],
        // Body - Clean & Legible
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        // Condensed for Headers
        condensed: ["var(--font-oswald)", "var(--font-geist)", "sans-serif"],
      },
      
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
      },
      
      borderWidth: {
        brutal: "2px",
      },
      
      spacing: {
        18: "4.5rem",
        88: "22rem",
        128: "32rem",
      },
      
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-lime": "pulseLime 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-violet": "pulseViolet 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 4s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
      },
      
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pulseLime: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(194, 255, 0, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(194, 255, 0, 0)" },
        },
        pulseViolet: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(139, 92, 246, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(139, 92, 246, 0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) scale(1)", opacity: "0.3" },
          "50%": { transform: "translateY(-20px) scale(1.1)", opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      
      boxShadow: {
        // Brutalist Offset Shadows
        brutal: "4px 4px 0px #C2FF00",
        "brutal-violet": "4px 4px 0px #8B5CF6",
        "brutal-lg": "6px 6px 0px #C2FF00",
        
        // Glow Effects
        "glow-lime": "0 0 20px rgba(194, 255, 0, 0.4)",
        "glow-violet": "0 0 20px rgba(139, 92, 246, 0.4)",
        "glow-lime-lg": "0 0 40px rgba(194, 255, 0, 0.5)",
        "glow-violet-lg": "0 0 40px rgba(139, 92, 246, 0.5)",
        
        // Soft Shadows (minimal use)
        soft: "0 2px 15px -3px rgba(0, 0, 0, 0.3)",
      },
      
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      
      transitionDuration: {
        fast: "150ms",
        DEFAULT: "200ms",
        slow: "300ms",
      },
      
      transitionTimingFunction: {
        brutal: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
