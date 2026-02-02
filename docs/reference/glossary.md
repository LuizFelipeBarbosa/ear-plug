# Glossary

This glossary defines key terms used throughout the Ear-Plug codebase and documentation.

---

## A

### Application

A request submitted by a musician/band to perform at a venue's open date. Applications have a status: `pending`, `accepted`, or `rejected`.

```typescript
interface Application {
  bandId: Id<"bands">;
  openDateId: Id<"openDates">;
  status: "pending" | "accepted" | "rejected";
  message?: string;
  appliedAt: number;
  respondedAt?: number;
}
```

---

## B

### Band

A musician profile representing an artist or group. Each musician user has one band profile.

```typescript
interface Band {
  userId: Id<"users">;   // Owner
  name: string;
  genres: Genre[];       // 1-5 genres
  location: string;
  bio?: string;
  memberCount?: number;
  socialLinks?: SocialLinks;
}
```

### Bay Area

The San Francisco Bay Area in California, USA. The geographic focus of Ear-Plug. The default map center is approximately (37.8044, -122.2712).

---

## C

### Clerk

The third-party authentication service used for user sign-up, sign-in, and session management. Handles OAuth providers (Google, Apple) and email/password authentication.

### Convex

The serverless backend platform powering Ear-Plug. Provides:
- Real-time database with automatic subscriptions
- Serverless functions (queries, mutations, actions)
- Type-safe API generation

### Conversation

A message thread between a band and a venue. One conversation per band-venue pair.

```typescript
interface Conversation {
  bandId: Id<"bands">;
  venueId: Id<"venues">;
  lastMessageAt: number;
  lastMessagePreview?: string;
}
```

---

## D

### Dashboard

The musician home screen showing stats, suggested venues, and open dates. Contrast with the fan home screen which shows a map.

---

## E

### Event

A live music show. The core entity connecting bands, venues, fans, and dates.

```typescript
interface Event {
  title: string;
  bandId: Id<"bands">;
  venueId: Id<"venues">;
  dateTime: number;         // Unix timestamp
  rsvpCount: number;        // Denormalized count
  capacity: number;
  price?: number;           // In cents
  genres: Genre[];
  status: "confirmed" | "hold" | "available";
}
```

### Event Status

The state of an event:
- **confirmed** - Event is definitely happening
- **hold** - Tentatively scheduled
- **available** - Time slot open for booking

### Expo

The React Native development platform used for the mobile app. Provides cross-platform iOS/Android development with Expo Router for navigation.

### Expo Router

File-based routing system for React Native, similar to Next.js App Router.

---

## F

### Fan

A user role for live music enthusiasts. Fans discover events, RSVP to shows, follow artists, and receive notifications.

---

## G

### Genre

Music style categories. Supported genres:

| Value | Display | Color |
|-------|---------|-------|
| `indie` | Indie | Amber |
| `rock` | Rock | Red |
| `jazz` | Jazz | Indigo |
| `electronic` | Electronic | Violet |
| `folk` | Folk | Green |
| `pop` | Pop | Pink |
| `alternative` | Alternative | Cyan |

```typescript
type Genre = "indie" | "rock" | "jazz" | "electronic" | "folk" | "pop" | "alternative";
```

---

## H

### Haversine Formula

Mathematical formula used to calculate distances between geographic coordinates on Earth's surface. Used for "nearby" event queries.

```typescript
function haversineDistance(lat1, lng1, lat2, lng2): number // miles
```

### Hook (React)

A custom function that encapsulates Convex queries/mutations and React state. Convention: starts with `use`.

```typescript
export function useCurrentUser() { ... }
export function useEvents() { ... }
```

---

## I

### Index (Database)

A Convex database index for efficient queries. Naming convention: `by_<field>`.

```typescript
.index("by_clerk_id", ["clerkId"])
.index("by_user_event", ["userId", "eventId"])
```

---

## J

### JWT

JSON Web Token. Used by Clerk to authenticate requests to Convex.

---

## L

### Like

A user action indicating interest in an event. Unlike RSVPs, likes do not appear in the calendar view. Toggle behavior.

```typescript
interface Like {
  userId: Id<"users">;
  eventId: Id<"events">;
  createdAt: number;
}
```

### Listen Local

The tagline/mission of Ear-Plug: connecting people with local live music.

---

## M

### Message

A chat message within a conversation between a band and venue.

```typescript
interface Message {
  conversationId: Id<"conversations">;
  senderId: Id<"users">;
  content: string;
  timestamp: number;
  read: boolean;
}
```

### Mutation

A Convex function that writes to the database. Must be called via `useMutation`.

```typescript
export const create = mutation({
  args: { ... },
  handler: async (ctx, args) => { ... },
});
```

### Musician

A user role for artists and bands. Musicians create band profiles, post events, apply to open dates, and message venues.

---

## N

### NativeWind

Tailwind CSS for React Native. Enables using Tailwind classes in mobile app components.

### Next.js

The React framework used for the web application. Version 14 with App Router.

### Night (Color)

The primary background color: `#0F0F0F`. Dark theme base.

### Notification

An in-app alert for users about events, messages, or application updates.

```typescript
type NotificationType =
  | "event_reminder"
  | "new_event_followed_artist"
  | "new_event_nearby"
  | "lineup_change"
  | "application_update"
  | "message";
```

---

## O

### Onboarding

The initial user flow: role selection -> sign up/sign in -> redirect to home.

### Open Date

A booking opportunity at a venue. Musicians can browse and apply to open dates.

```typescript
interface OpenDate {
  venueId: Id<"venues">;
  date: number;                    // Unix timestamp
  offeredPay?: number;             // In cents
  genre?: Genre;                   // Preferred genre
  status: "open" | "pending" | "filled";
  description?: string;
}
```

### Open Date Status

- **open** - Available for applications
- **pending** - Has applications under review
- **filled** - Booked, no longer available

---

## P

### Price

Event ticket cost stored in cents (integer). `0` means free.

```typescript
// $15.00 = 1500 cents
event.price = 1500;
```

### Protected Route

A route that requires authentication. In Ear-Plug, all `/(app)/*` routes are protected.

### Provider

A React context provider wrapping the app. Ear-Plug uses ClerkProvider and ConvexProviderWithClerk.

---

## Q

### Query

A Convex function that reads from the database. Queries are reactive and auto-update.

```typescript
export const list = query({
  args: { ... },
  handler: async (ctx, args) => { ... },
});
```

---

## R

### Real-time

The automatic data synchronization provided by Convex. When data changes, subscribed clients update immediately without polling.

### RSVP

A user's commitment to attend an event. RSVPs appear in the calendar. Toggle behavior.

```typescript
interface RSVP {
  userId: Id<"users">;
  eventId: Id<"events">;
  createdAt: number;
}
```

### Role

User type determining app experience: `"fan"` or `"musician"`.

### Route Group

A Next.js/Expo Router folder in parentheses that doesn't affect URL structure. Example: `(app)/`, `(tabs)/`.

---

## S

### Saved Artist

A band that a fan follows. Fans receive notifications when saved artists post new events.

### Saved Venue

A venue that a fan follows. Fans receive notifications when events are created at saved venues.

### Seed Data

Sample data for development. Created via `npx convex run seed:seedDatabase`.

Includes:
- 12 Bay Area venues
- 10 sample bands
- 10 upcoming events
- 5 open dates

### Social Links

External URLs for a band's profiles:

```typescript
interface SocialLinks {
  spotify?: string;
  instagram?: string;
  website?: string;
  youtube?: string;
  soundcloud?: string;
  bandcamp?: string;
}
```

---

## T

### Turborepo

The monorepo build system. Manages task execution across packages.

### Toggle Behavior

An action that alternates between two states. Clicking again reverses the action.

Examples:
- RSVP: click to add, click again to remove
- Like: click to like, click again to unlike
- Save: click to save, click again to unsave

### Top Genres

A fan user's preferred music genres (0-5). Used for personalized recommendations.

---

## U

### Unix Timestamp

Date/time stored as milliseconds since January 1, 1970. All timestamps in Ear-Plug use this format.

```typescript
const now = Date.now(); // Unix timestamp in ms
```

### Upsert

Create or update pattern. If record exists, update it; otherwise create new.

```typescript
// Example: upsertUser
const existing = await db.query("users")...;
if (existing) {
  await db.patch(existing._id, updates);
} else {
  await db.insert("users", newData);
}
```

### User

An authenticated person using the app. Has a role (fan/musician) and is linked to Clerk via `clerkId`.

---

## V

### Validator

Convex runtime type checking. Uses `v` from `convex/values`.

```typescript
import { v } from "convex/values";

v.string()
v.number()
v.id("users")
v.array(v.string())
v.union(v.literal("fan"), v.literal("musician"))
```

### Venue

A live music location. Venues are data-only entities (no user accounts).

```typescript
interface Venue {
  name: string;
  address: string;
  city: string;
  capacity: number;
  coordinates: { lat: number; lng: number };
  genres?: Genre[];
  description?: string;
}
```

### Vivid Violet

Secondary accent color: `#8B5CF6`.

---

## W

### Webhook

HTTP endpoint receiving external service events. Ear-Plug has a Clerk webhook at `/clerk-webhook` for user sync.

### Workspace

A pnpm workspace package. Ear-Plug has four workspaces:
- `@ear-plug/web`
- `@ear-plug/mobile`
- `@ear-plug/shared`
- `@ear-plug/tailwind-config`

---

## Z

### Zod

TypeScript-first schema validation library used in `packages/shared` for client-side validation.

```typescript
import { z } from "zod";

const bandSchema = z.object({
  name: z.string().min(1).max(100),
  genres: z.array(genreSchema).min(1).max(5),
});
```

---

## Abbreviations

| Abbr | Meaning |
|------|---------|
| API | Application Programming Interface |
| CLI | Command Line Interface |
| CSS | Cascading Style Sheets |
| ID | Identifier |
| JWT | JSON Web Token |
| MCP | Model Context Protocol |
| SSO | Single Sign-On |
| UI | User Interface |
| URL | Uniform Resource Locator |

---

## Related Documentation

- [Getting Started](/docs/guides/getting-started.md)
- [User Roles](/docs/guides/concepts/user-roles.md)
- [API Catalog](/docs/_discovery/api-catalog.md)
- [Business Logic Notes](/docs/_discovery/business-logic-notes.md)
