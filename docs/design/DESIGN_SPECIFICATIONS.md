# Ear-Plug Web Design Specifications

## Overview

**Status:** Active (updated March 1, 2026)  
**Scope:** `apps/web` only (mobile intentionally out of scope)  
**Design Direction:** Utilitarian mobile-first shell with live music energy

Ear-Plug web uses a neutral, information-dense UI system where photography and content carry the emotional tone, while the chrome stays functional and quiet.

---

## Design Contract (Non-Negotiable)

1. Neutral shell only for page chrome:
   - Use semantic tokens (`background`, `card`, `muted`, `border`, `foreground`, `muted-foreground`).
   - Do not use legacy `night`, `lime`, `violet` utility classes.
2. Accent semantics by intent only:
   - Fan interactions: blue (`fan`).
   - Band interactions: purple (`band`).
   - Likes/hearts: red (`like`).
   - Confirmation/success: green (`success`).
3. Hybrid genre-color rule:
   - Operational UI chips use role colors.
   - Genre rainbow colors are limited to analytics/data-rich contexts.
4. Typography defaults are dense and readable:
   - Body text mainly `text-xs` and `text-sm`.
   - Uppercase/tracking only for micro labels.
5. Motion and elevation are subtle:
   - No glow/brutalist effects.
   - Minimal shadows and restrained transitions.

---

## Color System

### Semantic Token Model

Primary shell colors are monochrome OKLCH tokens defined in [apps/web/src/app/globals.css](/Users/lfpmb/Documents/ear-plug/apps/web/src/app/globals.css).

#### Light Tokens

| Token | Value |
|---|---|
| `--background` | `0.985 0 0` |
| `--foreground` | `0.205 0 0` |
| `--card` | `0.995 0 0` |
| `--muted` | `0.96 0 0` |
| `--muted-foreground` | `0.5 0 0` |
| `--border` | `0.922 0 0` |

#### Dark Tokens

| Token | Value |
|---|---|
| `--background` | `0.14 0 0` |
| `--foreground` | `0.94 0 0` |
| `--card` | `0.18 0 0` |
| `--muted` | `0.24 0 0` |
| `--muted-foreground` | `0.72 0 0` |
| `--border` | `0.3 0 0` |

### Role and Semantic Accents

| Accent | Token/Class | Hex | Usage |
|---|---|---|---|
| Fan | `fan` / `text-fan` / `bg-fan` | `#2563eb` | Fan tabs, filters, RSVP-intent controls |
| Band | `band` / `text-band` / `bg-band` | `#7c3aed` | Band workspace actions and active states |
| Like | `like` | `#ef4444` | Hearts/favorites |
| Success | `success` | `#16a34a` | Confirmed and completion states |

Tailwind token source is [packages/tailwind-config/base.js](/Users/lfpmb/Documents/ear-plug/packages/tailwind-config/base.js).

---

## Typography

### Font Families

| Role | Font |
|---|---|
| UI + body | Geist Sans |
| Secondary serif | Source Serif 4 |

Font setup is defined in [apps/web/src/app/layout.tsx](/Users/lfpmb/Documents/ear-plug/apps/web/src/app/layout.tsx).

### Type Behavior

1. Default text density: `text-xs` / `text-sm`.
2. Headings: restrained (`font-medium`/`font-semibold`), not poster-style.
3. Uppercase and heavy tracking are reserved for micro labels only.

---

## Spacing, Radius, Borders, Shadows

| Property | Standard |
|---|---|
| Global radius | `--radius: 0.625rem` |
| Border style | Soft monochrome borders (`border-border`) |
| Elevation | Minimal (`shadow-soft`, subtle only) |
| Touch targets | >= 44px (`touch-target`) |

---

## App Shell and Navigation

### Shell Pattern

1. Fixed bottom navigation.
2. Scrollable content region.
3. Mobile-first structure that remains readable on desktop widths.

Shell/navigation references:
- [apps/web/src/app/(app)/layout.tsx](/Users/lfpmb/Documents/ear-plug/apps/web/src/app/(app)/layout.tsx)
- [apps/web/src/components/navigation/BottomNav.tsx](/Users/lfpmb/Documents/ear-plug/apps/web/src/components/navigation/BottomNav.tsx)

### Navigation Labels

#### Fan
- `Discover`
- `Calendar`
- `Alerts`
- `Profile`

#### Band
- `Dashboard`
- `Shows`
- `Analytics`
- `Inbox`
- `Profile`

### Active Color Behavior

- Fan active tab/action: `fan`.
- Band active tab/action: `band`.

---

## Onboarding and Auth

Onboarding intentionally departs from the utilitarian shell with cinematic entry visuals:

1. Full-screen looping local video.
2. Dark overlay (`bg-black/60`).
3. Frosted auth container/input styling.
4. Centered `EAR-PLUG` title treatment.
5. Fallback order: video -> poster image -> gradient fallback.

References:
- [apps/web/src/components/onboarding/OnboardingFlow.tsx](/Users/lfpmb/Documents/ear-plug/apps/web/src/components/onboarding/OnboardingFlow.tsx)
- [apps/web/public/media/onboarding-loop.mp4](/Users/lfpmb/Documents/ear-plug/apps/web/public/media/onboarding-loop.mp4)
- [apps/web/public/media/onboarding-poster.jpg](/Users/lfpmb/Documents/ear-plug/apps/web/public/media/onboarding-poster.jpg)

---

## Component Standards

### Shared Role Contracts

- `RoleTone = "fan" | "band"`
- `ColorStrategy = "role" | "genre"`

Source: [apps/web/src/lib/ui/roleTone.ts](/Users/lfpmb/Documents/ear-plug/apps/web/src/lib/ui/roleTone.ts)

### Event and Filter Primitives

1. `EventCard` supports `tone` and `density` variants.
2. `GenreFilter` supports `tone` + `colorStrategy` (hybrid genre rule).
3. `DistanceSlider` supports `tone` for role-aware accent behavior.

Sources:
- [apps/web/src/components/events/EventCard.tsx](/Users/lfpmb/Documents/ear-plug/apps/web/src/components/events/EventCard.tsx)
- [apps/web/src/components/ui/GenreFilter.tsx](/Users/lfpmb/Documents/ear-plug/apps/web/src/components/ui/GenreFilter.tsx)
- [apps/web/src/components/ui/DistanceSlider.tsx](/Users/lfpmb/Documents/ear-plug/apps/web/src/components/ui/DistanceSlider.tsx)

---

## Map Surface Status

Map behavior remains functional and currently uses the existing map implementation after rollback of the latest map redesign changes.

Current map references:
- [apps/web/src/components/fan/MapView.tsx](/Users/lfpmb/Documents/ear-plug/apps/web/src/components/fan/MapView.tsx)
- [apps/web/src/components/maps/MapInfoWindow.tsx](/Users/lfpmb/Documents/ear-plug/apps/web/src/components/maps/MapInfoWindow.tsx)

If map redesign work resumes, it must still follow this document’s neutral-shell and role-accent rules.

---

## Theme Behavior

1. Light mode is default on first load.
2. Theme toggle persists selection in local storage.
3. Dark mode preserves hierarchy and role semantics.

Reference:
- [apps/web/src/components/ui/ThemeToggle.tsx](/Users/lfpmb/Documents/ear-plug/apps/web/src/components/ui/ThemeToggle.tsx)

---

## Clerk Appearance

Clerk surfaces are styled to match the neutral shell, with role-safe primary accents.

Reference:
- [apps/web/src/app/providers.tsx](/Users/lfpmb/Documents/ear-plug/apps/web/src/app/providers.tsx)

---

## Motion and Interaction

1. Keep animation subtle and functional.
2. Avoid decorative pulse/glow patterns outside true state signaling.
3. Maintain fast, readable transition timing.

---

## Accessibility and Readability

1. Maintain AA-appropriate contrast for key text and controls.
2. Keep dense layouts legible at mobile sizes.
3. Preserve touch targets >= 44px.
4. Use semantic focus states and visible outlines.

---

## Consistency Guardrails

Automated design checks are required to prevent regression.

### Script

- [apps/web/scripts/check-design-consistency.mjs](/Users/lfpmb/Documents/ear-plug/apps/web/scripts/check-design-consistency.mjs)
- [apps/web/scripts/design-consistency.allowlist.json](/Users/lfpmb/Documents/ear-plug/apps/web/scripts/design-consistency.allowlist.json)

### Enforced Fail Conditions

1. Legacy class usage (`bg-night*`, `text-night`, `lime`, `violet` utility classes).
2. Forbidden effects (`glow`, `shadow-brutal`, legacy pulse/progress classes).
3. Typography noise (`uppercase`, `font-black`, heavy tracking) outside allowlist.

### Commands

Run from repo root:

```bash
pnpm --filter @ear-plug/web design:check
pnpm --filter @ear-plug/web check
pnpm --filter @ear-plug/web build
```

---

## Decision Log

1. Web-first redesign is the active scope.
2. Mobile redesign is deferred.
3. No backend schema/API contract changes are required for this design system.
4. IA updates are limited to label cleanup and readability improvements.
