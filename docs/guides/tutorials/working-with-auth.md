# Tutorial: Working with Authentication

This guide covers how to implement authentication-protected features in Ear-Plug using Clerk and Convex.

---

## Authentication Overview

Ear-Plug uses a two-layer authentication system:

1. **Clerk** - Handles user sign-up, sign-in, SSO, and session management
2. **Convex** - Validates Clerk JWTs and manages user data

```
User -> Clerk (auth UI) -> JWT Token -> Convex (validates) -> Database
```

---

## Web Application Auth

### Clerk Provider Setup

The Clerk provider wraps the entire app in `apps/web/src/app/providers.tsx`:

```typescript
import { ClerkProvider } from "@clerk/nextjs";

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

### Protected Routes with Middleware

The middleware (`apps/web/middleware.ts`) protects routes:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",           // Onboarding/landing
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

All routes under `/(app)/*` are protected by default.

### Adding a New Public Route

To make a route public, add it to the matcher in middleware:

```typescript
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/about",        // Add new public route
  "/terms(.*)",    // Add pattern for sub-routes
]);
```

---

## Using Auth in Components

### Check Authentication Status

```typescript
"use client";

import { useAuth, useUser } from "@clerk/nextjs";

export function MyComponent() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return <LoadingState />;
  }

  if (!isSignedIn) {
    return <SignInPrompt />;
  }

  return <div>Welcome, {user.firstName}!</div>;
}
```

### Using the Custom Hook Pattern

Ear-Plug uses custom hooks that combine Clerk auth with Convex user data:

```typescript
"use client";

import { useCurrentUser } from "@/hooks/useUser";

export function HomePage() {
  const { user, isLoading, isFan, isMusician } = useCurrentUser();

  if (isLoading) {
    return <LoadingState />;
  }

  if (!user) {
    // User not in database yet (shouldn't happen normally)
    return <ErrorState />;
  }

  if (isFan) {
    return <FanView />;
  }

  return <MusicianView />;
}
```

### The useCurrentUser Hook

```typescript
// apps/web/src/hooks/useUser.ts
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { UserRole } from "@ear-plug/shared/types";

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
    setRole: async (role: UserRole) => updateRole({ role }),
    updateProfile,
  };
}
```

---

## Auth in Convex Functions

### Query Pattern (Returns null if unauthorized)

```typescript
export const getCurrentUser = query({
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

    return user;
  },
});
```

### Mutation Pattern (Throws if unauthorized)

```typescript
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    avatar: v.optional(v.string()),
    topGenres: v.optional(v.array(genreValidator)),
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

    await ctx.db.patch(user._id, args);
    return user._id;
  },
});
```

### Authorization (Ownership Check)

```typescript
export const updateBand = mutation({
  args: {
    bandId: v.id("bands"),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
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

    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    // Authorization check
    if (band.userId !== user._id) {
      throw new Error("Not authorized to update this band");
    }

    const { bandId, ...updates } = args;
    await ctx.db.patch(bandId, updates);
    return bandId;
  },
});
```

---

## User Creation Flow

### Onboarding Flow

1. User lands on `/` (public)
2. User selects role (fan/musician)
3. Role stored in localStorage
4. Redirect to Clerk sign-up/sign-in
5. After auth success:
   - `upsertUser` creates/updates user in Convex
   - `updateRole` sets the selected role
   - Redirect to `/home`

### The upsertUser Mutation

```typescript
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        avatar: args.avatar,
      });
      return existingUser._id;
    }

    // Create new user with default role
    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      avatar: args.avatar,
      role: "fan", // Default role
      memberSince: Date.now(),
    });
  },
});
```

---

## Clerk Webhooks

Clerk sends webhooks to Convex for user events.

### HTTP Handler

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.json();

    if (payload.type === "user.created" || payload.type === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } = payload.data;

      await ctx.runMutation(internal.users.createUserFromClerk, {
        clerkId: id,
        email: email_addresses[0]?.email_address ?? "",
        name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || "User",
        avatar: image_url,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
```

### Configuring Webhooks in Clerk

1. Go to Clerk Dashboard > Webhooks
2. Add endpoint: `https://your-convex-url.convex.site/clerk-webhook`
3. Select events: `user.created`, `user.updated`
4. Save and test

---

## Role-Based Access Control

### In Components

```typescript
"use client";

import { useCurrentUser } from "@/hooks/useUser";

export function Navigation() {
  const { isFan, isMusician } = useCurrentUser();

  return (
    <nav>
      <Link href="/home">Home</Link>
      <Link href="/calendar">
        {isFan ? "My Events" : "My Shows"}
      </Link>
      {isMusician && (
        <Link href="/messages">Messages</Link>
      )}
      <Link href="/profile">Profile</Link>
    </nav>
  );
}
```

### In Convex Functions

```typescript
export const createEvent = mutation({
  args: { /* ... */ },
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

    // Role check
    if (user.role !== "musician") {
      throw new Error("Only musicians can create events");
    }

    // Continue with event creation...
  },
});
```

---

## Sign Out

### In Components

```typescript
import { useClerk } from "@clerk/nextjs";

export function SignOutButton() {
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut();
    // Redirects to sign-in page
  };

  return (
    <button onClick={handleSignOut}>
      Sign Out
    </button>
  );
}
```

---

## Common Auth Patterns

### Redirect After Auth

```typescript
"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <LoadingState />;
  }

  return <>{children}</>;
}
```

### Conditional Rendering Based on Auth

```typescript
export function ActionButton({ eventId }: { eventId: string }) {
  const { isSignedIn } = useAuth();
  const { rsvp } = useEvents();

  if (!isSignedIn) {
    return (
      <Link href="/sign-in" className="btn">
        Sign in to RSVP
      </Link>
    );
  }

  return (
    <button onClick={() => rsvp({ eventId })} className="btn">
      RSVP
    </button>
  );
}
```

---

## Mobile App Auth

The mobile app uses `@clerk/clerk-expo` with similar patterns:

```typescript
import { useAuth, useUser } from "@clerk/clerk-expo";

export function MobileComponent() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  // Same patterns as web
}
```

See [Mobile Development](./mobile-development.md) for mobile-specific auth details.

---

## Troubleshooting Auth Issues

### Redirect Loops

1. Check middleware matcher patterns
2. Ensure sign-in/sign-up routes are public
3. Verify Clerk environment variables

### User Not Found in Convex

1. Check Clerk webhook is configured
2. Verify `upsertUser` is called on sign-in
3. Check Convex logs for errors

### JWT Token Issues

1. Verify Clerk JWT template configuration
2. Check Convex auth config matches Clerk domain
3. Ensure `applicationID` is "convex" in auth.config.ts

---

## Next Steps

- See [Adding a Feature](./adding-a-feature.md) for complete feature implementation
- See [Creating Convex Functions](./creating-convex-functions.md) for backend patterns
- See [Troubleshooting](../how-to/troubleshooting.md) for common issues
