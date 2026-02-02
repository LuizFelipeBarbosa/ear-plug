# How To: Add a Database Table

This guide explains how to add a new table to the Convex database schema.

---

## Overview

Adding a new table involves:

1. Define the table schema
2. Add indexes for efficient queries
3. Create queries and mutations
4. Generate types
5. Create frontend hooks

---

## Step 1: Define the Table Schema

Edit `convex/schema.ts` to add your new table.

### Basic Table Definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Existing tables...

  // New table: reviews
  reviews: defineTable({
    userId: v.id("users"),           // Foreign key to users
    eventId: v.id("events"),         // Foreign key to events
    rating: v.number(),              // 1-5 star rating
    content: v.string(),             // Review text
    createdAt: v.number(),           // Timestamp
  }),
});
```

### Table with Optional Fields

```typescript
reviews: defineTable({
  userId: v.id("users"),
  eventId: v.id("events"),
  rating: v.number(),
  content: v.optional(v.string()),   // Optional field
  helpfulCount: v.optional(v.number()),
  response: v.optional(v.string()),  // Band's response
  responseAt: v.optional(v.number()),
  createdAt: v.number(),
}),
```

### Table with Complex Types

```typescript
reviews: defineTable({
  userId: v.id("users"),
  eventId: v.id("events"),
  rating: v.number(),
  content: v.string(),
  // Nested object
  metadata: v.object({
    device: v.optional(v.string()),
    browser: v.optional(v.string()),
  }),
  // Array of strings
  tags: v.array(v.string()),
  // Union type (enum-like)
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("rejected")
  ),
  createdAt: v.number(),
}),
```

---

## Step 2: Add Indexes

Indexes are essential for efficient queries. Add them using `.index()`:

```typescript
reviews: defineTable({
  userId: v.id("users"),
  eventId: v.id("events"),
  rating: v.number(),
  content: v.string(),
  createdAt: v.number(),
})
  // Single field indexes
  .index("by_user", ["userId"])
  .index("by_event", ["eventId"])

  // Compound index for unique constraint
  .index("by_user_event", ["userId", "eventId"])

  // Index for sorting
  .index("by_created", ["createdAt"]),
```

### Index Naming Convention

Use the pattern `by_<field_name>`:

- `by_user` - Index on userId
- `by_event` - Index on eventId
- `by_user_event` - Compound index on userId + eventId
- `by_status` - Index on status field

---

## Step 3: Generate Types

Run the Convex development server to generate TypeScript types:

```bash
npx convex dev
```

This updates `convex/_generated/dataModel.d.ts` with:

- `Doc<"reviews">` - The document type
- `Id<"reviews">` - The ID type

---

## Step 4: Create Queries

Create a new file or add to an existing module:

```typescript
// convex/reviews.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List reviews for an event
export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(50);

    // Enrich with user data
    return Promise.all(
      reviews.map(async (review) => {
        const user = await ctx.db.get(review.userId);
        return {
          ...review,
          user: user ? { name: user.name, avatar: user.avatar } : null,
        };
      })
    );
  },
});

// Get user's reviews
export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    return await ctx.db
      .query("reviews")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// Check if user already reviewed an event
export const getUserReviewForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    return await ctx.db
      .query("reviews")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();
  },
});
```

---

## Step 5: Create Mutations

```typescript
// convex/reviews.ts (continued)

// Create a review
export const create = mutation({
  args: {
    eventId: v.id("events"),
    rating: v.number(),
    content: v.string(),
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

    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Check for existing review
    const existingReview = await ctx.db
      .query("reviews")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (existingReview) {
      throw new Error("You have already reviewed this event");
    }

    // Verify event exists and is in the past
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (event.dateTime > Date.now()) {
      throw new Error("Cannot review future events");
    }

    return await ctx.db.insert("reviews", {
      userId: user._id,
      eventId: args.eventId,
      rating: args.rating,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

// Update a review
export const update = mutation({
  args: {
    reviewId: v.id("reviews"),
    rating: v.optional(v.number()),
    content: v.optional(v.string()),
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

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    if (review.userId !== user._id) {
      throw new Error("Not authorized to update this review");
    }

    const { reviewId, ...updates } = args;
    await ctx.db.patch(reviewId, updates);
    return reviewId;
  },
});

// Delete a review
export const remove = mutation({
  args: { reviewId: v.id("reviews") },
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

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    if (review.userId !== user._id) {
      throw new Error("Not authorized to delete this review");
    }

    await ctx.db.delete(args.reviewId);
  },
});
```

---

## Step 6: Create Frontend Hook

```typescript
// apps/web/src/hooks/useReviews.ts
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useEventReviews(eventId: Id<"events">) {
  const reviews = useQuery(api.reviews.listByEvent, { eventId });
  const userReview = useQuery(api.reviews.getUserReviewForEvent, { eventId });
  const createReview = useMutation(api.reviews.create);
  const updateReview = useMutation(api.reviews.update);
  const deleteReview = useMutation(api.reviews.remove);

  return {
    reviews: reviews ?? [],
    userReview,
    isLoading: reviews === undefined,
    hasReviewed: userReview !== null,
    create: async (rating: number, content: string) => {
      return createReview({ eventId, rating, content });
    },
    update: async (reviewId: Id<"reviews">, rating?: number, content?: string) => {
      return updateReview({ reviewId, rating, content });
    },
    remove: async (reviewId: Id<"reviews">) => {
      return deleteReview({ reviewId });
    },
  };
}

export function useUserReviews() {
  const reviews = useQuery(api.reviews.listByUser);

  return {
    reviews: reviews ?? [],
    isLoading: reviews === undefined,
  };
}
```

---

## Step 7: Add Types to Shared Package (Optional)

If you need the types in both web and mobile:

```typescript
// packages/shared/src/types/index.ts

export interface Review {
  _id: string;
  userId: string;
  eventId: string;
  rating: number;
  content: string;
  createdAt: number;
}

export interface ReviewWithUser extends Review {
  user: {
    name: string;
    avatar?: string;
  } | null;
}
```

---

## Complete Example: Reviews Table

### Schema

```typescript
// convex/schema.ts
reviews: defineTable({
  userId: v.id("users"),
  eventId: v.id("events"),
  rating: v.number(),
  content: v.string(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_event", ["eventId"])
  .index("by_user_event", ["userId", "eventId"]),
```

### Module

```typescript
// convex/reviews.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByEvent = query({ /* ... */ });
export const listByUser = query({ /* ... */ });
export const getUserReviewForEvent = query({ /* ... */ });
export const create = mutation({ /* ... */ });
export const update = mutation({ /* ... */ });
export const remove = mutation({ /* ... */ });
```

### Hook

```typescript
// apps/web/src/hooks/useReviews.ts
export function useEventReviews(eventId) { /* ... */ }
export function useUserReviews() { /* ... */ }
```

---

## Common Patterns

### Foreign Keys

Reference other tables using `v.id("tableName")`:

```typescript
reviews: defineTable({
  userId: v.id("users"),    // References users table
  eventId: v.id("events"),  // References events table
})
```

### Timestamps

Always include timestamp fields:

```typescript
{
  createdAt: v.number(),    // Date.now() on creation
  updatedAt: v.optional(v.number()),  // Date.now() on update
}
```

### Soft Deletes (Optional)

Instead of deleting, mark as deleted:

```typescript
{
  deletedAt: v.optional(v.number()),
}

// Query non-deleted records
.filter((q) => q.eq(q.field("deletedAt"), undefined))
```

### Denormalized Counts

For frequently accessed counts, store on parent:

```typescript
// On events table
reviewCount: v.optional(v.number()),
averageRating: v.optional(v.number()),

// Update in review mutation
await ctx.db.patch(args.eventId, {
  reviewCount: currentCount + 1,
  averageRating: newAverage,
});
```

---

## Checklist

- [ ] Table defined in `convex/schema.ts`
- [ ] Appropriate indexes added
- [ ] Types generated (`npx convex dev`)
- [ ] Query functions created
- [ ] Mutation functions created
- [ ] Authentication checks in mutations
- [ ] Authorization checks (ownership)
- [ ] Frontend hook created
- [ ] TypeScript compiles without errors

---

## Next Steps

- See [Creating Convex Functions](../tutorials/creating-convex-functions.md) for query/mutation patterns
- See [Adding a Feature](../tutorials/adding-a-feature.md) for complete feature implementation
- See [Working with Auth](../tutorials/working-with-auth.md) for auth patterns
