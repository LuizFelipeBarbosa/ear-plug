# Tutorial: Creating Convex Functions

This guide covers how to create queries and mutations in the Convex backend for Ear-Plug.

---

## Prerequisites

- Convex dev server running (`npx convex dev`)
- Understanding of the database schema (`convex/schema.ts`)
- Basic TypeScript knowledge

---

## Function Types

Convex has three types of functions:

| Type | Purpose | Real-time | Database Access |
|------|---------|-----------|-----------------|
| `query` | Read data | Yes (auto-updates) | Read-only |
| `mutation` | Write data | No | Read/write |
| `action` | External APIs | No | Via scheduler |
| `internalQuery` | Internal reads | N/A | Read-only |
| `internalMutation` | Internal writes | N/A | Read/write |

---

## Creating a Query

### Basic Query

```typescript
// convex/yourModule.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("events").collect();
  },
});
```

### Query with Arguments

```typescript
export const getById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});
```

### Query with Filtering

```typescript
export const listByGenre = query({
  args: {
    genre: v.union(
      v.literal("indie"),
      v.literal("rock"),
      v.literal("jazz"),
      v.literal("electronic"),
      v.literal("folk"),
      v.literal("pop"),
      v.literal("alternative")
    ),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // Filter events by genre in the genres array
    const allEvents = await ctx.db
      .query("events")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("dateTime"), Date.now()))
      .take(200);

    // Filter in memory for array contains
    const filtered = allEvents.filter(event =>
      event.genres?.includes(args.genre)
    );

    return filtered.slice(0, args.limit ?? 50);
  },
});
```

### Query with Related Data

```typescript
export const getEventWithDetails = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    // Fetch related band and venue
    const [band, venue] = await Promise.all([
      ctx.db.get(event.bandId),
      ctx.db.get(event.venueId),
    ]);

    return { ...event, band, venue };
  },
});
```

---

## Creating a Mutation

### Basic Mutation

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("myTable", {
      title: args.title,
      content: args.content,
      createdAt: Date.now(),
    });
    return id;
  },
});
```

### Mutation with Authentication

This is the standard pattern for protected mutations:

```typescript
export const create = mutation({
  args: {
    title: v.string(),
    bandId: v.id("bands"),
    venueId: v.id("venues"),
    dateTime: v.number(),
    capacity: v.number(),
    genres: v.array(genreValidator),
    price: v.optional(v.number()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // 2. Get user from database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // 3. Verify authorization (ownership check)
    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    if (band.userId !== user._id) {
      throw new Error("Not authorized to create events for this band");
    }

    // 4. Perform the mutation
    const eventId = await ctx.db.insert("events", {
      ...args,
      rsvpCount: 0,
      status: "confirmed",
    });

    return eventId;
  },
});
```

### Mutation with Toggle Behavior

```typescript
export const toggleLike = mutation({
  args: { eventId: v.id("events") },
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

    // Check for existing like
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (existingLike) {
      // Remove like
      await ctx.db.delete(existingLike._id);
      return { action: "unliked" };
    } else {
      // Add like
      await ctx.db.insert("likes", {
        userId: user._id,
        eventId: args.eventId,
        createdAt: Date.now(),
      });
      return { action: "liked" };
    }
  },
});
```

### Mutation with Denormalized Counter

```typescript
export const rsvp = mutation({
  args: { eventId: v.id("events") },
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

    const existingRsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (existingRsvp) {
      // Remove RSVP and decrement counter
      await ctx.db.delete(existingRsvp._id);
      await ctx.db.patch(args.eventId, {
        rsvpCount: Math.max(0, (event.rsvpCount ?? 0) - 1),
      });
      return { action: "removed" };
    } else {
      // Add RSVP and increment counter
      await ctx.db.insert("rsvps", {
        userId: user._id,
        eventId: args.eventId,
        createdAt: Date.now(),
      });
      await ctx.db.patch(args.eventId, {
        rsvpCount: (event.rsvpCount ?? 0) + 1,
      });
      return { action: "added" };
    }
  },
});
```

---

## Creating Internal Functions

Internal functions are called by other Convex functions, not directly from clients.

### Internal Mutation

```typescript
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    eventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    // No auth check needed - internal only
    return await ctx.db.insert("notifications", {
      ...args,
      read: false,
      createdAt: Date.now(),
    });
  },
});
```

### Calling Internal Functions

```typescript
import { internal } from "./_generated/api";

export const create = mutation({
  // ... args
  handler: async (ctx, args) => {
    // Create event
    const eventId = await ctx.db.insert("events", { ... });

    // Schedule notification creation
    await ctx.scheduler.runAfter(0, internal.notifications.createNearbyEventNotifications, {
      eventId,
      venueId: args.venueId,
      bandId: args.bandId,
    });

    return eventId;
  },
});
```

---

## Argument Validators

Convex uses its own validator library (`v`):

```typescript
import { v } from "convex/values";

// Primitive types
v.string()
v.number()
v.boolean()
v.null()

// Optional fields
v.optional(v.string())

// IDs
v.id("users")
v.id("events")
v.id("bands")

// Unions (string enums)
v.union(
  v.literal("indie"),
  v.literal("rock"),
  v.literal("jazz")
)

// Arrays
v.array(v.string())
v.array(v.id("events"))

// Objects
v.object({
  lat: v.number(),
  lng: v.number(),
})

// Complex nested structures
v.object({
  spotify: v.optional(v.string()),
  instagram: v.optional(v.string()),
  website: v.optional(v.string()),
})
```

### Reusable Validators

Define validators once and reuse:

```typescript
// At top of file
const genreValidator = v.union(
  v.literal("indie"),
  v.literal("rock"),
  v.literal("jazz"),
  v.literal("electronic"),
  v.literal("folk"),
  v.literal("pop"),
  v.literal("alternative")
);

const coordinatesValidator = v.object({
  lat: v.number(),
  lng: v.number(),
});

// Use in functions
export const create = mutation({
  args: {
    genres: v.array(genreValidator),
    coordinates: coordinatesValidator,
  },
  handler: async (ctx, args) => { ... },
});
```

---

## Using Database Indexes

Always use indexes for efficient queries:

```typescript
// Good: Uses index
const user = await ctx.db
  .query("users")
  .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
  .unique();

// Good: Uses compound index
const rsvp = await ctx.db
  .query("rsvps")
  .withIndex("by_user_event", (q) =>
    q.eq("userId", userId).eq("eventId", eventId)
  )
  .unique();

// Good: Uses index with range
const events = await ctx.db
  .query("events")
  .withIndex("by_date")
  .filter((q) => q.gte(q.field("dateTime"), Date.now()))
  .take(50);

// Avoid: Full table scan
const events = await ctx.db
  .query("events")
  .filter((q) => q.eq(q.field("someField"), someValue))
  .collect();
```

---

## Error Handling

Use descriptive error messages:

```typescript
// Authentication errors
if (!identity) {
  throw new Error("Not authenticated");
}

// Resource not found
if (!band) {
  throw new Error("Band not found");
}

// Authorization errors
if (band.userId !== user._id) {
  throw new Error("Not authorized to update this band");
}

// Business logic errors
if (existingApplication) {
  throw new Error("Already applied to this open date");
}

if (openDate.status !== "open") {
  throw new Error("This date is no longer available");
}
```

---

## After Creating Functions

1. **Run Convex dev** to generate types:
   ```bash
   npx convex dev
   ```

2. **Check for type errors** in your IDE

3. **Test in the Convex dashboard**:
   - Go to https://dashboard.convex.dev
   - Select your project
   - Use the "Functions" tab to test

4. **Create a hook** to consume the function (see [Adding a Feature](./adding-a-feature.md))

---

## Common Patterns Reference

### Get Current User Pattern

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  return null; // or throw for mutations
}

const user = await ctx.db
  .query("users")
  .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
  .unique();

if (!user) {
  return null; // or throw for mutations
}
```

### Enrich with Related Data Pattern

```typescript
const eventsWithDetails = await Promise.all(
  events.map(async (event) => {
    const [band, venue] = await Promise.all([
      ctx.db.get(event.bandId),
      ctx.db.get(event.venueId),
    ]);
    return { ...event, band, venue };
  })
);
```

### Upsert Pattern

```typescript
const existing = await ctx.db
  .query("myTable")
  .withIndex("by_unique_field", (q) => q.eq("uniqueField", args.uniqueField))
  .unique();

if (existing) {
  await ctx.db.patch(existing._id, { ...updates });
  return existing._id;
} else {
  return await ctx.db.insert("myTable", { ...newRecord });
}
```

---

## Next Steps

- See [Working with Auth](./working-with-auth.md) for auth patterns
- See [Add Database Table](../how-to/add-database-table.md) for schema changes
- Check the [API Catalog](/docs/_discovery/api-catalog.md) for existing functions
