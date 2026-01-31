# Ear-Plug Design Specifications

## Overview

**Design Style:** Electric Indie-Brutalist  
**Theme:** Dark mode, high contrast, street poster aesthetic  
**Primary Use Case:** Bay Area live music discovery platform for fans and musicians

This design system combines brutalist design principles (bold borders, offset shadows, raw aesthetics) with vibrant electric accents to create an energetic, music-focused experience that stands out.

---

## Color Palette

### Core Background Colors

| Token | Hex Value | Usage |
|-------|-----------|-------|
| `night` | `#0F0F0F` | Primary background |
| `night-secondary` | `#1A1A1A` | Card backgrounds, secondary surfaces |
| `night-tertiary` | `#252525` | Elevated surfaces, inputs |
| `surface-elevated` | `#2A2A2A` | Highest elevation surfaces |

### Primary Colors

| Token | Hex Value | Usage |
|-------|-----------|-------|
| `lime` | `#C2FF00` | Primary CTA, highlights, active states |
| `lime-dark` | `#9FD900` | Hover states, pressed states |
| `lime-glow` | `rgba(194, 255, 0, 0.4)` | Glow effects |

### Secondary Colors

| Token | Hex Value | Usage |
|-------|-----------|-------|
| `violet` | `#8B5CF6` | Secondary actions, user location, musician features |
| `violet-dark` | `#7C3AED` | Hover states |
| `violet-light` | `#A78BFA` | Light accents |
| `violet-glow` | `rgba(139, 92, 246, 0.4)` | Glow effects |

### Text Colors

| Token | Hex Value | Usage |
|-------|-----------|-------|
| `text-primary` | `#FFFFFF` | Headlines, primary text |
| `text-secondary` | `#A1A1AA` | Secondary text, descriptions |
| `text-muted` | `#71717A` | Tertiary text, placeholders |
| `text-disabled` | `#52525B` | Disabled states |

### Semantic Colors

| Token | Hex Value | Usage |
|-------|-----------|-------|
| `success` | `#22C55E` | Success states, confirmations |
| `success-dark` | `#16A34A` | Success hover |
| `warning` | `#F59E0B` | Warnings, alerts |
| `error` | `#EF4444` | Errors, destructive actions |

### CSS Variable Mapping

```css
:root {
  --background: 0 0% 6%;        /* #0F0F0F */
  --foreground: 0 0% 100%;       /* White */
  --card: 0 0% 10%;             /* #1A1A1A */
  --primary: 75 100% 50%;       /* Electric Lime */
  --secondary: 258 90% 66%;     /* Vivid Violet */
  --muted: 0 0% 15%;            /* #252525 */
  --border: 0 0% 20%;           /* #333333 */
  --ring: 75 100% 50%;          /* Electric Lime */
}
```

---

## Typography

### Font Families

| Role | Font | Fallback |
|------|------|----------|
| Display | Oswald | system-ui, sans-serif |
| Body | Inter (Geist) | system-ui, sans-serif |
| Condensed | Oswald | system-ui, sans-serif |

### Typography Scale

| Style | Font | Weight | Size | Line Height | Letter Spacing | Transform |
|-------|------|--------|------|-------------|----------------|-----------|
| Display | Oswald | 700 | 2.25rem (36px) | 0.95 | -0.02em | uppercase |
| Brutalist Title | Oswald | 700 | 1.5rem (24px) | 0.95 | -0.03em | uppercase |
| Heading | Inter | 700 | 1.25rem (20px) | 1.3 | -0.01em | none |
| Subheading | Inter | 600 | 1rem (16px) | 1.4 | 0 | none |
| Body | Inter | 400 | 1rem (16px) | 1.5 | 0 | none |
| Small | Inter | 500 | 0.875rem (14px) | 1.4 | 0 | none |
| Caption | Inter | 500 | 0.75rem (12px) | 1.3 | 0.05em | uppercase |
| Label | Inter | 700 | 0.625rem (10px) | 1.2 | 0.1em | uppercase |

### Typography Utilities

```css
.font-display {
  font-family: var(--font-oswald), var(--font-geist), system-ui, sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.02em;
}

.brutalist-title {
  font-family: var(--font-oswald), var(--font-geist), sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.03em;
  line-height: 0.95;
}
```

---

## Spacing System

### Base Spacing (Tailwind)

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 0.25rem (4px) | Tight gaps |
| `space-2` | 0.5rem (8px) | Small gaps |
| `space-3` | 0.75rem (12px) | Standard gaps |
| `space-4` | 1rem (16px) | Default padding |
| `space-6` | 1.5rem (24px) | Section padding |
| `space-8` | 2rem (32px) | Large sections |

### Custom Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `spacing-18` | 4.5rem (72px) | Navigation height |
| `spacing-88` | 22rem (352px) | Modal widths |
| `spacing-128` | 32rem (512px) | Large containers |

### Touch Targets

| Size | Dimensions | Usage |
|------|------------|-------|
| Small | 36x36px | Compact buttons |
| Default | 44x44px | Standard touch targets (WCAG compliant) |
| Large | 48x48px | Primary actions |

---

## Components

### Buttons

#### Primary Button (Brutalist)

```css
.btn-brutalist {
  @apply px-6 py-3 font-bold uppercase tracking-wider text-sm;
  background-color: var(--electric-lime); /* #C2FF00 */
  color: #000000;
  border: 2px solid var(--electric-lime);
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-brutalist:hover {
  background-color: transparent;
  color: var(--electric-lime);
  box-shadow: 0 0 20px var(--electric-lime-glow);
}
```

#### Secondary Button (Violet)

```css
.btn-brutalist-secondary {
  @apply px-6 py-3 font-bold uppercase tracking-wider text-sm;
  background-color: var(--vivid-violet);
  color: #FFFFFF;
  border: 2px solid var(--vivid-violet);
}

.btn-brutalist-secondary:hover {
  background-color: transparent;
  color: var(--vivid-violet);
  box-shadow: 0 0 20px var(--vivid-violet-glow);
}
```

### Cards

#### Brutalist Card

```css
.card-brutalist {
  background-color: var(--night-secondary); /* #1A1A1A */
  border: 2px solid var(--electric-lime);
  transition: all 200ms ease;
}

.card-brutalist:hover {
  box-shadow: 4px 4px 0px var(--electric-lime);
  transform: translate(-2px, -2px);
}
```

#### Glassmorphism Card

```css
.card-glass {
  background: rgba(26, 26, 26, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(194, 255, 0, 0.2);
}
```

#### Glassmorphism Violet Variant

```css
.card-glass-violet {
  background: rgba(26, 26, 26, 0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(139, 92, 246, 0.3);
}
```

### Form Elements

#### Input Fields

```css
input[type="text"] {
  @apply w-full px-4 py-3.5 bg-night-tertiary;
  border: 2px solid #333333;
  border-radius: 0;
  color: white;
  transition: border-color 200ms;
}

input[type="text"]:focus {
  outline: none;
  border-color: var(--electric-lime);
}

input::placeholder {
  color: #71717A;
}
```

#### iOS Input Zoom Fix

```css
@media screen and (max-width: 768px) {
  input, textarea, select {
    font-size: 16px; /* Prevents iOS zoom on focus */
  }
}
```

### Map Components

#### Event Marker (Default)

```css
.map-pin {
  width: 44px;
  height: 44px;
  background-color: var(--electric-lime);
  border: 2px solid #000000;
  border-radius: 50%;
  color: #000000;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.map-pin:hover {
  transform: scale(1.1);
  box-shadow: 0 0 20px var(--electric-lime-glow);
}
```

#### Active Event Marker

```css
.map-pin-active {
  background-color: var(--vivid-violet);
  color: #FFFFFF;
  border-color: var(--electric-lime);
  transform: scale(1.15);
}
```

#### User Location Marker

```css
.map-pin-user {
  width: 20px;
  height: 20px;
  background-color: var(--vivid-violet);
  border: 3px solid #FFFFFF;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.3);
}
```

---

## Shadow System

### Brutalist Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-brutal` | `4px 4px 0px #C2FF00` | Default brutalist offset |
| `shadow-brutal-violet` | `4px 4px 0px #8B5CF6` | Violet variant |
| `shadow-brutal-lg` | `6px 6px 0px #C2FF00` | Large offset |

### Glow Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-glow-lime` | `0 0 20px rgba(194, 255, 0, 0.4)` | Lime glow effect |
| `shadow-glow-violet` | `0 0 20px rgba(139, 92, 246, 0.4)` | Violet glow effect |
| `shadow-glow-lime-lg` | `0 0 40px rgba(194, 255, 0, 0.5)` | Large lime glow |
| `shadow-glow-violet-lg` | `0 0 40px rgba(139, 92, 246, 0.5)` | Large violet glow |

### Soft Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-soft` | `0 2px 15px -3px rgba(0, 0, 0, 0.3)` | Subtle elevation |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-none` | 0 | Brutalist elements |
| `rounded` | 0.25rem (4px) | Small elements |
| `rounded-lg` | 0.75rem (12px) | Cards, modals |
| `rounded-xl` | 1rem (16px) | Large cards |
| `rounded-2xl` | 1.5rem (24px) | Extra large elements |
| `rounded-full` | 50% | Circular elements |

---

## Animations

### Animation Timing

| Name | Duration | Easing | Usage |
|------|----------|--------|-------|
| `duration-fast` | 150ms | ease-out | Micro-interactions |
| `duration-default` | 200ms | ease | Standard transitions |
| `duration-slow` | 300ms | cubic-bezier(0.4, 0, 0.2, 1) | Complex transitions |

### Keyframe Animations

#### Fade In

```css
@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
```

#### Slide Up

```css
@keyframes slideUp {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
.animate-slide-up {
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
```

#### Scale In

```css
@keyframes scaleIn {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-scale-in {
  animation: scaleIn 0.2s ease-out forwards;
}
```

#### Pulse Lime

```css
@keyframes pulseLime {
  0%, 100% { box-shadow: 0 0 0 0 rgba(194, 255, 0, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(194, 255, 0, 0); }
}
.animate-pulse-lime {
  animation: pulseLime 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

#### Pulse Violet

```css
@keyframes pulseViolet {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(139, 92, 246, 0); }
}
.animate-pulse-violet {
  animation: pulseViolet 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

#### Float

```css
@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
  50% { transform: translateY(-20px) scale(1.1); opacity: 0.6; }
}
.animate-float {
  animation: float 4s ease-in-out infinite;
}
```

#### Shimmer (Loading)

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.animate-shimmer {
  background: linear-gradient(
    90deg,
    rgba(26, 26, 26, 1) 0%,
    rgba(37, 37, 37, 1) 50%,
    rgba(26, 26, 26, 1) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## Layout Patterns

### Safe Areas (Mobile)

```css
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-inset-top {
  padding-top: env(safe-area-inset-top);
}
```

### Scroll Behavior

```css
/* Hide scrollbar */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}
```

### Bottom Navigation

- **Height**: 64px (h-16)
- **Background**: `night-secondary` with 95% opacity + backdrop blur
- **Border**: 2px top border with `lime/20`
- **Active State**: Lime color with glow indicator
- **Badge**: Lime background, night text, positioned top-right

---

## Map Styling

### Google Maps Dark Theme

```javascript
const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#0F0F0F" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#A1A1AA" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0F0F0F" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#252525" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#71717A" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#A1A1AA" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#71717A" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1A1A1A" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#52525B" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#252525" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1A1A1A" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#71717A" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#333333" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1A1A1A" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#1A1A1A" }] },
];
```

---

## Accessibility

### Focus States

```css
/* Keyboard navigation */
:focus-visible {
  outline: 2px solid var(--electric-lime);
  outline-offset: 2px;
}

/* Remove outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Mobile Tap Highlight

```css
@media (hover: none) {
  button, a, [role="button"] {
    -webkit-tap-highlight-color: rgba(194, 255, 0, 0.1);
  }
}
```

### Selection Styling

```css
::selection {
  background-color: rgba(194, 255, 0, 0.3);
  color: #FFFFFF;
}
```

### Touch Target Requirements

- Minimum touch target size: **44x44px**
- Use `touch-target` utility class for compliance
- Provide adequate spacing between interactive elements

---

## Responsive Breakpoints

| Breakpoint | Width | Tailwind Prefix |
|------------|-------|-----------------|
| Mobile | < 640px | Default |
| Tablet | 640px - 1024px | `sm:`, `md:` |
| Desktop | > 1024px | `lg:`, `xl:` |

### Mobile-First Patterns

```css
/* Base (mobile) styles first */
.component {
  padding: 1rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .component {
    padding: 1.5rem;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .component {
    padding: 2rem;
  }
}
```

---

## Iconography

### Icon Library

- **Primary**: Lucide React (`lucide-react`)
- **Stroke Width**: 1.5px (default), 2px (emphasis)
- **Size**: 16px (sm), 20px (default), 24px (lg), 32px (xl)

### Icon Usage Patterns

| Context | Size | Stroke Width |
|---------|------|--------------|
| Inline text | 16px | 1.5px |
| Buttons | 20px | 1.5px |
| Navigation | 24px | 1.5px |
| Feature icons | 32px | 1.5px |

---

## Loading States

### Skeleton Patterns

- **Background**: `night-tertiary` (#252525)
- **Animation**: `animate-shimmer` (wave) or `animate-pulse`
- **Border**: 2px solid `zinc-800` for cards
- **Border Radius**: 0 (brutalist) or circular for avatars

### Progress Bars

```css
.progress-lime {
  background: linear-gradient(90deg, var(--electric-lime) 0%, var(--electric-lime-dark) 100%);
}

.progress-violet {
  background: linear-gradient(90deg, var(--vivid-violet) 0%, var(--vivid-violet-dark) 100%);
}
```

---

## Theme Configuration

### Tailwind Config Extension

```javascript
// tailwind.config.js
module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: "#0F0F0F",
          secondary: "#1A1A1A",
          tertiary: "#252525",
        },
        lime: {
          DEFAULT: "#C2FF00",
          dark: "#9FD900",
          glow: "rgba(194, 255, 0, 0.4)",
        },
        violet: {
          DEFAULT: "#8B5CF6",
          dark: "#7C3AED",
          glow: "rgba(139, 92, 246, 0.4)",
        },
      },
      fontFamily: {
        display: ["var(--font-oswald)", "system-ui", "sans-serif"],
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        brutal: "4px 4px 0px #C2FF00",
        "brutal-violet": "4px 4px 0px #8B5CF6",
        "glow-lime": "0 0 20px rgba(194, 255, 0, 0.4)",
        "glow-violet": "0 0 20px rgba(139, 92, 246, 0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "pulse-lime": "pulseLime 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-violet": "pulseViolet 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
};
```

---

## Design Principles

1. **Brutalist Aesthetic**: Bold 2px borders, square corners, offset shadows
2. **Electric Accents**: Lime (#C2FF00) for primary actions, Violet (#8B5CF6) for secondary
3. **Dark Mode Only**: Deep black backgrounds (#0F0F0F) with layered grays
4. **High Contrast**: White text on dark backgrounds, black text on lime
5. **Typography Hierarchy**: Bold condensed display fonts for headers, clean sans-serif for body
6. **Glow Effects**: Subtle colored glows on hover and active states
7. **Touch-First**: 44px minimum touch targets for mobile usability
8. **Street Poster Feel**: Uppercase tracking, bold weights, impactful visuals

---

## File Structure

```
/Ear-Plug
├── apps/web/src/
│   ├── app/
│   │   ├── globals.css          # Main CSS with design tokens
│   │   └── layout.tsx           # Font configuration
│   └── components/
│       ├── ui/                  # Shared UI components
│       ├── events/              # Event-specific components
│       ├── fan/                 # Fan view components
│       ├── band/                # Musician view components
│       ├── maps/                # Map components
│       ├── navigation/          # Navigation components
│       └── onboarding/          # Onboarding flow
├── packages/tailwind-config/
│   └── base.js                  # Shared Tailwind configuration
└── DESIGN_SPECIFICATIONS.md     # This document
```
