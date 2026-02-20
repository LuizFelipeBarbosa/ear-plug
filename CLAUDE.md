# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ear-Plug is a "Listen Local" platform connecting Bay Area live music fans with musicians/bands. It's a Turborepo monorepo with a Next.js web app, Expo mobile app, and Convex serverless backend.

## Essential Commands

```bash
# Development (run from project root)
pnpm dev              # All dev servers (web + mobile + convex)
pnpm dev:web          # Web only at localhost:3000
pnpm dev:mobile       # Expo mobile
pnpm dev:convex       # Convex backend (or: npx convex dev)

# Build & Quality
pnpm build            # Build all apps
pnpm build:web        # Build web app only
pnpm lint             # ESLint across all packages
pnpm typecheck        # TypeScript checks
pnpm clean            # Clean build artifacts + node_modules

# Convex Backend
npx convex dev                    # Local development + type generation
npx convex deploy                 # Production deployment
npx convex run seed:seedDatabase  # Seed sample data
npx convex run seed:clearDatabase # Clear seed data
npx convex dashboard              # Open Convex dashboard

# Mobile (from apps/mobile/)
pnpm ios              # iOS simulator
pnpm android          # Android emulator
```

**No automated tests exist.** Quality checks are `pnpm lint` and `pnpm typecheck` only.

## Architecture

### Monorepo Structure
- `apps/web/` (`@ear-plug/web`) - Next.js 14 (App Router) with Clerk auth
- `apps/mobile/` (`@ear-plug/mobile`) - Expo 51 with Expo Router
- `packages/shared/` (`@ear-plug/shared`) - Types, Zod validation, constants shared across platforms
- `packages/tailwind-config/` (`@ear-plug/tailwind-config`) - Design system tokens
- `convex/` - Database schema, queries, mutations, HTTP actions (root level, not in apps/)

### Data Flow
```
Clerk Auth → Convex Backend (real-time) → Web/Mobile Apps
                    ↑
         packages/shared (types + validation)
```

User sync happens via a Clerk webhook → `convex/http.ts` → `internal.users.createUserFromClerk` mutation.

### Key Patterns

**Provider Stack** (`apps/web/src/app/providers.tsx`): ClerkProvider wraps ConvexProviderWithClerk, which provides authenticated real-time data to the entire app.

**Custom Hooks** (`apps/web/src/hooks/`): Wrap Convex queries/mutations. Available hooks: `useUser`, `useBand`, `useEvents`, `useSharedEvents`, `useVenues`, `useMessages`, `useNotifications`, `useGeolocation`, `useLocalStorage`.

**Role-Based Rendering**: Components check `user.role` ("fan" | "musician") to render entirely different UIs. Fans see map-based discovery; musicians see a band dashboard.

**Protected Routes**: Clerk middleware (`apps/web/middleware.ts`) protects all routes except: `/`, `/sign-in`, `/sign-up`, `/sso-callback`. Protected routes live under `apps/web/src/app/(app)/` with pages: `home`, `calendar`, `messages`, `profile`, `gig/[id]`.

### Component Organization (`apps/web/src/components/`)
- `band/` - Musician-specific (dashboard, calendar, messages, analytics)
- `fan/` - Fan-specific (map discovery, event cards, filters)
- `events/` - Shared event components
- `maps/` - Google Maps integration
- `onboarding/` - Role selection flow
- `navigation/` - Bottom nav, headers
- `ui/` - Reusable UI primitives

### Database (Convex)

13 tables defined in `convex/schema.ts`. Core entities:
- `users` - Clerk-linked profiles with role (fan/musician)
- `bands` - Musician band profiles with multi-genre support
- `venues` - Bay Area venues with coordinates
- `events` - Shows with status (confirmed/hold/available)
- `openDates` - Venue booking opportunities
- `applications` - Band applications to open dates
- `conversations/messages` - Band-venue messaging
- `rsvps/likes` - User engagement with events
- `savedArtists/savedVenues` - Fan follows
- `notifications` - Platform notifications

**Schema note**: `bands` and `events` tables have both a deprecated `genre` (single) field and a preferred `genres` (array) field. Always use the `genres` array for new code.

Genres: `indie | rock | jazz | electronic | folk | pop | alternative`

**Geo utilities** (`convex/utils/geo.ts`): Haversine distance calculation and coordinate matching for venue proximity features.

### Design System

Brutalist dark theme with:
- Primary: Electric Lime (#C2FF00)
- Secondary: Vivid Violet (#8B5CF6)
- Background: Night (#0F0F0F)

Typography: Oswald (display/headers), Inter (body). Note: Inter uses the CSS variable `--font-geist` for historical reasons.

## Platform-Specific Notes

**Web**: Uses `@clerk/nextjs`, `@vis.gl/react-google-maps`, `recharts` for analytics charts, `use-places-autocomplete` for venue search.

**Mobile**: Uses `@clerk/clerk-expo`, `react-native-maps`, NativeWind v4, `expo-secure-store` for token storage.

**Shared types**: Import from `@ear-plug/shared` (re-exports types, validation, constants, utils).

Environment variable prefixes:
- Web: `NEXT_PUBLIC_*`
- Mobile: `EXPO_PUBLIC_*`

## Deployment

Web deploys to **Netlify** (see `netlify.toml`). Build uses `pnpm install --ignore-scripts` to skip React Native postinstall scripts that require native tooling.

## Conventions

- Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat(scope):`, `fix(scope):`, `docs:`, `refactor:`, `chore:`
- Use `"use client"` directive for client components in Next.js
- Prefer named exports over default exports for components
- Convex functions validate inputs with `v` validators and check auth via `ctx.auth.getUserIdentity()`

## Common Issues

1. **Convex types not generating**: Run `npx convex dev` to regenerate `convex/_generated/`
2. **Shared package changes not reflecting**: Restart dev server or `pnpm build` in shared package
3. **Auth redirect loops**: Check Clerk middleware matcher in `apps/web/middleware.ts`
4. **Mobile build fails**: Ensure `EXPO_PUBLIC_*` variables are set; clear Metro cache with `npx expo start --clear`
