# Authentication

This document details how authentication works in the Ear-Plug application using Clerk and Convex.

---

## Table of Contents

1. [Overview](#overview)
2. [Clerk Configuration](#clerk-configuration)
3. [Convex JWT Configuration](#convex-jwt-configuration)
4. [Authentication Flow](#authentication-flow)
5. [Permission Model](#permission-model)
6. [Client-Side Setup](#client-side-setup)
7. [Backend Authentication Patterns](#backend-authentication-patterns)

---

## Overview

Ear-Plug uses **Clerk** for user authentication across web and mobile platforms. Clerk handles:

- User sign-up and sign-in (email, OAuth providers)
- Session management
- JWT token generation
- User profile management

**Convex** validates Clerk-issued JWTs and provides the authenticated user context to backend functions.

---

## Clerk Configuration

### Web Application

**Package:** `@clerk/nextjs`

**Environment Variables:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

**Middleware Configuration:** `/apps/web/middleware.ts`
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### Mobile Application

**Package:** `@clerk/clerk-expo`

**Environment Variables:**
```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```

**Token Cache:** Uses `expo-secure-store` for secure token storage.

---

## Convex JWT Configuration

**File:** `/convex/auth.config.ts`

```typescript
export default {
  providers: [
    {
      domain: "https://premium-sheep-24.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

### Configuration Fields

| Field | Description |
|-------|-------------|
| `domain` | Clerk JWT issuer domain (matches your Clerk application) |
| `applicationID` | Application identifier in JWT audience claim |

---

## Authentication Flow

### Initial Sign-Up/Sign-In

```
1. User lands on / (OnboardingFlow)
2. User selects role (fan/musician)
3. Role persisted to localStorage temporarily
4. Clerk SignIn/SignUp flow
5. On success -> redirect to /home
6. AppLayout auto-creates Convex user via upsertUser mutation
7. If localStorage has role, updateRole mutation is called
8. Real-time queries take over for subsequent data fetching
```

### JWT Token Flow

```
1. User authenticates with Clerk
2. Clerk issues JWT with user's subject (Clerk ID)
3. Client includes JWT in Convex requests (automatic)
4. Convex validates JWT against auth.config.ts
5. Backend functions access identity via ctx.auth.getUserIdentity()
```

### Webhook Synchronization

When a user is created or updated in Clerk, a webhook notifies Convex:

```
1. User created/updated in Clerk
2. Clerk sends POST to /clerk-webhook
3. http.ts handler processes event
4. users.createUserFromClerk internal mutation creates/updates user
```

---

## Permission Model

### User Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| `fan` | Music fan | Discover events, RSVP, like, save bands/venues |
| `musician` | Band member/owner | All fan capabilities + create bands, create events, manage bookings, messaging |

### Access Levels

#### Public (No Authentication)

These queries work without authentication:

| Query | Behavior |
|-------|----------|
| `events.listUpcoming` | Returns all upcoming events |
| `events.listByGenre` | Returns events filtered by genre |
| `events.getById` | Returns event details |
| `bands.list` | Returns all bands |
| `bands.search` | Returns bands matching search |
| `venues.list` | Returns all venues |
| `venues.search` | Returns venues matching search |

#### Graceful Degradation

These queries return empty results for unauthenticated users:

| Query | Unauthenticated | Authenticated |
|-------|-----------------|---------------|
| `users.getCurrentUser` | `null` | User object |
| `events.getUserRsvps` | `[]` | User's RSVP'd events |
| `events.getUserLikes` | `[]` | User's liked events |
| `bands.getSavedBands` | `[]` | User's saved bands |
| `venues.getSavedVenues` | `[]` | User's saved venues |
| `messages.getBandConversations` | `[]` | Band's conversations |
| `notifications.list` | `[]` | User's notifications |

#### Authentication Required

These mutations throw `"Not authenticated"` if called without valid JWT:

| Mutation | Required Role |
|----------|---------------|
| `users.updateRole` | Any authenticated |
| `users.updateProfile` | Any authenticated |
| `events.rsvp` | Any authenticated |
| `events.toggleLike` | Any authenticated |
| `bands.toggleSave` | Any authenticated |
| `venues.toggleSave` | Any authenticated |
| `notifications.markAsRead` | Any authenticated |

#### Ownership Validation

These mutations validate the user owns the resource:

| Mutation | Validation |
|----------|------------|
| `bands.create` | User doesn't already have a band |
| `bands.update` | User owns the band |
| `events.create` | User owns the band |
| `events.createWithVenue` | User owns the band |
| `venues.applyToOpenDate` | User owns the band |

---

## Client-Side Setup

### Web Application Provider

**File:** `/apps/web/src/app/providers.tsx`

```typescript
"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### Mobile Application Provider

**File:** `/apps/mobile/app/_layout.tsx`

```typescript
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string
);

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <Slot />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

---

## Backend Authentication Patterns

### Standard Authentication Check

Used in all authenticated mutations:

```typescript
export const updateProfile = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // 1. Get the user's identity from JWT
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // 2. Look up the user in the database by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // 3. Proceed with the operation
    await ctx.db.patch(user._id, { /* ... */ });
    return user._id;
  },
});
```

### Role-Based Access

For musician-only features:

```typescript
export const getCurrentUserBand = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // Check role
    if (!user || user.role !== "musician") {
      return null;
    }

    // Proceed with musician-specific logic
    const band = await ctx.db
      .query("bands")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return band;
  },
});
```

### Ownership Validation

For operations on owned resources:

```typescript
export const update = mutation({
  args: {
    bandId: v.id("bands"),
    name: v.optional(v.string()),
    // ...
  },
  handler: async (ctx, args) => {
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

    // Verify ownership
    const band = await ctx.db.get(args.bandId);
    if (!band || band.userId !== user._id) {
      throw new Error("Not authorized to update this band");
    }

    // Proceed with update
    await ctx.db.patch(args.bandId, { /* ... */ });
    return args.bandId;
  },
});
```

### Identity Properties

The `identity` object from `ctx.auth.getUserIdentity()` contains:

| Property | Description |
|----------|-------------|
| `subject` | Clerk user ID (used as `clerkId` in database) |
| `email` | User's email address |
| `name` | User's display name |
| `pictureUrl` | User's avatar URL |

---

## Related Documentation

- [Users API](./endpoints/users.md) - User management endpoints
- [Webhooks](./webhooks.md) - Clerk webhook handling
- [Overview](./overview.md) - General API documentation
