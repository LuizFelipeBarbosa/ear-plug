# Ear-Plug API Catalog

This document catalogs all Convex backend APIs, webhooks, and external integrations for the Ear-Plug application.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication](#authentication)
3. [Users API](#users-api)
4. [Bands API](#bands-api)
5. [Venues API](#venues-api)
6. [Events API](#events-api)
7. [Messages API](#messages-api)
8. [Notifications API](#notifications-api)
9. [Seed API](#seed-api)
10. [HTTP Endpoints (Webhooks)](#http-endpoints-webhooks)
11. [Internal Mutations](#internal-mutations)
12. [Utility Functions](#utility-functions)

---

## Architecture Overview

Ear-Plug uses **Convex** as its serverless backend, providing real-time queries and mutations. The API is organized into modules:

```
convex/
  users.ts        - User management
  bands.ts        - Band profiles and management
  venues.ts       - Venue listings and open dates
  events.ts       - Event CRUD and user interactions
  messages.ts     - Conversation/messaging system
  notifications.ts - User notifications
  seed.ts         - Database seeding utilities
  http.ts         - HTTP webhook handlers
  utils/geo.ts    - Geospatial utility functions
```

**Data Flow:**
```
Clerk Auth -> Convex Backend (real-time) -> Web/Mobile Apps
                    |
         packages/shared (types + validation)
```

---

## Authentication

### Provider: Clerk

Authentication is handled by Clerk with JWT tokens validated by Convex.

**Configuration:** `/convex/auth.config.ts`
```typescript
{
  providers: [
    {
      domain: "https://premium-sheep-24.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
}
```

### Authentication Patterns

| Pattern | Description |
|---------|-------------|
| `ctx.auth.getUserIdentity()` | Returns current user identity or null |
| `identity.subject` | Clerk user ID (used as `clerkId`) |
| Authenticated routes require valid JWT in request headers |

**Protected Operations:**
- All mutations (except `seedDatabase`, `clearDatabase`)
- Some queries return empty/null for unauthenticated users

---

## Users API

**Module:** `/convex/users.ts`

### Queries

#### `getCurrentUser`
Get the currently authenticated user.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns null if unauthenticated) |
| **Arguments** | None |
| **Returns** | `User \| null` |

**Response Schema:**
```typescript
{
  _id: Id<"users">,
  _creationTime: number,
  clerkId: string,
  role: "fan" | "musician",
  name: string,
  email: string,
  location?: string,
  avatar?: string,
  topGenres?: Genre[],
  memberSince: number,
  showsAttended?: number,
}
```

---

#### `getById`
Get a user by their Convex ID.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ userId: Id<"users"> }` |
| **Returns** | `User \| null` |

---

#### `getByClerkId`
Get a user by their Clerk ID.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ clerkId: string }` |
| **Returns** | `User \| null` |

---

### Mutations

#### `upsertUser`
Create or update a user (called on sign-in).

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | No |
| **Arguments** | `{ clerkId: string, email: string, name: string, avatar?: string }` |
| **Returns** | `Id<"users">` |

**Behavior:**
- If user exists: Updates email, name, avatar
- If user doesn't exist: Creates with default role "fan"

---

#### `updateRole`
Update the current user's role during onboarding.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ role: "fan" \| "musician" }` |
| **Returns** | `Id<"users">` |
| **Throws** | "Not authenticated", "User not found" |

---

#### `updateProfile`
Update the current user's profile.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ name?: string, location?: string, avatar?: string, topGenres?: Genre[] }` |
| **Returns** | `Id<"users">` |
| **Throws** | "Not authenticated", "User not found" |

---

#### `incrementShowsAttended`
Increment the user's shows attended count.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | None |
| **Returns** | `void` |
| **Throws** | "Not authenticated", "User not found" |

---

## Bands API

**Module:** `/convex/bands.ts`

### Queries

#### `getById`
Get a band by ID.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ bandId: Id<"bands"> }` |
| **Returns** | `Band \| null` |

---

#### `getCurrentUserBand`
Get the current musician user's band.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns null if unauthenticated or not musician) |
| **Arguments** | None |
| **Returns** | `Band \| null` |

---

#### `getBandWithStats`
Get the current user's band with computed statistics.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns null if not musician) |
| **Arguments** | None |
| **Returns** | `BandWithStats \| null` |

**Response Schema:**
```typescript
{
  ...Band,
  stats: {
    showsThisMonth: number,
    totalRsvps: number,
    newFans: number,
  }
}
```

---

#### `list`
List all bands with optional filtering.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ genre?: Genre, limit?: number }` |
| **Returns** | `Band[]` |

---

#### `search`
Search bands by name or location.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ query: string, limit?: number }` |
| **Returns** | `Band[]` |

---

#### `getSavedBands`
Get the current user's saved/followed bands.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns [] if unauthenticated) |
| **Arguments** | None |
| **Returns** | `Band[]` |

---

#### `getAnalytics`
Get analytics data for a specific band.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | Yes |
| **Arguments** | `{ bandId: Id<"bands"> }` |
| **Returns** | `AnalyticsData` |
| **Throws** | "Not authenticated", "Band not found" |

**Response Schema:**
```typescript
{
  totalRsvps: number,
  eventCount: number,
  eventComparison: { name: string, rsvps: number, venueName: string }[],
  trafficData: { name: string, value: number }[],
}
```

---

### Mutations

#### `create`
Create a new band for the current musician user.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | See below |
| **Returns** | `Id<"bands">` |
| **Throws** | "Not authenticated", "User not found", "User already has a band" |

**Arguments:**
```typescript
{
  name: string,
  genres: Genre[],
  location: string,
  image?: string,
  bio?: string,
  memberCount?: number,
  socialLinks?: SocialLinks,
}
```

---

#### `update`
Update a band's profile.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ bandId: Id<"bands">, ...optional fields }` |
| **Returns** | `Id<"bands">` |
| **Throws** | "Not authenticated", "User not found", "Not authorized to update this band" |

---

#### `toggleSave`
Save or unsave a band (for fans).

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ bandId: Id<"bands"> }` |
| **Returns** | `{ action: "saved" \| "unsaved" }` |
| **Throws** | "Not authenticated", "User not found" |

---

## Venues API

**Module:** `/convex/venues.ts`

### Queries

#### `getById`
Get a venue by ID.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ venueId: Id<"venues"> }` |
| **Returns** | `Venue \| null` |

---

#### `list`
List all venues with optional city filter.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ city?: string, limit?: number }` |
| **Returns** | `Venue[]` |

---

#### `getSuggested`
Get suggested venues for a band based on genre.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ genre?: Genre, limit?: number }` |
| **Returns** | `Venue[]` |

---

#### `search`
Search venues by name, city, or address.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ query: string, limit?: number }` |
| **Returns** | `Venue[]` |

---

#### `getNearby`
Get venues near a location with distance.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ lat: number, lng: number, radiusMiles?: number }` |
| **Returns** | `VenueWithDistance[]` |

**Response Schema:**
```typescript
{
  ...Venue,
  distance: number, // in miles
}[]
```

---

#### `getSavedVenues`
Get the current user's saved venues.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns [] if unauthenticated) |
| **Arguments** | None |
| **Returns** | `Venue[]` |

---

#### `getOpenDates`
Get open booking dates for venues.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ venueId?: Id<"venues">, genre?: Genre, limit?: number }` |
| **Returns** | `OpenDateWithVenue[]` |

**Response Schema:**
```typescript
{
  ...OpenDate,
  venue: Venue,
}[]
```

---

#### `getBandApplications`
Get all applications submitted by a band.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ bandId: Id<"bands"> }` |
| **Returns** | `ApplicationWithDetails[]` |

---

#### `findByCoordinates`
Find a venue by coordinates (for deduplication).

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ lat: number, lng: number, tolerance?: number }` |
| **Returns** | `Venue \| null` |

---

### Mutations

#### `toggleSave`
Save or unsave a venue.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ venueId: Id<"venues"> }` |
| **Returns** | `{ action: "saved" \| "unsaved" }` |
| **Throws** | "Not authenticated", "User not found" |

---

#### `applyToOpenDate`
Apply to a venue's open booking date.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ openDateId: Id<"openDates">, bandId: Id<"bands">, message?: string }` |
| **Returns** | `Id<"applications">` |
| **Throws** | "Not authenticated", "User not found", "Not authorized to apply for this band", "Already applied to this open date", "This date is no longer available" |

---

#### `createFromPlace`
Create or find a venue from Google Places data.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | See below |
| **Returns** | `Id<"venues">` |
| **Throws** | "Not authenticated" |

**Arguments:**
```typescript
{
  name: string,
  address: string,
  city: string,
  coordinates: { lat: number, lng: number },
  placeId?: string,
  capacity?: number,
  description?: string,
  genres?: Genre[],
}
```

---

## Events API

**Module:** `/convex/events.ts`

### Queries

#### `listUpcoming`
List all upcoming events.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ limit?: number }` |
| **Returns** | `EventWithDetails[]` |

---

#### `listByGenre`
List upcoming events filtered by genre.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ genre: Genre, limit?: number }` |
| **Returns** | `EventWithDetails[]` |

---

#### `getById`
Get an event by ID with full details.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ eventId: Id<"events"> }` |
| **Returns** | `EventWithDetails \| null` |

---

#### `listByBand`
List events for a specific band.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ bandId: Id<"bands">, includesPast?: boolean }` |
| **Returns** | `EventWithVenue[]` |

---

#### `listByVenue`
List upcoming events at a specific venue.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ venueId: Id<"venues"> }` |
| **Returns** | `EventWithBand[]` |

---

#### `search`
Search events by title, band name, or venue name.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ query: string, limit?: number }` |
| **Returns** | `EventWithDetails[]` |

---

#### `getUserRsvps`
Get the current user's upcoming RSVP'd events.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns [] if unauthenticated) |
| **Arguments** | None |
| **Returns** | `EventWithDetails[]` |

---

#### `getUserPastRsvps`
Get the current user's past RSVP'd events.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns [] if unauthenticated) |
| **Arguments** | None |
| **Returns** | `EventWithDetails[]` |

---

#### `getUserLikes`
Get the current user's liked events (excluding RSVP'd).

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns [] if unauthenticated) |
| **Arguments** | None |
| **Returns** | `EventWithDetails[]` |

---

#### `getUserEventStatus`
Check if the user has RSVP'd or liked an event.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ eventId: Id<"events"> }` |
| **Returns** | `{ hasRsvp: boolean, hasLiked: boolean }` |

---

#### `listNearby`
Get events near a location.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ latitude: number, longitude: number, radiusMiles: number, genre?: Genre, limit?: number }` |
| **Returns** | `EventWithDetailsAndDistance[]` |

---

### Mutations

#### `rsvp`
RSVP or un-RSVP to an event.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ eventId: Id<"events"> }` |
| **Returns** | `{ action: "added" \| "removed" }` |
| **Throws** | "Not authenticated", "User not found" |

---

#### `toggleLike`
Like or unlike an event.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ eventId: Id<"events"> }` |
| **Returns** | `{ action: "liked" \| "unliked" }` |
| **Throws** | "Not authenticated", "User not found" |

---

#### `create`
Create a new event (for bands).

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | See below |
| **Returns** | `Id<"events">` |
| **Throws** | "Not authenticated", "Band not found", "Not authorized to create events for this band" |

**Arguments:**
```typescript
{
  title: string,
  bandId: Id<"bands">,
  venueId: Id<"venues">,
  dateTime: number,
  image?: string,
  capacity: number,
  price?: number,
  description?: string,
  genres: Genre[],
  genre?: Genre, // Legacy field
}
```

**Side Effects:** Schedules notifications for fans who saved the venue or band.

---

#### `createWithVenue`
Create a new event with automatic venue creation.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | See below |
| **Returns** | `{ eventId: Id<"events">, venueId: Id<"venues"> }` |
| **Throws** | "Not authenticated", "Band not found", "Not authorized to create events for this band" |

**Arguments:**
```typescript
{
  title: string,
  bandId: Id<"bands">,
  dateTime: number,
  genres: Genre[],
  genre?: Genre, // Legacy field
  venueName: string,
  venueAddress: string,
  venueCity: string,
  venueCoordinates: { lat: number, lng: number },
  venuePlaceId?: string,
  image?: string,
  capacity?: number,
  price?: number,
  description?: string,
}
```

**Side Effects:** Creates venue if not exists, schedules notifications.

---

## Messages API

**Module:** `/convex/messages.ts`

### Queries

#### `getBandConversations`
Get all conversations for the current user's band.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns [] if not musician) |
| **Arguments** | None |
| **Returns** | `ConversationWithDetails[]` |

**Response Schema:**
```typescript
{
  ...Conversation,
  venue: Venue,
  unreadCount: number,
}[]
```

---

#### `getConversationMessages`
Get messages in a conversation.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns [] if unauthenticated) |
| **Arguments** | `{ conversationId: Id<"conversations"> }` |
| **Returns** | `MessageWithSender[]` |

**Response Schema:**
```typescript
{
  ...Message,
  sender: User,
}[]
```

---

#### `getUnreadCount`
Get total unread message count for the current user's band.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns 0 if not musician) |
| **Arguments** | None |
| **Returns** | `number` |

---

### Mutations

#### `send`
Send a message in a conversation.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ conversationId: Id<"conversations">, content: string }` |
| **Returns** | `Id<"messages">` |
| **Throws** | "Not authenticated", "User not found" |

---

#### `markAsRead`
Mark all messages in a conversation as read.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ conversationId: Id<"conversations"> }` |
| **Returns** | `{ markedCount: number }` |
| **Throws** | "Not authenticated", "User not found" |

---

#### `startConversation`
Start a new conversation or get existing one.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ bandId: Id<"bands">, venueId: Id<"venues">, initialMessage?: string }` |
| **Returns** | `Id<"conversations">` |
| **Throws** | "Not authenticated", "User not found" |

---

## Notifications API

**Module:** `/convex/notifications.ts`

### Queries

#### `list`
Get notifications for the current user.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns [] if unauthenticated) |
| **Arguments** | `{ limit?: number, unreadOnly?: boolean }` |
| **Returns** | `NotificationWithDetails[]` |

**Response Schema:**
```typescript
{
  ...Notification,
  event: Event | null,
  band: Band | null,
  venue: Venue | null,
}[]
```

---

#### `getUnreadCount`
Get unread notification count for the current user.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns 0 if unauthenticated) |
| **Arguments** | None |
| **Returns** | `number` |

---

### Mutations

#### `markAsRead`
Mark a notification as read.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ notificationId: Id<"notifications"> }` |
| **Returns** | `void` |
| **Throws** | "Not authenticated", "Notification not found" |

---

#### `markAllAsRead`
Mark all notifications as read.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | None |
| **Returns** | `{ markedCount: number }` |
| **Throws** | "Not authenticated", "User not found" |

---

#### `remove`
Delete a notification.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ notificationId: Id<"notifications"> }` |
| **Returns** | `void` |
| **Throws** | "Not authenticated" |

---

#### `createEventReminder`
Create event reminder notifications for all RSVP'd users.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | No |
| **Arguments** | `{ eventId: Id<"events"> }` |
| **Returns** | `{ notifiedCount: number }` |
| **Throws** | "Event not found" |

---

## Seed API

**Module:** `/convex/seed.ts`

### Mutations

#### `seedDatabase`
Seed the database with sample data.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | No |
| **Arguments** | None |
| **Returns** | `{ message: string, venues?: number, bands?: number, events?: number, openDates?: number }` |

**Creates:**
- 12 Bay Area venues
- 10 sample bands
- 10 upcoming events
- 5 open dates

---

#### `clearDatabase`
Clear all seed data from the database.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | No |
| **Arguments** | None |
| **Returns** | `{ message: string }` |

---

## HTTP Endpoints (Webhooks)

**Module:** `/convex/http.ts`

### `POST /clerk-webhook`
Clerk webhook handler for user synchronization.

| Property | Value |
|----------|-------|
| **Method** | POST |
| **Path** | `/clerk-webhook` |
| **Auth** | Clerk webhook signature |

**Supported Events:**
- `user.created` - Creates user in Convex
- `user.updated` - Updates user in Convex
- `user.deleted` - Currently no-op (data preserved)

**Payload:**
```typescript
{
  type: "user.created" | "user.updated" | "user.deleted",
  data: {
    id: string,
    email_addresses: { email_address: string }[],
    first_name?: string,
    last_name?: string,
    image_url?: string,
  }
}
```

---

## Internal Mutations

These are called internally by other Convex functions or scheduled jobs.

### `users.createUserFromClerk`
Create a user from Clerk webhook data.

| Property | Value |
|----------|-------|
| **Type** | Internal Mutation |
| **Arguments** | `{ clerkId: string, email: string, name: string, avatar?: string }` |
| **Returns** | `Id<"users">` |

---

### `notifications.createNotification`
Create a notification (internal use).

| Property | Value |
|----------|-------|
| **Type** | Internal Mutation |
| **Arguments** | `{ userId: Id<"users">, type: NotificationType, title: string, content: string, eventId?: Id<"events">, bandId?: Id<"bands">, venueId?: Id<"venues"> }` |
| **Returns** | `Id<"notifications">` |

---

### `notifications.createNearbyEventNotifications`
Notify fans who saved a venue/band about new events.

| Property | Value |
|----------|-------|
| **Type** | Internal Mutation |
| **Arguments** | `{ eventId: Id<"events">, venueId: Id<"venues">, bandId: Id<"bands"> }` |
| **Returns** | `{ notifiedCount: number }` |

---

## Utility Functions

**Module:** `/convex/utils/geo.ts`

### `haversineDistance`
Calculate distance between two coordinates.

```typescript
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number // Returns distance in miles
```

---

### `coordinatesMatch`
Check if two coordinates match within tolerance.

```typescript
function coordinatesMatch(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  tolerance?: number // Default: 0.0001 (~10 meters)
): boolean
```

---

### Constants

```typescript
const EARTH_RADIUS_MILES = 3959;
const COORDINATE_TOLERANCE = 0.0001;
```

---

## External Integrations

### Google Maps/Places API

Used client-side for:
- Venue search and autocomplete
- Map display with venue markers
- Geolocation services

**Package:** `@vis.gl/react-google-maps` (web), `react-native-maps` (mobile)

---

### Clerk Authentication

Used for:
- User authentication (sign-in, sign-up)
- JWT token generation
- User profile management

**Packages:**
- `@clerk/nextjs` (web)
- `@clerk/clerk-expo` (mobile)

---

## Error Handling

All mutations follow consistent error patterns:

```typescript
// Common errors
"Not authenticated"       // No valid auth token
"User not found"          // Clerk user not in Convex DB
"Band not found"          // Invalid band ID
"Event not found"         // Invalid event ID
"Notification not found"  // Invalid notification ID
"Not authorized..."       // Ownership validation failed
"Already applied..."      // Duplicate action prevented
```

---

## Rate Limits & Performance

- Default query limit: 50 items
- Maximum search results: 100 items scanned, 20 returned
- Nearby queries: 200 events scanned, filtered by distance
- All queries use database indexes for performance
