# Notification System Architecture

This document explains how the notification system works in Ear-Plug, including notification types, triggers, and implementation details.

---

## Overview

The notification system keeps users informed about:

- Upcoming events they plan to attend
- New events from artists they follow
- New events at venues they saved
- Application status updates (for musicians)
- New messages (for musicians)

---

## Notification Types

| Type | Recipient | Trigger | Content |
|------|-----------|---------|---------|
| `event_reminder` | Fans | Scheduled before RSVP'd event | "[Band] at [Venue] is coming up!" |
| `new_event_followed_artist` | Fans | Artist creates new event | "[Band] is playing at [Venue]!" |
| `new_event_nearby` | Fans | Event created at saved venue | "New Event at a Saved Venue" |
| `lineup_change` | Fans | Event details modified | Custom message |
| `application_update` | Musicians | Application status changes | Status-specific message |
| `message` | Musicians | New message received | Message preview |

---

## Data Model

### Notification Schema

```typescript
// convex/schema.ts
notifications: defineTable({
  userId: v.id("users"),           // Recipient
  type: v.string(),                // Notification type
  title: v.string(),               // Display title
  content: v.string(),             // Body text
  eventId: v.optional(v.id("events")),
  bandId: v.optional(v.id("bands")),
  venueId: v.optional(v.id("venues")),
  read: v.boolean(),               // Read status
  createdAt: v.number(),           // Timestamp
})
  .index("by_user", ["userId"])
  .index("by_user_read", ["userId", "read"])
```

### Related Data

Notifications can reference:
- **Event** - For event-related notifications
- **Band** - For artist-related notifications
- **Venue** - For venue-related notifications

---

## Creating Notifications

### Internal Mutation

Notifications are created via an internal mutation:

```typescript
// convex/notifications.ts
export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    eventId: v.optional(v.id("events")),
    bandId: v.optional(v.id("bands")),
    venueId: v.optional(v.id("venues")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      read: false,
      createdAt: Date.now(),
    });
  },
});
```

### Triggered by Event Creation

When a musician creates an event:

```typescript
// convex/events.ts
export const create = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // Create the event
    const eventId = await ctx.db.insert("events", { ... });

    // Schedule notifications for fans
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.createNearbyEventNotifications,
      {
        eventId,
        venueId: args.venueId,
        bandId: args.bandId,
      }
    );

    return eventId;
  },
});
```

### Bulk Notification Creation

```typescript
// convex/notifications.ts
export const createNearbyEventNotifications = internalMutation({
  args: {
    eventId: v.id("events"),
    venueId: v.id("venues"),
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    const band = await ctx.db.get(args.bandId);
    const venue = await ctx.db.get(args.venueId);

    if (!event || !band || !venue) {
      return { notifiedCount: 0 };
    }

    // Find users who saved this venue
    const venueSavers = await ctx.db
      .query("savedVenues")
      .withIndex("by_venue", (q) => q.eq("venueId", args.venueId))
      .collect();

    // Find users who saved this band
    const bandSavers = await ctx.db
      .query("savedArtists")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();

    // Combine unique user IDs
    const userIds = new Set([
      ...venueSavers.map((s) => s.userId),
      ...bandSavers.map((s) => s.userId),
    ]);

    // Create notifications
    let notifiedCount = 0;
    for (const userId of userIds) {
      await ctx.db.insert("notifications", {
        userId,
        type: "new_event_nearby",
        title: `${band.name} is playing at ${venue.name}!`,
        content: `New show on ${formatDate(event.dateTime)}`,
        eventId: args.eventId,
        bandId: args.bandId,
        venueId: args.venueId,
        read: false,
        createdAt: Date.now(),
      });
      notifiedCount++;
    }

    return { notifiedCount };
  },
});
```

---

## Reading Notifications

### List Notifications

```typescript
// convex/notifications.ts
export const list = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    let query = ctx.db.query("notifications");

    if (args.unreadOnly) {
      query = query.withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      );
    } else {
      query = query.withIndex("by_user", (q) => q.eq("userId", user._id));
    }

    const notifications = await query
      .order("desc")
      .take(args.limit ?? 50);

    // Enrich with related data
    return Promise.all(
      notifications.map(async (notification) => ({
        ...notification,
        event: notification.eventId
          ? await ctx.db.get(notification.eventId)
          : null,
        band: notification.bandId
          ? await ctx.db.get(notification.bandId)
          : null,
        venue: notification.venueId
          ? await ctx.db.get(notification.venueId)
          : null,
      }))
    );
  },
});
```

### Unread Count

```typescript
export const getUnreadCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    return unread.length;
  },
});
```

---

## Managing Notifications

### Mark as Read

```typescript
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.notificationId, { read: true });
  },
});
```

### Mark All as Read

```typescript
export const markAllAsRead = mutation({
  handler: async (ctx) => {
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

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { read: true });
    }

    return { markedCount: unread.length };
  },
});
```

### Delete Notification

```typescript
export const remove = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    await ctx.db.delete(args.notificationId);
  },
});
```

---

## Frontend Implementation

### Notification Hook

```typescript
// apps/web/src/hooks/useNotifications.ts
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useNotifications() {
  const notifications = useQuery(api.notifications.list);
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const removeNotification = useMutation(api.notifications.remove);

  return {
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
    isLoading: notifications === undefined,
    markAsRead: async (notificationId: Id<"notifications">) => {
      await markAsRead({ notificationId });
    },
    markAllAsRead: async () => {
      await markAllAsRead();
    },
    remove: async (notificationId: Id<"notifications">) => {
      await removeNotification({ notificationId });
    },
  };
}
```

### Notification Badge

```typescript
// apps/web/src/components/navigation/NotificationBadge.tsx
"use client";

import { useNotifications } from "@/hooks/useNotifications";

export function NotificationBadge() {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  );
}
```

### Notification List

```typescript
// apps/web/src/components/notifications/NotificationList.tsx
"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";

export function NotificationList() {
  const { notifications, isLoading, markAllAsRead } = useNotifications();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-8">
        No notifications yet
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Notifications</h2>
        <button
          onClick={markAllAsRead}
          className="text-sm text-lime hover:underline"
        >
          Mark all as read
        </button>
      </div>
      <div className="space-y-2">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification._id}
            notification={notification}
          />
        ))}
      </div>
    </div>
  );
}
```

### Notification Item

```typescript
// apps/web/src/components/notifications/NotificationItem.tsx
"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { getRelativeTime } from "@ear-plug/shared/utils";

export function NotificationItem({ notification }) {
  const { markAsRead, remove } = useNotifications();

  const handleClick = async () => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }
  };

  const getLink = () => {
    if (notification.eventId) {
      return `/gig/${notification.eventId}`;
    }
    return null;
  };

  const link = getLink();
  const content = (
    <div
      className={cn(
        "p-4 rounded-lg border",
        notification.read
          ? "bg-night-secondary border-zinc-800"
          : "bg-night-tertiary border-lime/30"
      )}
    >
      <div className="flex justify-between">
        <div className="flex-1">
          <p className="font-semibold text-white">{notification.title}</p>
          <p className="text-zinc-400 text-sm mt-1">{notification.content}</p>
          <p className="text-zinc-500 text-xs mt-2">
            {getRelativeTime(notification.createdAt)}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            remove(notification._id);
          }}
          className="p-1 hover:bg-zinc-800 rounded"
        >
          <X className="w-4 h-4 text-zinc-500" />
        </button>
      </div>
    </div>
  );

  if (link) {
    return (
      <Link href={link} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return content;
}
```

---

## Scheduled Notifications

### Event Reminders

Create reminders for upcoming events using Convex scheduler:

```typescript
// When user RSVPs
export const rsvp = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    // ... RSVP logic

    // Schedule reminder 24 hours before event
    const event = await ctx.db.get(args.eventId);
    if (event) {
      const reminderTime = event.dateTime - 24 * 60 * 60 * 1000;

      if (reminderTime > Date.now()) {
        await ctx.scheduler.runAt(
          reminderTime,
          internal.notifications.createEventReminder,
          { eventId: args.eventId, userId: user._id }
        );
      }
    }
  },
});

// Internal: Create the reminder
export const createEventReminder = internalMutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return;

    const band = await ctx.db.get(event.bandId);
    const venue = await ctx.db.get(event.venueId);

    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "event_reminder",
      title: `${band?.name ?? "Event"} is tomorrow!`,
      content: `Don't forget - ${venue?.name ?? "the venue"} at ${formatTime(event.dateTime)}`,
      eventId: args.eventId,
      read: false,
      createdAt: Date.now(),
    });
  },
});
```

---

## Best Practices

### 1. Do Not Spam Users

Avoid creating too many notifications:
- Batch similar notifications
- Respect user preferences (future feature)
- Use reasonable reminder timing

### 2. Include Actionable Links

Always include relevant IDs so users can navigate:
```typescript
await ctx.db.insert("notifications", {
  // ...
  eventId: args.eventId,  // Allow linking to event
  bandId: args.bandId,    // Allow linking to band
});
```

### 3. Write Clear Content

- Title: Short, attention-grabbing
- Content: Specific details

```typescript
// Good
title: "The Midnight Waves is playing at The Chapel!",
content: "New show on Friday, Jan 15 at 8:00 PM"

// Not as good
title: "New Event",
content: "Check it out"
```

### 4. Handle Cleanup

Consider deleting old read notifications periodically (future feature).

---

## Next Steps

- See [Real-Time Data](./real-time-data.md) for how updates propagate
- See [User Roles](./user-roles.md) for role-specific notifications
- See [Creating Convex Functions](../tutorials/creating-convex-functions.md) for backend implementation
