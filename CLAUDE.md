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
pnpm lint             # ESLint across all packages
pnpm typecheck        # TypeScript checks

# Convex Backend
npx convex dev                    # Local development + type generation
npx convex deploy                 # Production deployment
npx convex run seed:seedDatabase  # Seed sample data
npx convex run seed:clearDatabase # Clear seed data

# Mobile (from apps/mobile/)
pnpm ios              # iOS simulator
pnpm android          # Android emulator
```

## Architecture

### Monorepo Structure
- `apps/web/` - Next.js 14 (App Router) with Clerk auth
- `apps/mobile/` - Expo 51 with Expo Router
- `packages/shared/` - Types, Zod validation, constants shared across platforms
- `packages/tailwind-config/` - Design system tokens
- `convex/` - Database schema, queries, mutations (root level, not in apps/)

### Data Flow
```
Clerk Auth → Convex Backend (real-time) → Web/Mobile Apps
                    ↑
         packages/shared (types + validation)
```

### Key Patterns

**Custom Hooks (apps/web/src/hooks/)**: Wrap Convex queries/mutations
```typescript
export function useCurrentUser() {
  const user = useQuery(api.users.getCurrentUser);
  return { user, isLoading: user === undefined };
}
```

**Role-Based Rendering**: Components check `user.role` ("fan" | "musician") to render appropriate UI

**Protected Routes**: Clerk middleware protects `/(app)/*` routes. Public: `/`, `/sign-in`, `/sign-up`, `/sso-callback`

### Database (Convex)

13 tables defined in `convex/schema.ts`. Core entities:
- `users` - Clerk-linked profiles with role (fan/musician)
- `bands` - Musician band profiles with multi-genre support
- `venues` - Bay Area venues with coordinates
- `events` - Shows with status (confirmed/hold/available)
- `openDates` - Venue booking opportunities
- `applications` - Band applications to open dates
- `conversations/messages` - Band-venue messaging

Genres: `indie | rock | jazz | electronic | folk | pop | alternative`

### Design System

Brutalist dark theme with:
- Primary: Electric Lime (#C2FF00)
- Secondary: Vivid Violet (#8B5CF6)
- Background: Night (#0F0F0F)

Typography: Oswald (display), Geist/Inter (body)

## Platform-Specific Notes

**Web**: Uses `@clerk/nextjs`, `@vis.gl/react-google-maps`
**Mobile**: Uses `@clerk/clerk-expo`, `react-native-maps`, NativeWind v4

Environment variable prefixes:
- Web: `NEXT_PUBLIC_*`
- Mobile: `EXPO_PUBLIC_*`

## Common Issues

1. **Convex types not generating**: Run `npx convex dev` to regenerate `convex/_generated/`
2. **Shared package changes not reflecting**: Restart dev server or `pnpm build` in shared package
3. **Auth redirect loops**: Check Clerk middleware matcher in `apps/web/middleware.ts`
