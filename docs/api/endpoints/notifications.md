# Notifications API

This document details all notification-related queries and mutations in the Ear-Plug backend.

**Module:** `/convex/notifications.ts`

---

## Table of Contents

1. [Overview](#overview)
2. [Queries](#queries)
   - [list](#list)
   - [getUnreadCount](#getunreadcount)
3. [Mutations](#mutations)
   - [markAsRead](#markasread)
   - [markAllAsRead](#markallasread)
   - [remove](#remove)
   - [createEventReminder](#createeventreminder)
4. [Internal Mutations](#internal-mutations)
   - [createNotification](#createnotification)
   - [createNearbyEventNotifications](#createnearbyeventnotifications)
5. [Type Definitions](#type-definitions)

---

## Overview

The notification system keeps users informed about relevant activity:

- **Event reminders** - Upcoming events the user RSVP'd to
- **New events** - Events from followed bands or at saved venues
- **Application updates** - Status changes on booking applications
- **Messages** - New conversation messages
- **Lineup changes** - Updates to events the user is attending

Notifications are created by internal mutations triggered by other operations (e.g., creating an event triggers notifications for relevant fans).

---

## Queries

### list

Get notifications for the current user.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns `[]` if unauthenticated) |
| **Arguments** | `{ limit?: number, unreadOnly?: boolean }` |
| **Returns** | `NotificationWithDetails[]` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `limit` | `number` | No | 50 | Maximum notifications to return |
| `unreadOnly` | `boolean` | No | false | Only return unread notifications |

#### Response Schema

```typescript
{
  // Notification fields
  _id: Id<"notifications">;
  userId: Id<"users">;
  type: NotificationType;
  title: string;
  content: string;
  timestamp: number;
  read: boolean;
  eventId?: Id<"events">;
  bandId?: Id<"bands">;
  venueId?: Id<"venues">;

  // Enriched data
  event: Event | null;
  band: Band | null;
  venue: Venue | null;
}
```

#### Notification Types

| Type | Description |
|------|-------------|
| `event_reminder` | Reminder for upcoming RSVP'd event |
| `lineup_change` | Event details have changed |
| `new_event_followed_artist` | New event from a saved band |
| `new_event_nearby` | New event at a saved venue |
| `application_update` | Booking application status changed |
| `message` | New message in a conversation |

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function NotificationsPanel() {
  const notifications = useQuery(api.notifications.list, {
    limit: 20,
    unreadOnly: false,
  });

  if (notifications === undefined) return <LoadingSpinner />;

  if (notifications.length === 0) {
    return <EmptyState message="No notifications" />;
  }

  return (
    <div>
      {notifications.map((notif) => (
        <NotificationItem
          key={notif._id}
          notification={notif}
          event={notif.event}
          band={notif.band}
          venue={notif.venue}
        />
      ))}
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useNotifications } from "@/hooks";

function Component() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications({ limit: 30, unreadOnly: false });
}
```

---

### getUnreadCount

Get the unread notification count for the current user.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns `0` if unauthenticated) |
| **Arguments** | None |
| **Returns** | `number` |

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function NotificationBadge() {
  const unreadCount = useQuery(api.notifications.getUnreadCount);

  if (!unreadCount) return null;

  return (
    <span className="badge">{unreadCount}</span>
  );
}
```

#### In Navigation

```typescript
function BottomNav() {
  const unreadCount = useQuery(api.notifications.getUnreadCount);

  return (
    <nav>
      <NavItem href="/home" icon="map">Home</NavItem>
      <NavItem href="/calendar" icon="calendar">Calendar</NavItem>
      <NavItem href="/notifications" icon="bell" badge={unreadCount}>
        Notifications
      </NavItem>
      <NavItem href="/profile" icon="user">Profile</NavItem>
    </nav>
  );
}
```

---

## Mutations

### markAsRead

Mark a single notification as read.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ notificationId: Id<"notifications"> }` |
| **Returns** | `void` |
| **Throws** | `"Not authenticated"`, `"Notification not found"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `notificationId` | `Id<"notifications">` | Yes | The notification to mark as read |

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function NotificationItem({ notification }) {
  const markAsRead = useMutation(api.notifications.markAsRead);

  const handleClick = async () => {
    if (!notification.read) {
      await markAsRead({ notificationId: notification._id });
    }
    // Navigate to relevant content
    if (notification.eventId) {
      router.push(`/gig/${notification.eventId}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={notification.read ? "opacity-60" : ""}
    >
      <h4>{notification.title}</h4>
      <p>{notification.content}</p>
    </div>
  );
}
```

---

### markAllAsRead

Mark all notifications as read for the current user.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | None |
| **Returns** | `{ markedCount: number }` |
| **Throws** | `"Not authenticated"`, `"User not found"` |

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function NotificationsHeader({ unreadCount }) {
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const handleMarkAll = async () => {
    const result = await markAllAsRead();
    console.log(`Marked ${result.markedCount} notifications as read`);
  };

  return (
    <div className="header">
      <h2>Notifications</h2>
      {unreadCount > 0 && (
        <button onClick={handleMarkAll}>
          Mark all as read
        </button>
      )}
    </div>
  );
}
```

---

### remove

Delete a notification.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ notificationId: Id<"notifications"> }` |
| **Returns** | `void` |
| **Throws** | `"Not authenticated"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `notificationId` | `Id<"notifications">` | Yes | The notification to delete |

#### Behavior

- Silently succeeds if notification doesn't exist
- Does not verify ownership (only checks authentication)

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function NotificationItem({ notification }) {
  const removeNotification = useMutation(api.notifications.remove);

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await removeNotification({ notificationId: notification._id });
  };

  return (
    <div className="notification">
      <div>{notification.content}</div>
      <button onClick={handleDismiss} aria-label="Dismiss">
        &times;
      </button>
    </div>
  );
}
```

---

### createEventReminder

Create reminder notifications for all users who RSVP'd to an event.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | No |
| **Arguments** | `{ eventId: Id<"events"> }` |
| **Returns** | `{ notifiedCount: number }` |
| **Throws** | `"Event not found"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `eventId` | `Id<"events">` | Yes | The event to send reminders for |

#### Behavior

- Fetches all RSVPs for the event
- Creates `event_reminder` notification for each user
- Includes event, band, and venue IDs for deep linking

#### Usage Example

This mutation is typically called by a scheduled job rather than directly from the UI:

```typescript
// In a scheduled function or admin action
import { api } from "../convex/_generated/api";

// Send reminders for an upcoming event
const result = await ctx.runMutation(api.notifications.createEventReminder, {
  eventId: upcomingEventId,
});

console.log(`Sent reminders to ${result.notifiedCount} users`);
```

---

## Internal Mutations

These mutations can only be called internally by other Convex functions.

### createNotification

Create a notification for a specific user.

| Property | Value |
|----------|-------|
| **Type** | Internal Mutation |
| **Arguments** | See below |
| **Returns** | `Id<"notifications">` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `userId` | `Id<"users">` | Yes | User to notify |
| `type` | `NotificationType` | Yes | Notification type |
| `title` | `string` | Yes | Notification title |
| `content` | `string` | Yes | Notification body |
| `eventId` | `Id<"events">` | No | Related event |
| `bandId` | `Id<"bands">` | No | Related band |
| `venueId` | `Id<"venues">` | No | Related venue |

#### Usage (Internal)

```typescript
// From another Convex function
await ctx.runMutation(internal.notifications.createNotification, {
  userId: targetUser._id,
  type: "application_update",
  title: "Application Accepted!",
  content: `Your application to play at ${venue.name} was accepted!`,
  bandId: band._id,
  venueId: venue._id,
});
```

---

### createNearbyEventNotifications

Notify fans who have saved a venue or band when a new event is created.

| Property | Value |
|----------|-------|
| **Type** | Internal Mutation |
| **Arguments** | `{ eventId: Id<"events">, venueId: Id<"venues">, bandId: Id<"bands"> }` |
| **Returns** | `{ notifiedCount: number }` |

#### Behavior

1. Fetches all users who saved the venue (`savedVenues` table)
2. Fetches all users who saved the band (`savedArtists` table)
3. Combines user IDs (removes duplicates)
4. Creates `new_event_nearby` notification for each user

#### When Called

This mutation is automatically scheduled when `events.create` or `events.createWithVenue` is called:

```typescript
// In events.ts create mutation
await ctx.scheduler.runAfter(0, internal.notifications.createNearbyEventNotifications, {
  eventId,
  venueId: args.venueId,
  bandId: args.bandId,
});
```

---

## Type Definitions

### Notification

```typescript
interface Notification {
  _id: Id<"notifications">;
  _creationTime: number;
  userId: Id<"users">;
  type: NotificationType;
  title: string;
  content: string;
  timestamp: number;
  read: boolean;
  eventId?: Id<"events">;
  bandId?: Id<"bands">;
  venueId?: Id<"venues">;
}
```

### NotificationWithDetails

```typescript
interface NotificationWithDetails extends Notification {
  event: Event | null;
  band: Band | null;
  venue: Venue | null;
}
```

### NotificationType

```typescript
type NotificationType =
  | "event_reminder"
  | "lineup_change"
  | "new_event_followed_artist"
  | "new_event_nearby"
  | "application_update"
  | "message";
```

---

## Database Schema

### Table: `notifications`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `Id<"users">` | User receiving the notification |
| `type` | `NotificationType` | Type of notification |
| `title` | `string` | Notification title |
| `content` | `string` | Notification body text |
| `timestamp` | `number` | When notification was created |
| `read` | `boolean` | Whether user has read it |
| `eventId` | `Id<"events">?` | Related event (for deep linking) |
| `bandId` | `Id<"bands">?` | Related band |
| `venueId` | `Id<"venues">?` | Related venue |

### Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| `by_user` | `userId` | Get user's notifications |
| `by_user_read` | `userId, read` | Get unread notifications |
| `by_timestamp` | `timestamp` | Sort by time |

---

## Notification Flow

### New Event Created

```
1. Band creates event via events.create or events.createWithVenue
2. Scheduler immediately runs createNearbyEventNotifications
3. Query savedVenues for users who saved the event's venue
4. Query savedArtists for users who saved the band
5. Create notification for each unique user
6. Users see notification in their inbox (real-time)
```

### Event Reminder

```
1. Scheduled job runs before event date
2. createEventReminder called with eventId
3. Query rsvps for all users who RSVP'd
4. Create "event_reminder" notification for each
5. Users receive reminder about upcoming event
```

### Application Status Change

```
1. Venue updates application status
2. Internal createNotification called
3. Band owner receives "application_update" notification
4. Notification includes band and venue for context
```

---

## UI Configuration

The shared package provides configuration for displaying notifications:

```typescript
// packages/shared/src/constants/index.ts
const NOTIFICATION_TYPE_CONFIG = {
  event_reminder: { icon: "clock", title: "Event Reminder" },
  lineup_change: { icon: "refresh-cw", title: "Lineup Change" },
  new_event_followed_artist: { icon: "music", title: "New Show" },
  new_event_nearby: { icon: "map-pin", title: "Nearby Event" },
  application_update: { icon: "file-text", title: "Application Update" },
  message: { icon: "message-circle", title: "New Message" },
} as const;
```

### Displaying Notifications

```typescript
import { NOTIFICATION_TYPE_CONFIG } from "@ear-plug/shared";
import { Clock, RefreshCw, Music, MapPin, FileText, MessageCircle } from "lucide-react";

const iconMap = {
  clock: Clock,
  "refresh-cw": RefreshCw,
  music: Music,
  "map-pin": MapPin,
  "file-text": FileText,
  "message-circle": MessageCircle,
};

function NotificationItem({ notification }) {
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];
  const Icon = iconMap[config.icon];

  return (
    <div className="notification">
      <Icon className="w-5 h-5" />
      <div>
        <span className="type-label">{config.title}</span>
        <h4>{notification.title}</h4>
        <p>{notification.content}</p>
      </div>
    </div>
  );
}
```

---

## Related Documentation

- [Events API](./events.md) - Events that trigger notifications
- [Bands API](./bands.md) - Saved bands for new event notifications
- [Venues API](./venues.md) - Saved venues and applications
- [Messages API](./messages.md) - Message notifications
