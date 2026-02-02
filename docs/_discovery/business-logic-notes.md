# Business Logic & Domain Notes

This document captures the domain terminology, business rules, and core logic flows in the Ear-Plug "Listen Local" platform.

---

## Domain Overview

Ear-Plug is a Bay Area live music platform that connects:
- **Fans** - People who want to discover and attend local live music shows
- **Musicians/Bands** - Artists who want to promote shows and find gig opportunities
- **Venues** - Live music venues that host events (data-only, no user accounts)

---

## Core Entities

### Users

| Field | Type | Description |
|-------|------|-------------|
| `clerkId` | string | Clerk authentication ID (links to external auth) |
| `role` | "fan" \| "musician" | Determines app experience |
| `name` | string | Display name |
| `email` | string | Contact email |
| `location` | string? | User's city/location |
| `avatar` | string? | Profile image URL |
| `topGenres` | Genre[]? | Fan's preferred genres (max 5) |
| `memberSince` | number | Unix timestamp of account creation |
| `showsAttended` | number? | Fan metric: events attended |

**Business Rules:**
- Default role is "fan" on account creation
- Role is selected during onboarding and persisted
- Clerk handles all authentication
- One user account per Clerk ID

### Bands

| Field | Type | Description |
|-------|------|-------------|
| `userId` | Id<"users"> | Owner (musician) of this band |
| `name` | string | Band name |
| `genres` | Genre[] | Primary and secondary genres (1-5) |
| `genre` | Genre? | Legacy single genre field (backward compat) |
| `location` | string | Band's home base (e.g., "Oakland, CA") |
| `image` | string? | Band profile image |
| `bio` | string? | Band description (max 1000 chars) |
| `memberCount` | number? | Number of band members (1-50) |
| `socialLinks` | SocialLinks? | External links (Spotify, Instagram, etc.) |
| `createdAt` | number | Unix timestamp |

**Business Rules:**
- One band per musician user (enforced in create mutation)
- Multiple genres supported (1-5)
- Band must be created before posting events

### Venues

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Venue name |
| `address` | string | Street address |
| `city` | string | City (used for filtering) |
| `capacity` | number | Max attendee capacity |
| `coordinates` | { lat, lng } | GPS coordinates for map |
| `images` | string[]? | Venue photos |
| `description` | string? | Venue description |
| `genres` | Genre[]? | Typical genres hosted |

**Business Rules:**
- Venues are created from Google Places data or seed data
- Venue deduplication: match by coordinates within ~10 meters tolerance
- Venues are passive entities (no user accounts)

### Events

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Event title |
| `bandId` | Id<"bands"> | Performing band |
| `venueId` | Id<"venues"> | Hosting venue |
| `dateTime` | number | Unix timestamp of event start |
| `image` | string? | Event poster/image |
| `rsvpCount` | number | Current RSVP count |
| `capacity` | number | Max attendees |
| `price` | number? | Ticket price in cents (0 = free) |
| `description` | string? | Event details |
| `genres` | Genre[] | Event genres (from band or custom) |
| `genre` | Genre? | Legacy single genre field |
| `status` | EventStatus | Event state |

**Event Status Values:**
- `confirmed` - Event is happening
- `hold` - Tentatively scheduled
- `available` - Slot open for booking

**Business Rules:**
- Only the band owner can create/edit events
- RSVP count is denormalized and updated on RSVP changes
- Events automatically filter to upcoming (dateTime >= now)
- Past events are accessible but marked as "Completed"

### Open Dates (Booking Opportunities)

| Field | Type | Description |
|-------|------|-------------|
| `venueId` | Id<"venues"> | Venue offering the date |
| `date` | number | Unix timestamp of available date |
| `offeredPay` | number? | Compensation in cents |
| `genre` | Genre? | Preferred genre for slot |
| `status` | OpenDateStatus | Booking state |
| `description` | string? | Booking notes |
| `createdAt` | number | Timestamp |

**Open Date Status Values:**
- `open` - Available for applications
- `pending` - Has applications under review
- `filled` - Booked (no longer available)

**Business Rules:**
- Only future dates shown
- Status changes to "pending" when application received
- Status changes to "filled" when booked

### Applications

| Field | Type | Description |
|-------|------|-------------|
| `bandId` | Id<"bands"> | Applying band |
| `openDateId` | Id<"openDates"> | Target open date |
| `status` | ApplicationStatus | Application state |
| `message` | string? | Application message |
| `appliedAt` | number | Application timestamp |
| `respondedAt` | number? | Response timestamp |

**Application Status Values:**
- `pending` - Awaiting response
- `accepted` - Booking confirmed
- `rejected` - Application declined

**Business Rules:**
- One application per band per open date
- Only band owner can apply
- Cannot apply to non-open dates

---

## User Interactions

### RSVPs

| Field | Type | Description |
|-------|------|-------------|
| `userId` | Id<"users"> | RSVP'ing user |
| `eventId` | Id<"events"> | Target event |
| `createdAt` | number | RSVP timestamp |

**Business Rules:**
- Toggle behavior (RSVP again to cancel)
- Updates event's denormalized `rsvpCount`
- Only future events can be RSVP'd

### Likes

| Field | Type | Description |
|-------|------|-------------|
| `userId` | Id<"users"> | Liking user |
| `eventId` | Id<"events"> | Liked event |
| `createdAt` | number | Like timestamp |

**Business Rules:**
- Toggle behavior
- Liked events shown in separate list
- Likes excluded from calendar view (only RSVPs shown)

### Saved Artists

| Field | Type | Description |
|-------|------|-------------|
| `userId` | Id<"users"> | Fan user |
| `bandId` | Id<"bands"> | Saved band |
| `createdAt` | number | Save timestamp |

**Business Rules:**
- Toggle behavior
- Triggers notifications when saved band posts new event

### Saved Venues

| Field | Type | Description |
|-------|------|-------------|
| `userId` | Id<"users"> | Fan user |
| `venueId` | Id<"venues"> | Saved venue |
| `createdAt` | number | Save timestamp |

**Business Rules:**
- Toggle behavior
- Triggers notifications when new event at saved venue

---

## Messaging System

### Conversations

| Field | Type | Description |
|-------|------|-------------|
| `bandId` | Id<"bands"> | Band in conversation |
| `venueId` | Id<"venues"> | Venue in conversation |
| `lastMessageAt` | number | Timestamp of last message |
| `lastMessagePreview` | string? | Truncated last message (max 50 chars) |

**Business Rules:**
- One conversation per band-venue pair
- Starting conversation creates it if not exists
- Ordered by last message time

### Messages

| Field | Type | Description |
|-------|------|-------------|
| `conversationId` | Id<"conversations"> | Parent conversation |
| `senderId` | Id<"users"> | Message sender |
| `content` | string | Message text (max 5000 chars) |
| `timestamp` | number | Send time |
| `read` | boolean | Read status |

**Business Rules:**
- Messages ordered ascending by timestamp
- Unread count calculated per conversation
- "Mark as read" marks all unread messages from other party

---

## Notifications

### Notification Types

| Type | Trigger | Content |
|------|---------|---------|
| `event_reminder` | Scheduled before event | "[Band] at [Venue] is coming up!" |
| `lineup_change` | Event modified | Manual trigger |
| `new_event_followed_artist` | Saved band creates event | "[Band] is playing at [Venue]!" |
| `new_event_nearby` | Event at saved venue | "New Event at a Saved Venue" |
| `application_update` | Application status change | Manual trigger |
| `message` | New message received | Manual trigger |

**Business Rules:**
- Notifications are user-specific
- Toggle read status
- Batch mark all as read
- Delete individual notifications
- Event creation triggers `new_event_nearby` for fans who saved the venue or band

---

## Geolocation & Distance

### Distance Calculation

Uses Haversine formula for accurate earth-surface distances:

```typescript
// Earth's radius: 3958.8 miles (or 3959 in some files)
// Returns distance in miles
haversineDistance(lat1, lng1, lat2, lng2): number
```

### Coordinate Matching

For venue deduplication:

```typescript
// Tolerance: 0.0001 (~10 meters)
coordinatesMatch(lat1, lng1, lat2, lng2, tolerance = 0.0001): boolean
```

### Default Map Settings

- Center: San Francisco Bay Area (37.8044, -122.2712)
- Default zoom: 12
- Distance options: 1, 5, 10, 25, 50 miles
- Default radius: 25 miles

---

## Genre System

### Supported Genres

| Value | Display Label | Color (UI) |
|-------|--------------|------------|
| `indie` | Indie | Amber (#f59e0b) |
| `rock` | Rock | Red (#ef4444) |
| `jazz` | Jazz | Indigo (#6366f1) |
| `electronic` | Electronic | Violet (#8b5cf6) |
| `folk` | Folk | Green (#22c55e) |
| `pop` | Pop | Pink (#ec4899) |
| `alternative` | Alternative | Cyan (#06b6d4) |

### Genre Usage

- **Users (fans)**: `topGenres` array (0-5 genres)
- **Bands**: `genres` array (1-5 genres, required)
- **Venues**: `genres` array (optional, indicates typical programming)
- **Events**: `genres` array (typically inherits from band)
- **Open Dates**: single `genre` (preferred genre for slot)

---

## Role-Based Experiences

### Fan Experience

1. **Home (Discover)**: Map view of nearby events
   - Filter by genre
   - Filter by distance radius
   - Search by name/venue
   - Tap pin to see event details

2. **Calendar (My Events)**:
   - Upcoming RSVPs
   - Liked events
   - Past attended events

3. **Notifications**:
   - Event reminders
   - New events from saved artists/venues

4. **Profile**:
   - Edit name, location, avatar
   - Manage top genres
   - View saved artists/venues
   - Shows attended count

### Musician Experience

1. **Home (Dashboard)**: Band metrics
   - Shows this month
   - Total RSVPs
   - New fans (followers)
   - Suggested venues
   - Open dates to apply to

2. **Calendar (Shows)**:
   - Upcoming confirmed shows
   - Create new gig
   - Application statuses

3. **Messages**:
   - Conversations with venues
   - Unread message count

4. **Profile**:
   - Band profile management
   - Analytics/insights
   - Social links

---

## Authentication Flow

### Onboarding

1. User lands on `/` (OnboardingFlow)
2. User selects role (fan or musician)
3. Role persisted to localStorage immediately
4. If not signed in, redirect to Clerk sign-up/sign-in
5. On successful auth:
   - `upsertUser` creates/updates Convex user
   - `updateRole` sets selected role
   - Redirect to `/home`

### Protected Routes

Clerk middleware protects all routes except:
- `/` (onboarding)
- `/sign-in`, `/sign-up`
- `/sso-callback`

All `/(app)/*` routes require authentication.

---

## Data Flows

### Event Creation Flow

1. Musician navigates to create event
2. Selects or creates venue:
   - **Existing venue**: Search and select
   - **New venue**: Google Places autocomplete creates venue record
3. Fills event details (title, date, capacity, price, description)
4. Event created with `status: "confirmed"`
5. Scheduler triggers `createNearbyEventNotifications`:
   - Finds users who saved this venue
   - Finds users who saved this band
   - Creates notifications for each

### RSVP Flow

1. Fan clicks RSVP on event card
2. `events.rsvp` mutation called
3. If existing RSVP:
   - Delete RSVP record
   - Decrement event `rsvpCount`
   - Return `{ action: "removed" }`
4. If no existing RSVP:
   - Create RSVP record
   - Increment event `rsvpCount`
   - Return `{ action: "added" }`

### Application Flow

1. Musician browses open dates in dashboard
2. Clicks "Apply" on open date
3. `venues.applyToOpenDate` mutation:
   - Verifies band ownership
   - Checks no existing application
   - Checks open date status is "open"
   - Creates application with `status: "pending"`
   - Updates open date status to "pending"
4. Application appears in musician's application list

---

## Pricing

- Prices stored in **cents** (integer)
- Display formatting: `formatPrice(cents)` returns "$X.XX" or "Free" for 0
- Example: `price: 1500` displays as "$15.00"

---

## Timestamps

- All timestamps stored as Unix milliseconds (`Date.now()`)
- Display formatting helpers:
  - `formatEventDate(timestamp)`: "Mon, Jan 15"
  - `formatEventTime(timestamp)`: "8:00 PM"
  - `formatFullDate(timestamp)`: "Monday, January 15, 2024"
  - `getRelativeTime(timestamp)`: "2h ago", "3d ago", or formatted date

---

## Sample Data (Seed)

### Bay Area Venues

12 real venues including:
- 924 Gilman (Berkeley) - Punk/all-ages
- The Chapel (San Francisco) - Indie/folk
- Bottom of the Hill (San Francisco) - Rock
- The Fillmore (San Francisco) - Large capacity
- Yoshi's Oakland - Jazz
- And more...

### Sample Bands

10 fictional bands spanning all genres:
- The Midnight Waves (indie/alternative)
- Brass Monkey Collective (jazz/electronic)
- Voltage Kids (electronic/pop)
- The Rustic Hearts (folk/indie)
- Neon Vandals (rock/alternative)
- And more...

### Sample Events

10 upcoming events at various venues with realistic:
- Ticket prices ($8-30 range)
- RSVP counts
- Event descriptions

### Sample Open Dates

5 booking opportunities at major venues with:
- Offered pay ($250-500 range)
- Genre preferences
- Booking descriptions
