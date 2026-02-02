# User Roles: Fan vs Musician

Ear-Plug supports two distinct user roles that fundamentally change the application experience. Understanding these roles is essential for both using and developing the platform.

---

## Overview

| Aspect | Fan | Musician |
|--------|-----|----------|
| **Primary Goal** | Discover and attend live music | Promote shows and find gigs |
| **Home Screen** | Interactive map with events | Dashboard with stats and opportunities |
| **Calendar View** | Events I am attending | Shows I am performing |
| **Can Create Events** | No | Yes |
| **Can Create Band Profile** | No | Yes |
| **Can Message Venues** | No | Yes |
| **Can Apply to Open Dates** | No | Yes |
| **Can RSVP to Events** | Yes | Yes (as attendee) |
| **Can Save Artists/Venues** | Yes | Yes |

---

## Fan Role

### Purpose

Fans are live music enthusiasts who use Ear-Plug to discover, track, and attend local shows in the Bay Area.

### Data Model

Fan users have these key fields:

```typescript
interface FanUser {
  role: "fan";
  name: string;
  email: string;
  location?: string;       // City for filtering nearby events
  avatar?: string;
  topGenres?: Genre[];     // Up to 5 preferred genres
  showsAttended?: number;  // Counter of events attended
  memberSince: number;     // Timestamp
}
```

### Home Experience (Discover)

The fan home screen is an interactive map showing:

- Nearby events as map pins
- Filter by genre (indie, rock, jazz, electronic, folk, pop, alternative)
- Filter by distance radius (1, 5, 10, 25, 50 miles)
- Search by event name, band, or venue
- Tap pins to see event details

```typescript
// Fan home screen rendering
if (isFan) {
  return <FanMapView />;
}
```

### Calendar Experience (My Events)

The fan calendar shows:

- **Upcoming RSVPs** - Events the fan plans to attend
- **Liked Events** - Events saved for consideration
- **Past Events** - History of attended shows

RSVPs appear in the calendar view. Liked events appear in a separate section but not the calendar.

### Key Actions

| Action | Description |
|--------|-------------|
| RSVP | Mark intention to attend. Toggles on/off. |
| Like | Save event for later. Does not appear in calendar. |
| Save Artist | Follow a band. Get notifications for their new events. |
| Save Venue | Follow a venue. Get notifications for events there. |
| View Event | See full event details, band info, venue info. |

### Notifications Received

- Event reminders for upcoming RSVPs
- New events from saved artists
- New events at saved venues

---

## Musician Role

### Purpose

Musicians use Ear-Plug to promote their shows, find booking opportunities, and connect with venues.

### Data Model

Musician users have these key fields, plus an associated band:

```typescript
interface MusicianUser {
  role: "musician";
  name: string;
  email: string;
  location?: string;
  avatar?: string;
  memberSince: number;
}

interface Band {
  userId: Id<"users">;       // Owner
  name: string;
  genres: Genre[];           // 1-5 genres
  location: string;          // Home base city
  image?: string;
  bio?: string;              // Max 1000 chars
  memberCount?: number;      // 1-50
  socialLinks?: {
    spotify?: string;
    instagram?: string;
    website?: string;
    youtube?: string;
    soundcloud?: string;
    bandcamp?: string;
  };
}
```

### Home Experience (Dashboard)

The musician home screen shows:

- **Stats Cards**
  - Shows this month
  - Total RSVPs across all events
  - New fans (recent followers)

- **Suggested Venues** - Venues matching band's genres

- **Open Dates** - Booking opportunities to apply to

```typescript
// Musician home screen rendering
if (isMusician) {
  return <BandDashboard />;
}
```

### Calendar Experience (My Shows)

The musician calendar shows:

- **Upcoming Shows** - Confirmed events for the band
- **Create New Gig** - Button to add events
- **Application Status** - Track submitted applications

### Key Actions

| Action | Description |
|--------|-------------|
| Create Band | One-time setup of band profile |
| Edit Band | Update band details, genres, social links |
| Create Event | Post a new gig/show |
| Apply to Open Date | Submit application for booking |
| Message Venue | Start/continue conversation |
| View Analytics | See engagement metrics |

### Notifications Received

- Application status updates (accepted/rejected)
- New messages from venues

---

## Role Selection

### Onboarding Flow

1. User lands on the landing page (`/`)
2. Presented with role selection: "I'm a Fan" / "I'm a Musician"
3. Selection stored in localStorage
4. User proceeds to sign up/sign in with Clerk
5. After authentication:
   - User record created/updated in Convex
   - Role applied via `updateRole` mutation
6. Redirect to `/home` with role-appropriate experience

### Role Persistence

```typescript
// During onboarding
localStorage.setItem("selectedRole", role);

// After auth, apply to database
const updateRole = useMutation(api.users.updateRole);
await updateRole({ role });
```

### Checking Role in Components

```typescript
import { useCurrentUser } from "@/hooks/useUser";

export function SomeComponent() {
  const { user, isFan, isMusician, isLoading } = useCurrentUser();

  if (isLoading) return <Loading />;

  if (isFan) {
    return <FanVersion />;
  }

  if (isMusician) {
    return <MusicianVersion />;
  }
}
```

### Checking Role in Convex

```typescript
export const createEvent = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (user.role !== "musician") {
      throw new Error("Only musicians can create events");
    }

    // Proceed with event creation
  },
});
```

---

## UI Differences by Role

### Navigation

| Tab | Fan | Musician |
|-----|-----|----------|
| Home | Map icon | Dashboard icon |
| Calendar | "My Events" | "My Shows" |
| Messages | Hidden | Visible |
| Profile | Fan profile | Band profile + analytics |

### Home Tab

| Element | Fan | Musician |
|---------|-----|----------|
| Header | "Discover" | "Dashboard" |
| Main Content | Interactive map | Stats + opportunities |
| Filters | Genre, distance | Genre filters on open dates |
| Primary Action | RSVP/Like | Apply to open date |

### Profile Tab

| Section | Fan | Musician |
|---------|-----|----------|
| Profile Info | Name, location, avatar | Band name, image, bio |
| Genres | "Top Genres" (preferences) | "Genres" (band style) |
| Stats | Shows attended | RSVPs, followers, shows |
| Saved Items | Artists, venues | Venues (for booking) |
| Additional | - | Social links, analytics |

---

## Shared Functionality

Both roles can:

- View any event details
- View any band profile
- View any venue information
- RSVP to events (musicians as attendees)
- Like events
- Save artists and venues
- Receive notifications
- Edit personal profile settings

---

## Role Switching

Currently, role switching is not supported in the UI. The role is set during onboarding and persists.

To change roles (for development/testing):

1. Via Convex Dashboard: Edit user record directly
2. Via mutation: `updateRole({ role: "musician" })`

Future consideration: Add role switching in profile settings with appropriate data migration.

---

## Development Guidelines

### Creating Role-Specific Features

1. **Always check role** before rendering role-specific UI
2. **Use the `useCurrentUser` hook** for consistent role checking
3. **Handle loading states** - role is undefined while loading
4. **Validate in Convex** - do not trust client-side role checks alone

### Example Pattern

```typescript
// Component
export function FeaturePage() {
  const { isMusician, isLoading } = useCurrentUser();

  if (isLoading) return <Loading />;

  if (!isMusician) {
    return <Redirect href="/home" />;
  }

  return <MusicianOnlyFeature />;
}

// Convex mutation
export const musicianOnlyAction = mutation({
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (user.role !== "musician") {
      throw new Error("Unauthorized");
    }

    // Feature logic
  },
});
```

---

## Next Steps

- See [Real-Time Data](./real-time-data.md) for how data updates work
- See [Notifications](./notifications.md) for the notification system
- See [Adding a Feature](../tutorials/adding-a-feature.md) to implement role-specific features
