# Ear-Plug API Overview

This document provides an introduction to the Ear-Plug backend API, built on Convex serverless platform.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Real-Time Queries vs Mutations](#real-time-queries-vs-mutations)
4. [Authentication Requirements](#authentication-requirements)
5. [Error Handling Patterns](#error-handling-patterns)
6. [Usage with React Hooks](#usage-with-react-hooks)

---

## Introduction

Ear-Plug uses **Convex** as its serverless backend, providing real-time data synchronization between the server and clients (web and mobile). The API is organized into domain-specific modules:

| Module | Purpose | File |
|--------|---------|------|
| Users | User account management | `/convex/users.ts` |
| Bands | Band profiles and analytics | `/convex/bands.ts` |
| Venues | Venue listings and open dates | `/convex/venues.ts` |
| Events | Event CRUD and user interactions | `/convex/events.ts` |
| Messages | Conversation/messaging system | `/convex/messages.ts` |
| Notifications | User notification management | `/convex/notifications.ts` |
| HTTP | Webhook endpoints | `/convex/http.ts` |

---

## Architecture

### Data Flow

```
Clerk Auth -> Convex Backend (real-time) -> Web/Mobile Apps
                    |
         packages/shared (types + validation)
```

### Database Structure

Convex provides a document-oriented database with 13 tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts linked to Clerk |
| `bands` | Musician band profiles |
| `venues` | Bay Area venue locations |
| `events` | Live music shows |
| `rsvps` | User event attendance records |
| `likes` | User event interest records |
| `savedArtists` | Fans following bands |
| `savedVenues` | Users following venues |
| `conversations` | Band-venue messaging threads |
| `messages` | Individual messages |
| `notifications` | User notifications |
| `openDates` | Venue booking opportunities |
| `applications` | Band applications to open dates |

---

## Real-Time Queries vs Mutations

Convex distinguishes between two types of backend functions:

### Queries

- **Purpose**: Read data from the database
- **Reactivity**: Automatically re-run when underlying data changes
- **Caching**: Results are cached and shared across components
- **Side Effects**: Cannot modify data or call external APIs

```typescript
// Example: Real-time query that updates automatically
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const events = useQuery(api.events.listUpcoming, { limit: 10 });
// 'events' will automatically update when new events are created
```

### Mutations

- **Purpose**: Write data to the database
- **Execution**: Run once when called
- **Side Effects**: Can modify data, schedule functions, call external APIs
- **Atomicity**: All database operations within a mutation are atomic

```typescript
// Example: Mutation to RSVP to an event
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const rsvp = useMutation(api.events.rsvp);
await rsvp({ eventId: "..." });
```

### Conditional Queries

Convex queries can be conditionally skipped using the `"skip"` value:

```typescript
// Skip query until location is available
const events = useQuery(
  api.events.listNearby,
  latitude && longitude
    ? { latitude, longitude, radiusMiles: 25 }
    : "skip"
);
```

---

## Authentication Requirements

Ear-Plug uses Clerk for authentication, with JWTs validated by Convex.

### Authentication Levels

| Level | Description | Example |
|-------|-------------|---------|
| **Public** | No authentication required | `events.listUpcoming` |
| **Authenticated** | Requires valid JWT | `events.rsvp` |
| **Role-Specific** | Requires specific user role | `bands.getCurrentUserBand` (musician only) |

### Checking Authentication in Functions

```typescript
// Pattern used in all authenticated functions
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error("Not authenticated");
}

const user = await ctx.db
  .query("users")
  .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
  .unique();

if (!user) {
  throw new Error("User not found");
}
```

### Protected vs Unprotected Operations

**Mutations requiring authentication:**
- All user profile updates
- All band CRUD operations
- Event creation, RSVP, likes
- Message sending
- Notification management

**Queries with graceful degradation (return empty/null if unauthenticated):**
- `getCurrentUser` - returns `null`
- `getUserRsvps` - returns `[]`
- `getSavedBands` - returns `[]`
- `getBandConversations` - returns `[]`

---

## Error Handling Patterns

### Standard Error Messages

All mutations follow consistent error patterns:

| Error | Meaning |
|-------|---------|
| `"Not authenticated"` | No valid auth token in request |
| `"User not found"` | Clerk user exists but not in Convex DB |
| `"Band not found"` | Invalid band ID provided |
| `"Event not found"` | Invalid event ID provided |
| `"Notification not found"` | Invalid notification ID provided |
| `"Not authorized..."` | Ownership validation failed |
| `"Already applied..."` | Duplicate action prevented |
| `"User already has a band"` | User attempting to create second band |

### Error Handling in Client Code

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const createBand = useMutation(api.bands.create);

try {
  const bandId = await createBand({
    name: "My Band",
    genres: ["indie", "rock"],
    location: "San Francisco, CA",
  });
  console.log("Band created:", bandId);
} catch (error) {
  if (error.message === "Not authenticated") {
    // Redirect to login
  } else if (error.message === "User already has a band") {
    // Show error to user
  }
}
```

---

## Usage with React Hooks

Ear-Plug provides custom hooks in `apps/web/src/hooks/` that wrap Convex queries and mutations with convenient interfaces.

### Hook Pattern

```typescript
// apps/web/src/hooks/useUser.ts
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
    setRole: async (role: "fan" | "musician") => {
      await updateRole({ role });
    },
    updateProfile,
  };
}
```

### Using Hooks in Components

```typescript
import { useCurrentUser } from "@/hooks";

export function ProfilePage() {
  const { user, isLoading, isFan, isMusician } = useCurrentUser();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!user) {
    return <SignInPrompt />;
  }

  return isFan ? <FanProfile user={user} /> : <MusicianProfile user={user} />;
}
```

### Available Hooks

| Hook | Purpose |
|------|---------|
| `useCurrentUser` | Current user state and mutations |
| `useCurrentBand` | Current musician's band |
| `useBandAnalytics` | Band analytics data |
| `useEvents` | Event listings with filtering |
| `useEvent` | Single event with RSVP/like status |
| `useUserEvents` | User's RSVP'd and liked events |
| `useNearbyEvents` | Location-based event discovery |
| `useVenues` | Venue listings |
| `useOpenDates` | Open booking dates |
| `useBandConversations` | Messaging conversations |
| `useNotifications` | User notifications |
| `useGeolocation` | Browser geolocation wrapper |

---

## API Reference

For detailed documentation of each endpoint, see:

- [Authentication](./authentication.md)
- [Users API](./endpoints/users.md)
- [Bands API](./endpoints/bands.md)
- [Venues API](./endpoints/venues.md)
- [Events API](./endpoints/events.md)
- [Messages API](./endpoints/messages.md)
- [Notifications API](./endpoints/notifications.md)
- [Webhooks](./webhooks.md)
