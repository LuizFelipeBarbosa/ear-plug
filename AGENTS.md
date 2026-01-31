# Ear-Plug - AI Agent Documentation

## Project Overview

Ear-Plug is a **"Listen Local"** dual-sided platform connecting the Bay Area live music ecosystem. It serves two distinct user groups:

- **Fans** - Discover local shows, follow bands, and engage with the music scene
- **Musicians/Bands** - Promote performances, find gig opportunities, and grow your fanbase

The project is a monorepo containing a Next.js web application, an Expo mobile application, and a Convex backend.

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Web Frontend** | Next.js 14+ (App Router), Tailwind CSS, TypeScript |
| **Mobile Frontend** | Expo (SDK 51), NativeWind, React Native, TypeScript |
| **Backend** | Convex (database, real-time, serverless functions) |
| **Authentication** | Clerk |
| **Maps** | Google Maps API |
| **Monorepo** | Turborepo + pnpm |
| **UI Components** | shadcn/ui-inspired design system |

## Project Structure

```
/Ear-Plug
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   │   ├── (app)/      # Authenticated routes
│   │   │   │   │   ├── home/
│   │   │   │   │   ├── calendar/
│   │   │   │   │   ├── messages/
│   │   │   │   │   ├── profile/
│   │   │   │   │   └── gig/[id]/
│   │   │   │   ├── sso-callback/
│   │   │   │   ├── globals.css
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx    # Onboarding entry
│   │   │   ├── components/
│   │   │   │   ├── band/       # Musician-specific components
│   │   │   │   ├── fan/        # Fan-specific components
│   │   │   │   ├── events/     # Event-related components
│   │   │   │   ├── navigation/ # Nav components
│   │   │   │   ├── onboarding/ # Onboarding flow
│   │   │   │   └── ui/         # Shared UI components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   └── lib/            # Utilities
│   │   ├── middleware.ts       # Clerk auth middleware
│   │   ├── next.config.js
│   │   └── package.json
│   └── mobile/                 # Expo mobile application
│       ├── app/                # Expo Router file-based routing
│       │   ├── (tabs)/         # Main tab screens
│       │   ├── gig/[id].tsx    # Event detail
│       │   ├── onboarding.tsx
│       │   └── _layout.tsx
│       ├── assets/
│       ├── global.css
│       └── package.json
├── packages/
│   ├── shared/                 # Shared types, validation, utilities
│   │   └── src/
│   │       ├── types/          # TypeScript interfaces
│   │       ├── validation/     # Zod schemas
│   │       ├── constants/      # App constants
│   │       └── utils/          # Helper functions
│   └── tailwind-config/        # Shared Tailwind design tokens
│       └── base.js
├── convex/                     # Convex backend
│   ├── schema.ts               # Database schema
│   ├── auth.config.ts          # Clerk auth config
│   ├── users.ts                # User queries/mutations
│   ├── bands.ts                # Band queries/mutations
│   ├── venues.ts               # Venue queries/mutations
│   ├── events.ts               # Event queries/mutations
│   ├── messages.ts             # Messaging queries/mutations
│   ├── notifications.ts        # Notification queries/mutations
│   ├── seed.ts                 # Database seeding
│   └── http.ts                 # HTTP actions
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # Workspace configuration
└── package.json                # Root package
```

## Build and Development Commands

### Root Level Commands (run from project root)

```bash
# Install dependencies
pnpm install

# Start all development servers (web + mobile + convex)
pnpm dev

# Start web only
pnpm dev:web

# Start mobile only
pnpm dev:mobile

# Start Convex backend
pnpm dev:convex          # or: npx convex dev

# Build commands
pnpm build               # Build all apps
pnpm build:web           # Build web only

# Quality checks
pnpm lint                # Run ESLint across all packages
pnpm typecheck           # Run TypeScript type checking
pnpm clean               # Clean build artifacts
```

### Convex Commands

```bash
# Initialize Convex (first time setup)
npx convex dev

# Deploy to production
npx convex deploy

# Seed the database with sample data
npx convex run seed:seedDatabase

# Clear seed data
npx convex run seed:clearDatabase
```

### Mobile Commands (run from apps/mobile/)

```bash
# Start Expo development server
pnpm dev                 # or: expo start

# Platform-specific
pnpm android             # Android emulator
pnpm ios                 # iOS simulator
pnpm web                 # Web preview
```

## Environment Variables

### Root `.env.local`
```env
CONVEX_DEPLOYMENT=dev:brilliant-cardinal-773
CONVEX_URL=https://brilliant-cardinal-773.convex.cloud
CONVEX_SITE_URL=https://brilliant-cardinal-773.convex.site
```

### Web App `apps/web/.env.local`
```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://brilliant-cardinal-773.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=https://premium-sheep-24.clerk.accounts.dev

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

### Mobile App `apps/mobile/.env.local`
```env
# Convex
EXPO_PUBLIC_CONVEX_URL=https://brilliant-cardinal-773.convex.cloud

# Clerk
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Google Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

## Database Schema

### Core Entities

| Entity | Description | Key Fields |
|--------|-------------|------------|
| `users` | Fan/Musician profiles | `clerkId`, `role`, `name`, `email`, `topGenres` |
| `bands` | Musician band profiles | `userId`, `name`, `genres`, `location`, `socialLinks` |
| `venues` | Bay Area music venues | `name`, `address`, `coordinates`, `capacity` |
| `events` | Shows and performances | `title`, `bandId`, `venueId`, `dateTime`, `genre`, `status` |
| `rsvps` | Event attendance tracking | `userId`, `eventId`, `createdAt` |
| `likes` | Saved events | `userId`, `eventId`, `createdAt` |
| `conversations` | Band-venue chat rooms | `bandId`, `venueId`, `lastMessageAt` |
| `messages` | Chat messages | `conversationId`, `senderId`, `content`, `read` |
| `notifications` | User notifications | `userId`, `type`, `title`, `content`, `read` |
| `openDates` | Venue booking opportunities | `venueId`, `date`, `offeredPay`, `genre`, `status` |
| `applications` | Band applications to open dates | `bandId`, `openDateId`, `status` |

### Type Definitions

TypeScript types are defined in `packages/shared/src/types/index.ts` and Zod validation schemas are in `packages/shared/src/validation/index.ts`.

### Genre Types
```typescript
type Genre = "indie" | "rock" | "jazz" | "electronic" | "folk" | "pop" | "alternative";
```

### Event Status Types
```typescript
type EventStatus = "confirmed" | "hold" | "available";
```

## Code Style Guidelines

### TypeScript
- Strict mode enabled
- Use explicit return types for exported functions
- Prefer interfaces over type aliases for objects
- Use `type` for unions and utility types

### Naming Conventions
- **Components**: PascalCase (e.g., `BandDashboard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useEvents.ts`)
- **Files**: PascalCase for components, camelCase for utilities
- **Database tables**: camelCase (e.g., `savedArtists`, `openDates`)
- **Convex functions**: camelCase (e.g., `getCurrentUser`, `listUpcoming`)

### Component Patterns

**Custom Hooks Pattern (apps/web/src/hooks/):**
```typescript
// Wrap Convex queries/mutations in custom hooks
export function useCurrentUser() {
  const user = useQuery(api.users.getCurrentUser);
  const updateRole = useMutation(api.users.updateRole);
  
  return {
    user,
    isLoading: user === undefined,
    // ... derived state
  };
}
```

**Page Layout Pattern:**
```typescript
// apps/web/src/app/(app)/layout.tsx
// Handles auth checks and renders BottomNav
```

### Styling
- Tailwind CSS for all styling
- Custom color palette in `packages/tailwind-config/base.js`
- Dark mode support via `dark:` variants
- CSS variables for theming (`--primary`, `--background`, etc.)

## Testing Strategy

**Note:** This project currently does not have automated tests configured. Testing is primarily manual.

For development testing:
1. Use the seed data (`npx convex run seed:seedDatabase`) for consistent test data
2. Test both fan and musician user flows
3. Verify mobile responsiveness using Chrome DevTools
4. Test on actual mobile devices via Expo Go app

## Security Considerations

### Authentication
- All routes under `/(app)/` are protected by Clerk middleware (`middleware.ts`)
- Public routes: `/`, `/sign-in`, `/sign-up`, `/sso-callback`
- Convex functions check `ctx.auth.getUserIdentity()` for authenticated requests

### Authorization Patterns
```typescript
// Always verify ownership in mutations
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

const user = await ctx.db
  .query("users")
  .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
  .unique();
```

### Environment Variables
- Never commit `.env.local` files (already in `.gitignore`)
- Use `NEXT_PUBLIC_` prefix only for variables needed in browser
- Use `EXPO_PUBLIC_` prefix for Expo environment variables

## Deployment

### Web (Vercel)
```bash
vercel deploy
```
- Connect GitHub repo for automatic deployments
- Set environment variables in Vercel dashboard

### Mobile (EAS - Expo Application Services)
```bash
cd apps/mobile
eas build          # Build native binaries
eas submit         # Submit to app stores
```

### Backend (Convex)
```bash
npx convex deploy
```
- Automatic deployments on git push (if configured)
- Database migrations are handled automatically

## Key Features

### Fan Features
- Map-based event discovery with Google Maps
- Search events by title, band, or venue
- Filter by genre (Indie, Rock, Jazz, Electronic, Folk, Pop, Alternative)
- Like and save events
- RSVP to events
- View RSVPs and liked events in calendar
- Notifications for event reminders and updates
- Profile with stats and saved artists/venues

### Musician/Band Features
- Dashboard with performance stats
- Calendar showing upcoming shows with status
- Messaging with venues for booking coordination
- Analytics report with charts
- Suggested venues based on genre
- Open dates browser to apply for gigs
- Fan/follower tracking

## Navigation Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | OnboardingFlow | Role selection + auth |
| `/home` | MapView / BandDashboard | Role-based home |
| `/calendar` | CalendarView / BandCalendar | Events list |
| `/messages` | NotificationsView / BandMessages | Role-based |
| `/profile` | ProfileView / BandProfile | Role-based |
| `/gig/[id]` | EventDetails | Event detail page |

## Dependencies Notes

- **Convex**: Real-time sync requires keeping the Convex client singleton
- **Clerk**: Web uses `@clerk/nextjs`, mobile uses `@clerk/clerk-expo`
- **Google Maps**: Web uses `@vis.gl/react-google-maps`, mobile uses `react-native-maps`
- **Tailwind**: Both web and mobile use NativeWind v4 for consistent styling

## Common Issues

1. **Convex types not generating**: Run `npx convex dev` to regenerate `_generated` folder
2. **Mobile build fails**: Ensure `EXPO_PUBLIC_` variables are set
3. **Auth redirect loops**: Check Clerk middleware matcher config
4. **Shared package changes not reflecting**: Restart dev server or run `pnpm build` in the shared package
