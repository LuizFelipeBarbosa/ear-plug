# Events API

This document details all event-related queries and mutations in the Ear-Plug backend.

**Module:** `/convex/events.ts`

---

## Table of Contents

1. [Queries](#queries)
   - [listUpcoming](#listupcoming)
   - [listByGenre](#listbygenre)
   - [getById](#getbyid)
   - [listByBand](#listbyband)
   - [listByVenue](#listbyvenue)
   - [search](#search)
   - [listNearby](#listnearby)
   - [getUserRsvps](#getuserrsvps)
   - [getUserPastRsvps](#getuserpastrsvps)
   - [getUserLikes](#getuserlikes)
   - [getUserEventStatus](#getusereventstatus)
2. [Mutations](#mutations)
   - [rsvp](#rsvp)
   - [toggleLike](#togglelike)
   - [create](#create)
   - [createWithVenue](#createwithvenue)
3. [Type Definitions](#type-definitions)

---

## Queries

### listUpcoming

Get all upcoming events sorted by date.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ limit?: number }` |
| **Returns** | `EventWithDetails[]` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `limit` | `number` | No | 50 | Maximum number of events |

#### Response Schema

```typescript
{
  // Event fields
  _id: Id<"events">;
  title: string;
  bandId: Id<"bands">;
  venueId: Id<"venues">;
  dateTime: number;
  image?: string;
  rsvpCount: number;
  capacity: number;
  price?: number;
  description?: string;
  genres?: Genre[];
  status: "confirmed" | "hold" | "available";

  // Enriched data
  band: Band | null;
  venue: Venue | null;
}
```

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function UpcomingEvents() {
  const events = useQuery(api.events.listUpcoming, { limit: 20 });

  if (events === undefined) return <LoadingSpinner />;

  return (
    <div>
      {events.map((event) => (
        <EventCard
          key={event._id}
          event={event}
          band={event.band}
          venue={event.venue}
        />
      ))}
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useEvents } from "@/hooks";

function Component() {
  const { events, isLoading } = useEvents({ limit: 20 });
}
```

---

### listByGenre

Get upcoming events filtered by genre.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ genre: Genre, limit?: number }` |
| **Returns** | `EventWithDetails[]` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `genre` | `Genre` | Yes | - | Genre to filter by |
| `limit` | `number` | No | 50 | Maximum number of events |

#### Behavior

- Scans up to 200 upcoming events
- Checks `genres` array first (multi-genre support)
- Falls back to legacy `genre` field
- Returns events matching the specified genre

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function GenreEvents() {
  const [selectedGenre, setSelectedGenre] = useState<Genre>("indie");

  const events = useQuery(api.events.listByGenre, {
    genre: selectedGenre,
    limit: 30,
  });

  return (
    <div>
      <GenreFilter value={selectedGenre} onChange={setSelectedGenre} />
      <EventGrid events={events} />
    </div>
  );
}
```

---

### getById

Get a single event by ID with full details.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ eventId: Id<"events"> }` |
| **Returns** | `EventWithDetails \| null` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `eventId` | `Id<"events">` | Yes | Convex document ID |

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function EventPage({ eventId }: { eventId: Id<"events"> }) {
  const event = useQuery(api.events.getById, { eventId });

  if (event === undefined) return <LoadingSpinner />;
  if (event === null) return <NotFound />;

  return (
    <div>
      <h1>{event.title}</h1>
      <p>By: {event.band?.name}</p>
      <p>At: {event.venue?.name}</p>
      <p>RSVPs: {event.rsvpCount} / {event.capacity}</p>
    </div>
  );
}
```

---

### listByBand

Get events for a specific band.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ bandId: Id<"bands">, includesPast?: boolean }` |
| **Returns** | `EventWithVenue[]` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `bandId` | `Id<"bands">` | Yes | - | The band to get events for |
| `includesPast` | `boolean` | No | false | Include past events |

#### Response Schema

```typescript
{
  // Event fields...
  venue: Venue | null;
}
```

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function BandShows({ bandId, showPast = false }) {
  const events = useQuery(api.events.listByBand, {
    bandId,
    includesPast: showPast,
  });

  return (
    <div>
      <h2>{showPast ? "All Shows" : "Upcoming Shows"}</h2>
      {events?.map((event) => (
        <ShowCard key={event._id} event={event} venue={event.venue} />
      ))}
    </div>
  );
}
```

---

### listByVenue

Get upcoming events at a specific venue.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ venueId: Id<"venues"> }` |
| **Returns** | `EventWithBand[]` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `venueId` | `Id<"venues">` | Yes | The venue to get events for |

#### Response Schema

```typescript
{
  // Event fields...
  band: Band | null;
}
```

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function VenueCalendar({ venueId }) {
  const events = useQuery(api.events.listByVenue, { venueId });

  return (
    <div>
      <h2>Upcoming Events</h2>
      {events?.map((event) => (
        <EventRow key={event._id} event={event} band={event.band} />
      ))}
    </div>
  );
}
```

---

### search

Search events by title, band name, or venue name.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ query: string, limit?: number }` |
| **Returns** | `EventWithDetails[]` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `query` | `string` | Yes | - | Search term (case-insensitive) |
| `limit` | `number` | No | 20 | Maximum results |

#### Search Behavior

- Scans up to 100 upcoming events
- Matches against `title`, `band.name`, and `venue.name`
- Case-insensitive partial matching

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function EventSearch() {
  const [searchTerm, setSearchTerm] = useState("");

  const results = useQuery(
    api.events.search,
    searchTerm.length >= 2
      ? { query: searchTerm, limit: 15 }
      : "skip"
  );

  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search events..."
      />
      {results?.map((event) => (
        <EventSearchResult key={event._id} event={event} />
      ))}
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useSearchEvents } from "@/hooks";

function Component() {
  const { results, isLoading } = useSearchEvents("indie rock");
}
```

---

### listNearby

Get events near a geographic location.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | See below |
| **Returns** | `EventWithDetailsAndDistance[]` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `latitude` | `number` | Yes | - | Search center latitude |
| `longitude` | `number` | Yes | - | Search center longitude |
| `radiusMiles` | `number` | Yes | - | Search radius in miles |
| `genre` | `Genre` | No | - | Filter by genre |
| `limit` | `number` | No | 50 | Maximum results |

#### Response Schema

```typescript
{
  // EventWithDetails fields...
  distance: number;  // Distance in miles (1 decimal precision)
}
```

#### Behavior

- Scans up to 200 upcoming events
- Calculates distance using Haversine formula
- Filters by radius and optionally by genre
- Returns results sorted by distance (closest first)

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useGeolocation } from "@/hooks";

function NearbyEvents() {
  const { latitude, longitude, hasLocation } = useGeolocation();
  const [radius, setRadius] = useState(10);
  const [genre, setGenre] = useState<Genre | undefined>();

  const events = useQuery(
    api.events.listNearby,
    hasLocation
      ? {
          latitude: latitude!,
          longitude: longitude!,
          radiusMiles: radius,
          genre,
          limit: 30,
        }
      : "skip"
  );

  return (
    <div>
      <DistanceSlider value={radius} onChange={setRadius} />
      <GenreFilter value={genre} onChange={setGenre} />

      {events?.map((event) => (
        <EventCard
          key={event._id}
          event={event}
          distance={event.distance}
        />
      ))}
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useNearbyEvents } from "@/hooks";

function Component() {
  const { events, isLoading } = useNearbyEvents({
    latitude: 37.8,
    longitude: -122.4,
    radiusMiles: 10,
    genre: "indie",
  });
}
```

---

### getUserRsvps

Get the current user's upcoming RSVP'd events.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns `[]` if unauthenticated) |
| **Arguments** | None |
| **Returns** | `EventWithDetails[]` |

#### Response Notes

- Only returns future events
- Sorted by date (soonest first)
- Includes `rsvpedAt` timestamp

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function MyUpcomingEvents() {
  const rsvps = useQuery(api.events.getUserRsvps);

  if (rsvps === undefined) return <LoadingSpinner />;

  if (rsvps.length === 0) {
    return <EmptyState message="No upcoming RSVPs" />;
  }

  return (
    <div>
      <h2>Your Upcoming Events</h2>
      {rsvps.map((event) => (
        <EventCard key={event._id} event={event} />
      ))}
    </div>
  );
}
```

---

### getUserPastRsvps

Get the current user's past RSVP'd events.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns `[]` if unauthenticated) |
| **Arguments** | None |
| **Returns** | `EventWithDetails[]` |

#### Response Notes

- Only returns past events
- Sorted by date (most recent first)
- Includes `rsvpedAt` timestamp

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function EventHistory() {
  const pastEvents = useQuery(api.events.getUserPastRsvps);

  return (
    <div>
      <h2>Events You've Attended ({pastEvents?.length || 0})</h2>
      {pastEvents?.map((event) => (
        <PastEventCard key={event._id} event={event} />
      ))}
    </div>
  );
}
```

---

### getUserLikes

Get the current user's liked events (excluding RSVP'd events).

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns `[]` if unauthenticated) |
| **Arguments** | None |
| **Returns** | `EventWithDetails[]` |

#### Response Notes

- Excludes events the user has RSVP'd to
- Sorted by date (soonest first)
- Includes `likedAt` timestamp

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function SavedEvents() {
  const likedEvents = useQuery(api.events.getUserLikes);

  return (
    <div>
      <h2>Events You're Interested In</h2>
      {likedEvents?.map((event) => (
        <EventCard key={event._id} event={event} liked />
      ))}
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useUserEvents } from "@/hooks";

function Component() {
  const { rsvps, likes, pastRsvps, isLoading } = useUserEvents();
}
```

---

### getUserEventStatus

Check if the current user has RSVP'd or liked an event.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ eventId: Id<"events"> }` |
| **Returns** | `{ hasRsvp: boolean, hasLiked: boolean }` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `eventId` | `Id<"events">` | Yes | The event to check |

#### Response (Unauthenticated)

```typescript
{ hasRsvp: false, hasLiked: false }
```

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function EventActions({ eventId }) {
  const status = useQuery(api.events.getUserEventStatus, { eventId });

  return (
    <div>
      <RSVPButton
        eventId={eventId}
        active={status?.hasRsvp}
      />
      <LikeButton
        eventId={eventId}
        active={status?.hasLiked}
      />
    </div>
  );
}
```

---

## Mutations

### rsvp

RSVP or un-RSVP to an event (toggle).

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ eventId: Id<"events"> }` |
| **Returns** | `{ action: "added" \| "removed" }` |
| **Throws** | `"Not authenticated"`, `"User not found"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `eventId` | `Id<"events">` | Yes | The event to RSVP to |

#### Behavior

- **If not RSVP'd:** Creates RSVP record, increments event's `rsvpCount`, returns `{ action: "added" }`
- **If already RSVP'd:** Deletes RSVP record, decrements `rsvpCount`, returns `{ action: "removed" }`

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function RSVPButton({ eventId, active }) {
  const rsvp = useMutation(api.events.rsvp);
  const [isRsvpd, setIsRsvpd] = useState(active);

  const handleRSVP = async () => {
    const result = await rsvp({ eventId });
    setIsRsvpd(result.action === "added");
  };

  return (
    <button onClick={handleRSVP}>
      {isRsvpd ? "Cancel RSVP" : "RSVP"}
    </button>
  );
}
```

---

### toggleLike

Like or unlike an event (toggle).

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ eventId: Id<"events"> }` |
| **Returns** | `{ action: "liked" \| "unliked" }` |
| **Throws** | `"Not authenticated"`, `"User not found"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `eventId` | `Id<"events">` | Yes | The event to like |

#### Behavior

- **If not liked:** Creates like record, returns `{ action: "liked" }`
- **If already liked:** Deletes like record, returns `{ action: "unliked" }`

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function LikeButton({ eventId, active }) {
  const toggleLike = useMutation(api.events.toggleLike);
  const [isLiked, setIsLiked] = useState(active);

  const handleLike = async () => {
    const result = await toggleLike({ eventId });
    setIsLiked(result.action === "liked");
  };

  return (
    <button onClick={handleLike}>
      {isLiked ? "Unlike" : "Like"}
    </button>
  );
}
```

---

### create

Create a new event for a band.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | See below |
| **Returns** | `Id<"events">` |
| **Throws** | `"Not authenticated"`, `"Band not found"`, `"Not authorized to create events for this band"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Event title |
| `bandId` | `Id<"bands">` | Yes | The band hosting the event |
| `venueId` | `Id<"venues">` | Yes | The venue location |
| `dateTime` | `number` | Yes | Unix timestamp |
| `genres` | `Genre[]` | Yes | Event genres |
| `capacity` | `number` | Yes | Maximum attendees |
| `image` | `string` | No | Event image URL |
| `price` | `number` | No | Ticket price in cents |
| `description` | `string` | No | Event description |
| `genre` | `Genre` | No | Legacy single genre field |

#### Side Effects

- Creates event with `rsvpCount: 0` and `status: "confirmed"`
- Schedules notifications for fans who saved the venue or band

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function CreateEventForm({ bandId }) {
  const createEvent = useMutation(api.events.create);

  const handleSubmit = async (data) => {
    const eventId = await createEvent({
      title: data.title,
      bandId,
      venueId: data.selectedVenueId,
      dateTime: data.dateTime.getTime(),
      genres: data.genres,
      capacity: data.capacity,
      price: data.isFree ? undefined : data.price * 100, // Convert to cents
      description: data.description,
    });

    router.push(`/gig/${eventId}`);
  };

  return <EventForm onSubmit={handleSubmit} />;
}
```

---

### createWithVenue

Create a new event with automatic venue creation from Google Places data.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | See below |
| **Returns** | `{ eventId: Id<"events">, venueId: Id<"venues"> }` |
| **Throws** | `"Not authenticated"`, `"Band not found"`, `"Not authorized to create events for this band"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Event title |
| `bandId` | `Id<"bands">` | Yes | The band hosting the event |
| `dateTime` | `number` | Yes | Unix timestamp |
| `genres` | `Genre[]` | Yes | Event genres |
| `venueName` | `string` | Yes | Venue name |
| `venueAddress` | `string` | Yes | Venue street address |
| `venueCity` | `string` | Yes | Venue city |
| `venueCoordinates` | `{ lat, lng }` | Yes | Venue coordinates |
| `venuePlaceId` | `string` | No | Google Places ID |
| `image` | `string` | No | Event image URL |
| `capacity` | `number` | No | Default: 100 |
| `price` | `number` | No | Ticket price in cents |
| `description` | `string` | No | Event description |
| `genre` | `Genre` | No | Legacy single genre field |

#### Behavior

1. Checks if venue exists by coordinates (within ~10 meters)
2. Creates new venue if not found
3. Creates event with the venue
4. Schedules notifications for relevant fans

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function CreateGigModal({ bandId }) {
  const createWithVenue = useMutation(api.events.createWithVenue);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const handleSubmit = async (data) => {
    const result = await createWithVenue({
      title: data.title,
      bandId,
      dateTime: data.dateTime.getTime(),
      genres: data.genres,
      venueName: selectedPlace.name,
      venueAddress: selectedPlace.formatted_address,
      venueCity: extractCity(selectedPlace.address_components),
      venueCoordinates: {
        lat: selectedPlace.geometry.location.lat(),
        lng: selectedPlace.geometry.location.lng(),
      },
      venuePlaceId: selectedPlace.place_id,
      capacity: data.capacity,
      price: data.price ? data.price * 100 : undefined,
    });

    // Both eventId and venueId available
    console.log("Created event:", result.eventId);
    console.log("At venue:", result.venueId);
  };

  return (
    <div>
      <PlaceAutocomplete onSelect={setSelectedPlace} />
      {selectedPlace && <EventDetailsForm onSubmit={handleSubmit} />}
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useSharedEvents } from "@/hooks";

function Component() {
  const { createEvent } = useSharedEvents();

  // Handles venue creation automatically
  const result = await createEvent({
    title: "My Show",
    bandId,
    date: "2024-03-15",
    startTime: "20:00",
    venue: {
      name: "The Fillmore",
      address: "1805 Geary Blvd",
      city: "San Francisco",
      coordinates: { lat: 37.784, lng: -122.433 },
    },
    genres: ["rock", "indie"],
  });
}
```

---

## Type Definitions

### Event

```typescript
interface Event {
  _id: Id<"events">;
  _creationTime: number;
  title: string;
  bandId: Id<"bands">;
  venueId: Id<"venues">;
  dateTime: number;           // Unix timestamp
  image?: string;
  rsvpCount: number;
  capacity: number;
  price?: number;             // In cents
  description?: string;
  genres?: Genre[];           // Multiple genres
  genre?: Genre;              // Legacy field
  status: "confirmed" | "hold" | "available";
}
```

### EventWithDetails

```typescript
interface EventWithDetails extends Event {
  band: Band | null;
  venue: Venue | null;
}
```

### EventWithVenue

```typescript
interface EventWithVenue extends Event {
  venue: Venue | null;
}
```

### EventWithBand

```typescript
interface EventWithBand extends Event {
  band: Band | null;
}
```

### EventWithDetailsAndDistance

```typescript
interface EventWithDetailsAndDistance extends EventWithDetails {
  distance: number;  // Miles from search point
}
```

### EventStatus

```typescript
type EventStatus = "confirmed" | "hold" | "available";
```

---

## Database Schema

### Table: `events`

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Event title |
| `bandId` | `Id<"bands">` | Hosting band |
| `venueId` | `Id<"venues">` | Event location |
| `dateTime` | `number` | Event timestamp |
| `image` | `string?` | Event image URL |
| `rsvpCount` | `number` | Current RSVPs |
| `capacity` | `number` | Max capacity |
| `price` | `number?` | Price in cents |
| `description` | `string?` | Event description |
| `genres` | `Genre[]?` | Event genres |
| `genre` | `Genre?` | Legacy single genre |
| `status` | `EventStatus` | Booking status |

### Table: `rsvps`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `Id<"users">` | User who RSVP'd |
| `eventId` | `Id<"events">` | The event |
| `createdAt` | `number` | RSVP timestamp |

### Table: `likes`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `Id<"users">` | User who liked |
| `eventId` | `Id<"events">` | The event |
| `createdAt` | `number` | Like timestamp |

### Indexes

**events:**
| Index | Fields | Purpose |
|-------|--------|---------|
| `by_band` | `bandId` | Get band's events |
| `by_venue` | `venueId` | Get venue's events |
| `by_date` | `dateTime` | Sort by date |
| `by_status` | `status` | Filter by status |

**rsvps:**
| Index | Fields | Purpose |
|-------|--------|---------|
| `by_user` | `userId` | Get user's RSVPs |
| `by_event` | `eventId` | Get event's RSVPs |
| `by_user_event` | `userId, eventId` | Check if user RSVP'd |

**likes:**
| Index | Fields | Purpose |
|-------|--------|---------|
| `by_user` | `userId` | Get user's likes |
| `by_event` | `eventId` | Get event's likes |
| `by_user_event` | `userId, eventId` | Check if user liked |

---

## Related Documentation

- [Bands API](./bands.md) - Band management
- [Venues API](./venues.md) - Venue management
- [Notifications API](./notifications.md) - Event notifications
