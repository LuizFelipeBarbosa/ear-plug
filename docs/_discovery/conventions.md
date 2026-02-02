# Coding Conventions & Patterns

This document captures the coding conventions, naming patterns, and file organization used in the Ear-Plug codebase.

---

## File & Folder Organization

### Monorepo Structure

```
Ear-Plug/
├── apps/
│   ├── web/                    # Next.js 14 (App Router)
│   │   ├── src/
│   │   │   ├── app/           # Next.js App Router pages
│   │   │   │   ├── (app)/     # Protected route group
│   │   │   │   │   ├── home/
│   │   │   │   │   ├── calendar/
│   │   │   │   │   ├── messages/
│   │   │   │   │   ├── profile/
│   │   │   │   │   └── gig/[id]/
│   │   │   │   ├── sso-callback/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx   # Onboarding/landing
│   │   │   │   ├── providers.tsx
│   │   │   │   └── globals.css
│   │   │   ├── components/    # React components
│   │   │   │   ├── band/      # Band/musician-specific
│   │   │   │   ├── fan/       # Fan-specific
│   │   │   │   ├── events/    # Event-related
│   │   │   │   ├── maps/      # Google Maps components
│   │   │   │   ├── navigation/
│   │   │   │   ├── onboarding/
│   │   │   │   └── ui/        # Reusable UI primitives
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   └── lib/           # Utility functions
│   │   └── middleware.ts      # Clerk auth middleware
│   └── mobile/                # Expo 51 (Expo Router)
│       └── app/               # Expo Router pages
├── convex/                    # Convex backend (root level)
│   ├── _generated/            # Auto-generated types
│   ├── utils/                 # Backend utilities
│   ├── schema.ts              # Database schema
│   ├── users.ts               # User queries/mutations
│   ├── bands.ts
│   ├── events.ts
│   ├── venues.ts
│   ├── messages.ts
│   ├── notifications.ts
│   └── seed.ts               # Sample data seeding
└── packages/
    ├── shared/               # Cross-platform shared code
    │   └── src/
    │       ├── types/        # TypeScript types
    │       ├── constants/    # App constants
    │       ├── validation/   # Zod schemas
    │       └── utils/        # Shared utilities
    └── tailwind-config/      # Shared Tailwind config
        └── base.js
```

### Naming Conventions

#### Files & Directories

| Pattern | Example | Usage |
|---------|---------|-------|
| `camelCase.ts` | `useEvents.ts` | Hooks, utilities |
| `PascalCase.tsx` | `EventCard.tsx` | React components |
| `lowercase/` | `events/`, `band/` | Directories |
| `kebab-case/` | N/A (not used) | - |
| `[param]/` | `[id]/` | Dynamic route segments |
| `(group)/` | `(app)/` | Route groups |
| `_prefix` | `_generated/`, `_discovery/` | Internal/generated |

#### Component Naming

```typescript
// Component files: PascalCase
EventCard.tsx
BandDashboard.tsx
OnboardingFlow.tsx

// Component exports: Named exports matching filename
export function EventCard() { ... }
export function BandDashboard() { ... }
```

#### Hook Naming

```typescript
// Hook files: camelCase starting with "use"
useUser.ts
useEvents.ts
useBand.ts

// Hook exports: Named exports starting with "use"
export function useCurrentUser() { ... }
export function useEvent(eventId) { ... }
export function useNearbyEvents(options) { ... }
```

#### Convex Backend Naming

```typescript
// Query/mutation names: camelCase verbs
getCurrentUser     // queries that get current user's data
getById            // queries by ID
list               // list multiple records
listByGenre        // list with filter
listUpcoming       // list with time filter
search             // search queries

create             // mutations that create
update             // mutations that update
toggleSave         // mutations that toggle state
toggleLike
rsvp               // domain-specific actions

// Internal mutations: prefixed with "internal"
createUserFromClerk  // internalMutation for webhooks
```

---

## TypeScript Conventions

### Type Definitions

Types are centralized in `packages/shared/src/types/index.ts`:

```typescript
// String literal unions for enums (not TypeScript enums)
export type UserRole = "fan" | "musician";
export type Genre = "indie" | "rock" | "jazz" | "electronic" | "folk" | "pop" | "alternative";
export type EventStatus = "confirmed" | "hold" | "available";

// Interfaces for entities
export interface User extends BaseEntity {
  clerkId: string;
  role: UserRole;
  name: string;
  // ...
}

// Composite types for API responses
export interface EventWithDetails extends Event {
  band: Band | null;
  venue: Venue | null;
}
```

### Convex Validators

Validators mirror TypeScript types using Convex's `v` validator:

```typescript
// In convex/*.ts files
const genreValidator = v.union(
  v.literal("indie"),
  v.literal("rock"),
  v.literal("jazz"),
  v.literal("electronic"),
  v.literal("folk"),
  v.literal("pop"),
  v.literal("alternative")
);

const userRoleValidator = v.union(v.literal("fan"), v.literal("musician"));
```

### Zod Validation

Client-side validation in `packages/shared/src/validation/index.ts`:

```typescript
export const genreSchema = z.enum([
  "indie", "rock", "jazz", "electronic", "folk", "pop", "alternative"
]);

export const bandCreateSchema = z.object({
  name: z.string().min(1).max(100),
  genres: z.array(genreSchema).min(1).max(5),
  location: z.string().min(1).max(200),
  // ...
});

// Infer types from schemas
export type BandCreateInput = z.infer<typeof bandCreateSchema>;
```

---

## Hook Patterns

### Query Hooks Pattern

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useCurrentUser() {
  const user = useQuery(api.users.getCurrentUser);
  const updateRole = useMutation(api.users.updateRole);
  const updateProfile = useMutation(api.users.updateProfile);

  return {
    user,
    isLoading: user === undefined,
    isAuthenticated: user !== null,
    isFan: user?.role === "fan",
    isMusician: user?.role === "musician",
    setRole: async (role) => updateRole({ role }),
    updateProfile,
  };
}
```

### Conditional Query Pattern

Using `"skip"` to conditionally skip queries:

```typescript
export function useEvent(eventId: Id<"events"> | undefined) {
  const event = useQuery(
    api.events.getById,
    eventId ? { eventId } : "skip"
  );

  return {
    event,
    isLoading: event === undefined,
  };
}
```

### Combined Hooks Pattern

Hooks that combine multiple queries with related mutations:

```typescript
export function useUserEvents() {
  const rsvps = useQuery(api.events.getUserRsvps);
  const likes = useQuery(api.events.getUserLikes);
  const pastRsvps = useQuery(api.events.getUserPastRsvps);

  return {
    rsvps: rsvps ?? [],
    likes: likes ?? [],
    pastRsvps: pastRsvps ?? [],
    isLoading: rsvps === undefined || likes === undefined || pastRsvps === undefined,
  };
}
```

---

## Component Patterns

### Client Components

All interactive components use `"use client"` directive:

```typescript
"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/useUser";

export function HomePage() {
  const { user, isFan, isLoading } = useCurrentUser();
  // ...
}
```

### Role-Based Rendering

Components render different UI based on user role:

```typescript
export default function HomePage() {
  const { isFan, isLoading } = useCurrentUser();

  if (isLoading) {
    return <LoadingState />;
  }

  if (isFan) {
    return <FanMapView />;
  }

  return <BandDashboard />;
}
```

### Loading States

Pattern for loading indicators:

```typescript
if (isLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-night">
      <div className="animate-pulse">
        <div className="w-12 h-12 bg-lime animate-pulse-lime" />
      </div>
    </div>
  );
}
```

### Event Handlers with Async

```typescript
const handleRsvpClick = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  await rsvp({ eventId: event._id });
};
```

---

## Convex Backend Patterns

### Authentication Pattern

Every authenticated query/mutation follows this pattern:

```typescript
export const someQuery = query({
  args: { ... },
  handler: async (ctx, args) => {
    // 1. Get identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null; // or []
    }

    // 2. Look up user in database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // 3. Proceed with authorized logic
    // ...
  },
});
```

### Mutations with Validation

```typescript
export const create = mutation({
  args: {
    title: v.string(),
    bandId: v.id("bands"),
    venueId: v.id("venues"),
    // ...
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify ownership
    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    // Check authorization
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || band.userId !== user._id) {
      throw new Error("Not authorized");
    }

    // Create record
    return await ctx.db.insert("events", { ... });
  },
});
```

### Query with Related Data

Pattern for fetching entities with their relations:

```typescript
export const listUpcoming = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("dateTime"), Date.now()))
      .take(args.limit || 50);

    // Enrich with related data
    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);
        return { ...event, band, venue };
      })
    );

    return eventsWithDetails;
  },
});
```

### Internal Mutations

For webhook handlers and scheduled jobs:

```typescript
export const createUserFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // No auth check needed - called internally
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      return existingUser._id;
    }

    return await ctx.db.insert("users", { ... });
  },
});
```

---

## Import Conventions

### Path Aliases

```typescript
// Web app uses @/ alias for src/
import { useCurrentUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

// Shared package imports
import type { Genre, UserRole } from "@ear-plug/shared/types";
import { formatEventDate, GENRES } from "@ear-plug/shared/constants";

// Convex imports (relative paths from web)
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
```

### Import Order

1. React/framework imports
2. Third-party libraries
3. Internal modules (@/ aliases)
4. Shared package imports
5. Convex imports
6. Types (using `import type`)
7. Relative imports

```typescript
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Calendar } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { formatEventDate } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";
```

---

## CSS & Styling Conventions

### Tailwind with cn() Utility

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "flex items-center gap-4",
  "bg-night-tertiary border border-zinc-800",
  isPast && "opacity-75",
  isActive && "border-lime"
)} />
```

### Design System Classes

Custom utility classes defined in globals.css:

```css
/* Brutalist buttons */
.btn-brutalist { ... }
.btn-brutalist-secondary { ... }

/* Cards */
.card-brutalist { ... }
.card-glass { ... }

/* Map pins */
.map-pin { ... }
.map-pin-active { ... }

/* Animations */
.animate-pulse-lime { ... }
.animate-slide-up { ... }

/* Touch targets (WCAG 44px) */
.touch-target { ... }
```

### Color Naming

| Semantic Name | CSS Variable | Hex Value |
|--------------|--------------|-----------|
| Night (background) | `--night` | `#0F0F0F` |
| Night Secondary | `--night-secondary` | `#1A1A1A` |
| Night Tertiary | `--night-tertiary` | `#252525` |
| Electric Lime | `--electric-lime` | `#C2FF00` |
| Vivid Violet | `--vivid-violet` | `#8B5CF6` |

---

## Error Handling

### Convex Error Pattern

```typescript
// Throw descriptive errors in mutations
if (!identity) {
  throw new Error("Not authenticated");
}

if (!user) {
  throw new Error("User not found");
}

if (!band || band.userId !== user._id) {
  throw new Error("Not authorized to update this band");
}
```

### Client-Side Error Handling

```typescript
const handleApply = async (openDateId: string) => {
  setApplyingTo(openDateId);
  try {
    await applyToOpenDate({ ... });
  } catch (err) {
    console.error("Failed to apply:", err);
  } finally {
    setApplyingTo(null);
  }
};
```

---

## Database Indexing Conventions

Indexes follow the pattern `by_<field_name>`:

```typescript
// Single field indexes
.index("by_clerk_id", ["clerkId"])
.index("by_email", ["email"])
.index("by_date", ["dateTime"])
.index("by_status", ["status"])

// Compound indexes
.index("by_user_event", ["userId", "eventId"])
.index("by_band_venue", ["bandId", "venueId"])
.index("by_user_read", ["userId", "read"])
```
