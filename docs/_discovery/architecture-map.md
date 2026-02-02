# Ear-Plug Architecture Map

## Overview

Ear-Plug is a "Listen Local" platform connecting Bay Area live music fans with musicians and bands. The architecture follows a monorepo structure using Turborepo, with a Next.js web app, Expo mobile app, and Convex serverless backend.

---

## Module Structure

### Root Level (`/`)

| File/Directory | Purpose |
|----------------|---------|
| `package.json` | Root workspace configuration, pnpm 9.0, Node 20+, Turborepo scripts |
| `turbo.json` | Turborepo task configuration for build, dev, lint, typecheck |
| `convex/` | Convex backend (schema, queries, mutations) - shared across apps |

### Apps

#### `apps/web/` - Next.js 14 Web Application

**Purpose:** Primary web interface for fans and musicians

| Directory | Purpose |
|-----------|---------|
| `src/app/` | Next.js App Router pages and layouts |
| `src/app/(app)/` | Protected app routes (home, calendar, messages, profile, gig) |
| `src/components/` | React components organized by feature |
| `src/hooks/` | Custom React hooks wrapping Convex queries/mutations |
| `src/lib/` | Utility functions (cn, tailwind-merge) |
| `middleware.ts` | Clerk authentication middleware |

**Key Dependencies:**
- `@clerk/nextjs` - Authentication
- `@vis.gl/react-google-maps` - Google Maps integration
- `convex` - Real-time database
- `lucide-react` - Icons
- `recharts` - Analytics charts
- `tailwind-merge`, `clsx` - Styling utilities
- `zod` - Validation

#### `apps/mobile/` - Expo 51 Mobile Application

**Purpose:** Native iOS/Android app with Expo Router

| Directory | Purpose |
|-----------|---------|
| `app/` | Expo Router file-based routing |
| `app/(tabs)/` | Tab-based navigation (index, calendar, messages, profile) |
| `app/gig/[id].tsx` | Dynamic gig detail route |
| `app/onboarding.tsx` | User onboarding flow |
| `assets/fonts/` | Custom Inter font files |

**Key Dependencies:**
- `@clerk/clerk-expo` - Authentication with SecureStore token cache
- `expo-router` - File-based routing
- `react-native-maps` - Native maps
- `nativewind` v4 - Tailwind CSS for React Native
- `convex` - Real-time database

### Packages

#### `packages/shared/` - Shared Code Library

**Purpose:** Cross-platform types, validation schemas, constants, and utilities

| Export Path | Contents |
|-------------|----------|
| `.` / `./index` | All exports combined |
| `./types` | TypeScript interfaces and type definitions |
| `./validation` | Zod schemas for input validation |
| `./constants` | Genre options, navigation routes, formatting helpers |
| `./utils` | Utility functions (distance calculation, formatting) |

**Types Defined:**
- `UserRole`: `"fan" | "musician"`
- `Genre`: `"indie" | "rock" | "jazz" | "electronic" | "folk" | "pop" | "alternative"`
- `EventStatus`: `"confirmed" | "hold" | "available"`
- `OpenDateStatus`: `"open" | "pending" | "filled"`
- `ApplicationStatus`: `"pending" | "accepted" | "rejected"`
- Entity interfaces: `User`, `Band`, `Venue`, `Event`, `RSVP`, `Message`, `Notification`, etc.

**Validation Schemas:**
- `userProfileUpdateSchema` - Profile updates
- `bandCreateSchema` / `bandUpdateSchema` - Band management
- `eventCreateSchema` - Event creation
- `messageSendSchema` - Message sending
- `mapFilterSchema` - Map filtering options

**Utility Functions:**
- `calculateDistance()` - Haversine formula for geo distance
- `debounce()`, `throttle()` - Performance helpers
- `formatPrice()`, `formatEventDate()`, `getRelativeTime()` - Formatting
- `groupBy()`, `sortByDate()` - Data manipulation

#### `packages/tailwind-config/` - Design System

**Purpose:** Shared Tailwind CSS configuration (brutalist dark theme)

**Design Tokens:**
- Primary Color: Electric Lime `#C2FF00`
- Secondary Color: Vivid Violet `#8B5CF6`
- Background: Night `#0F0F0F`
- Fonts: Oswald (display), Geist/Inter (body)

**Custom Classes:**
- `shadow-brutal`, `shadow-glow-lime`, `shadow-glow-violet`
- `animate-pulse-lime`, `animate-pulse-violet`, `animate-shimmer`
- Surface colors: `surface-DEFAULT`, `surface-secondary`, `surface-tertiary`

---

## Convex Backend (`convex/`)

### Schema (`schema.ts`)

**13 Tables:**

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `users` | User profiles linked to Clerk | `by_clerk_id`, `by_email`, `by_role` |
| `bands` | Musician band profiles | `by_user`, `by_name` |
| `venues` | Bay Area venue information | `by_city`, `by_name` |
| `events` | Live music shows | `by_band`, `by_venue`, `by_date`, `by_status` |
| `rsvps` | User event RSVPs | `by_user`, `by_event`, `by_user_event` |
| `likes` | User event likes | `by_user`, `by_event`, `by_user_event` |
| `savedArtists` | Fan follows for bands | `by_user`, `by_band`, `by_user_band` |
| `savedVenues` | Fan saved venues | `by_user`, `by_venue`, `by_user_venue` |
| `conversations` | Band-venue messaging threads | `by_band`, `by_venue`, `by_band_venue` |
| `messages` | Individual messages | `by_conversation`, `by_sender`, `by_timestamp` |
| `notifications` | User notifications | `by_user`, `by_user_read`, `by_timestamp` |
| `openDates` | Venue booking opportunities | `by_venue`, `by_date`, `by_status`, `by_genre` |
| `applications` | Band applications to open dates | `by_band`, `by_open_date`, `by_band_open_date` |

### Backend Modules

| File | Purpose | Key Functions |
|------|---------|---------------|
| `users.ts` | User CRUD operations | `getCurrentUser`, `upsertUser`, `updateRole`, `updateProfile` |
| `bands.ts` | Band management | `getCurrentUserBand`, `getBandWithStats`, `create`, `update`, `getAnalytics` |
| `venues.ts` | Venue operations | `list`, `getNearby`, `getSuggested`, `getOpenDates`, `applyToOpenDate` |
| `events.ts` | Event management | `listUpcoming`, `listByGenre`, `listNearby`, `rsvp`, `toggleLike`, `create` |
| `messages.ts` | Messaging system | `getBandConversations`, `getConversationMessages`, `send`, `markAsRead` |
| `notifications.ts` | Notification system | `list`, `markAsRead`, `createNearbyEventNotifications` |
| `http.ts` | HTTP endpoints | Clerk webhook handler for user sync |
| `auth.config.ts` | Clerk JWT configuration | Provider domain setup |
| `seed.ts` | Database seeding | Sample data for development |
| `utils/geo.ts` | Geospatial utilities | `haversineDistance`, `coordinatesMatch` |

---

## Design Patterns

### 1. Custom Hooks Pattern

Custom hooks in `apps/web/src/hooks/` wrap Convex queries and mutations with a consistent interface:

```typescript
// Pattern: useCurrentUser.ts
export function useCurrentUser() {
  const user = useQuery(api.users.getCurrentUser);
  const updateRole = useMutation(api.users.updateRole);

  return {
    user,
    isLoading: user === undefined,
    isAuthenticated: user !== null,
    isFan: user?.role === "fan",
    isMusician: user?.role === "musician",
    setRole,
    updateProfile,
  };
}
```

**Hook Files:**
- `useUser.ts` - Current user state and mutations
- `useBand.ts` - Band management (useCurrentBand, useBandAnalytics, useSavedBands)
- `useEvents.ts` - Event queries (useEvents, useEvent, useUserEvents, useNearbyEvents)
- `useVenues.ts` - Venue operations (useVenues, useSuggestedVenues, useOpenDates)
- `useMessages.ts` - Messaging (useBandConversations, useConversation)
- `useNotifications.ts` - Notification state
- `useGeolocation.ts` - Browser geolocation API wrapper
- `useLocalStorage.ts` - Persistent role storage

### 2. Role-Based Rendering Pattern

Components check `user.role` to render appropriate UI:

```typescript
// apps/web/src/app/(app)/home/page.tsx
export default function HomePage() {
  const { isFan, isMusician } = useCurrentUser();

  if (isFan) {
    return <FanMapView />;      // Map-based discovery
  }
  return <BandDashboard />;      // Dashboard analytics
}
```

**Role-specific components:**
- Fan: `FanMapView`, `CalendarView`, `NotificationsView`, `ProfileView`
- Musician: `BandDashboard`, `BandCalendar`, `BandMessages`, `BandProfile`

### 3. Protected Routes Pattern

Clerk middleware protects authenticated routes:

```typescript
// apps/web/middleware.ts
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth().protect();
  }
});
```

**Public Routes:** `/`, `/sign-in`, `/sign-up`, `/sso-callback`
**Protected Routes:** `/(app)/*` - home, calendar, messages, profile, gig/[id]

### 4. Provider Composition Pattern

Both web and mobile apps compose providers for auth and real-time data:

```typescript
// apps/web/src/app/providers.tsx
export function Providers({ children }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### 5. Conditional Query Pattern (Skip)

Convex queries use `"skip"` to conditionally execute:

```typescript
const events = useQuery(
  api.events.listNearby,
  shouldQuery ? { latitude, longitude, radiusMiles } : "skip"
);
```

---

## Data Flow

### Authentication Flow

```
1. User lands on / (OnboardingFlow)
2. Selects role (fan/musician)
3. Role persisted to localStorage
4. Clerk SignIn/SignUp
5. On success -> /home
6. AppLayout auto-creates Convex user via upsertUser
7. If localStorage has role, updateRole is called
8. Real-time query takes over
```

### Event Discovery Flow (Fan)

```
1. FanMapView loads
2. useGeolocation requests browser location
3. useNearbyEvents queries events within radius
4. Events displayed on Google Map + list
5. User taps marker -> MapInfoWindow shows EventCard
6. User RSVPs -> events.rsvp mutation
7. Convex increments rsvpCount in real-time
```

### Event Creation Flow (Musician)

```
1. BandDashboard shows CreateGigModal
2. User selects venue via PlaceAutocomplete (Google Places)
3. events.createWithVenue mutation:
   - Checks if venue exists by coordinates
   - Creates venue if new
   - Creates event
   - Schedules notification for saved venue/band followers
```

### Messaging Flow

```
1. Band initiates via messages.startConversation
2. Creates/returns conversation between band and venue
3. messages.send adds message to conversation
4. Updates lastMessageAt and lastMessagePreview
5. Other party sees unread count update in real-time
6. markAsRead clears unread status
```

---

## External Integrations

### Clerk Authentication

| Platform | Package | Token Storage |
|----------|---------|---------------|
| Web | `@clerk/nextjs` | Browser cookies |
| Mobile | `@clerk/clerk-expo` | `expo-secure-store` |

**Configuration:**
- Web: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Mobile: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Backend: `convex/auth.config.ts` - JWT issuer domain

**Webhook:** `/clerk-webhook` endpoint syncs user creation to Convex

### Convex Real-Time Database

| Platform | Package | Usage |
|----------|---------|-------|
| Web/Mobile | `convex`, `convex/react-clerk` | Real-time queries and mutations |

**Configuration:**
- Web: `NEXT_PUBLIC_CONVEX_URL`
- Mobile: `EXPO_PUBLIC_CONVEX_URL`

### Google Maps

| Platform | Package | Usage |
|----------|---------|-------|
| Web | `@vis.gl/react-google-maps` | Map display, markers, info windows |
| Web | `use-places-autocomplete` | Venue search autocomplete |
| Mobile | `react-native-maps` | Native map component |

**Configuration:**
- Web: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Styling

| Platform | Library | Configuration |
|----------|---------|---------------|
| Web | Tailwind CSS 3.4 | Extends `@ear-plug/tailwind-config/base` |
| Mobile | NativeWind 4 | Tailwind for React Native |

---

## Component Architecture

### Web Component Organization (`apps/web/src/components/`)

```
components/
  band/
    AnalyticsReport.tsx      - Recharts analytics display
    BandCalendar.tsx         - Show calendar management
    BandDashboard.tsx        - Musician home dashboard
    BandMessages.tsx         - Messaging interface
    BandProfile.tsx          - Band profile display
    CreateBandForm.tsx       - New band creation
    CreateGigModal.tsx       - Event creation modal
    EditBandProfileModal.tsx - Profile editing
    MediaGallery.tsx         - Band media display
  events/
    EventCard.tsx            - Event display card (compact/full variants)
  fan/
    CalendarView.tsx         - Fan event calendar
    MapView.tsx              - Map-based discovery
    NotificationsView.tsx    - Notification center
    ProfileView.tsx          - Fan profile
  maps/
    MapInfoWindow.tsx        - Custom map info window
    PlaceAutocomplete.tsx    - Google Places search
  navigation/
    BottomNav.tsx            - Role-aware bottom navigation
  onboarding/
    OnboardingFlow.tsx       - Role selection + auth
  ui/
    CityAutocomplete.tsx     - City search input
    DistanceSlider.tsx       - Radius filter control
    EditProfileModal.tsx     - Profile editing modal
    GenreFilter.tsx          - Genre selection chips
    OptimizedImage.tsx       - Next.js Image wrapper
    Skeleton.tsx             - Loading skeletons
    ThemeToggle.tsx          - Theme switcher
```

### Mobile Route Organization (`apps/mobile/app/`)

```
app/
  _layout.tsx           - Root layout with providers
  onboarding.tsx        - Onboarding screen
  (tabs)/
    _layout.tsx         - Tab navigation layout
    index.tsx           - Home (map or dashboard)
    calendar.tsx        - Events calendar
    messages.tsx        - Notifications/messages
    profile.tsx         - User profile
  gig/
    [id].tsx            - Event detail screen
```

---

## Environment Variables

### Web (`apps/web/.env.local`)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_CONVEX_URL=https://....convex.cloud
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

### Mobile (`apps/mobile/.env`)
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_CONVEX_URL=https://....convex.cloud
```

---

## File Paths Reference

### Key Configuration Files
- `/package.json` - Root workspace
- `/turbo.json` - Turborepo tasks
- `/apps/web/package.json` - Web app dependencies
- `/apps/mobile/package.json` - Mobile app dependencies
- `/apps/web/tailwind.config.js` - Web Tailwind config
- `/apps/web/middleware.ts` - Clerk middleware
- `/convex/schema.ts` - Database schema
- `/convex/auth.config.ts` - Clerk JWT config
- `/packages/tailwind-config/base.js` - Shared design tokens

### Key Source Files
- `/apps/web/src/app/providers.tsx` - Provider composition
- `/apps/web/src/app/(app)/layout.tsx` - Protected layout with auto user creation
- `/apps/web/src/hooks/index.ts` - Hook exports
- `/apps/mobile/app/_layout.tsx` - Mobile root layout
- `/packages/shared/src/index.ts` - Shared exports
