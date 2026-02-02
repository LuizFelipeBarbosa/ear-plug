# Venues API

This document details all venue-related queries and mutations in the Ear-Plug backend.

**Module:** `/convex/venues.ts`

---

## Table of Contents

1. [Queries](#queries)
   - [getById](#getbyid)
   - [list](#list)
   - [getSuggested](#getsuggested)
   - [search](#search)
   - [getNearby](#getnearby)
   - [getSavedVenues](#getsavedvenues)
   - [getOpenDates](#getopendates)
   - [getBandApplications](#getbandapplications)
   - [findByCoordinates](#findbycoordinates)
2. [Mutations](#mutations)
   - [toggleSave](#togglesave)
   - [applyToOpenDate](#applytoopendate)
   - [createFromPlace](#createfromplace)
3. [Type Definitions](#type-definitions)

---

## Queries

### getById

Get a venue by its Convex document ID.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ venueId: Id<"venues"> }` |
| **Returns** | `Venue \| null` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `venueId` | `Id<"venues">` | Yes | Convex document ID of the venue |

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function VenueDetail({ venueId }: { venueId: Id<"venues"> }) {
  const venue = useQuery(api.venues.getById, { venueId });

  if (venue === undefined) return <LoadingSpinner />;
  if (venue === null) return <NotFound />;

  return (
    <div>
      <h1>{venue.name}</h1>
      <p>{venue.address}, {venue.city}</p>
      <p>Capacity: {venue.capacity}</p>
    </div>
  );
}
```

---

### list

List all venues with optional city filtering.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ city?: string, limit?: number }` |
| **Returns** | `Venue[]` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `city` | `string` | No | - | Filter venues by city name (exact match) |
| `limit` | `number` | No | 50 | Maximum number of venues to return |

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function VenueDirectory() {
  const [selectedCity, setSelectedCity] = useState<string | undefined>();

  const venues = useQuery(api.venues.list, {
    city: selectedCity,
    limit: 30,
  });

  return (
    <div>
      <CityFilter value={selectedCity} onChange={setSelectedCity} />
      <div className="venue-grid">
        {venues?.map((venue) => (
          <VenueCard key={venue._id} venue={venue} />
        ))}
      </div>
    </div>
  );
}
```

---

### getSuggested

Get suggested venues for a band based on genre matching.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ genre?: Genre, limit?: number }` |
| **Returns** | `Venue[]` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `genre` | `Genre` | No | - | Prioritize venues that host this genre |
| `limit` | `number` | No | 10 | Maximum number of venues to return |

#### Behavior

- If genre is specified: Returns genre-matching venues first, followed by others
- If no genre: Returns venues in default order

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function SuggestedVenues({ bandGenre }: { bandGenre: Genre }) {
  const venues = useQuery(api.venues.getSuggested, {
    genre: bandGenre,
    limit: 5,
  });

  return (
    <div>
      <h2>Suggested Venues for You</h2>
      {venues?.map((venue) => (
        <VenueSuggestionCard key={venue._id} venue={venue} />
      ))}
    </div>
  );
}
```

---

### search

Search venues by name, city, or address.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ query: string, limit?: number }` |
| **Returns** | `Venue[]` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `query` | `string` | Yes | - | Search term (case-insensitive) |
| `limit` | `number` | No | 20 | Maximum number of results |

#### Search Behavior

- Scans up to 100 venues
- Matches against `name`, `city`, and `address` fields
- Case-insensitive partial matching

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function VenueSearch() {
  const [searchTerm, setSearchTerm] = useState("");

  const results = useQuery(
    api.venues.search,
    searchTerm.length >= 2
      ? { query: searchTerm, limit: 15 }
      : "skip"
  );

  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search venues..."
      />
      {results?.map((venue) => (
        <VenueSearchResult key={venue._id} venue={venue} />
      ))}
    </div>
  );
}
```

---

### getNearby

Get venues near a geographic location with calculated distances.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ lat: number, lng: number, radiusMiles?: number }` |
| **Returns** | `VenueWithDistance[]` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `lat` | `number` | Yes | - | Latitude of search center |
| `lng` | `number` | Yes | - | Longitude of search center |
| `radiusMiles` | `number` | No | 25 | Search radius in miles |

#### Response Schema

```typescript
{
  // All Venue fields...
  _id: Id<"venues">;
  name: string;
  address: string;
  city: string;
  // ...

  // Additional field
  distance: number;  // Distance from search point in miles
}
```

#### Behavior

- Uses Haversine formula for accurate distance calculation
- Returns venues sorted by distance (closest first)
- Filters venues outside the specified radius

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useGeolocation } from "@/hooks";

function NearbyVenues() {
  const { latitude, longitude, hasLocation } = useGeolocation();

  const venues = useQuery(
    api.venues.getNearby,
    hasLocation
      ? { lat: latitude!, lng: longitude!, radiusMiles: 10 }
      : "skip"
  );

  return (
    <div>
      <h2>Venues Near You</h2>
      {venues?.map((venue) => (
        <div key={venue._id}>
          <h3>{venue.name}</h3>
          <p>{venue.distance.toFixed(1)} miles away</p>
        </div>
      ))}
    </div>
  );
}
```

---

### getSavedVenues

Get the current user's saved/followed venues.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns `[]` if unauthenticated) |
| **Arguments** | None |
| **Returns** | `Venue[]` |

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function SavedVenues() {
  const savedVenues = useQuery(api.venues.getSavedVenues);

  if (savedVenues === undefined) return <LoadingSpinner />;

  if (savedVenues.length === 0) {
    return <EmptyState message="You haven't saved any venues yet" />;
  }

  return (
    <div>
      <h2>Saved Venues ({savedVenues.length})</h2>
      {savedVenues.map((venue) => (
        <VenueCard key={venue._id} venue={venue} saved />
      ))}
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useSavedVenues } from "@/hooks";

function Component() {
  const { savedVenues, isLoading, toggleSave } = useSavedVenues();
}
```

---

### getOpenDates

Get open booking dates for venues.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ venueId?: Id<"venues">, genre?: Genre, limit?: number }` |
| **Returns** | `OpenDateWithVenue[]` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `venueId` | `Id<"venues">` | No | - | Filter to specific venue |
| `genre` | `Genre` | No | - | Filter by preferred genre |
| `limit` | `number` | No | 20 | Maximum number of results |

#### Response Schema

```typescript
{
  // OpenDate fields
  _id: Id<"openDates">;
  venueId: Id<"venues">;
  date: number;            // Unix timestamp
  offeredPay?: number;     // Payment in cents
  genre?: Genre;           // Preferred genre
  status: "open" | "pending" | "filled";
  description?: string;
  createdAt: number;

  // Enriched venue data
  venue: Venue | null;
}
```

#### Behavior

- Only returns open dates with status `"open"`
- Only returns future dates (after current time)
- If genre filter specified, includes dates with matching genre OR no genre preference

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function OpenDatesListing({ bandGenre }: { bandGenre: Genre }) {
  const openDates = useQuery(api.venues.getOpenDates, {
    genre: bandGenre,
    limit: 10,
  });

  return (
    <div>
      <h2>Available Booking Dates</h2>
      {openDates?.map((openDate) => (
        <OpenDateCard
          key={openDate._id}
          openDate={openDate}
          venue={openDate.venue}
        />
      ))}
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useOpenDates } from "@/hooks";

function Component({ bandGenre }) {
  const { openDates, isLoading, applyToOpenDate } = useOpenDates({
    genre: bandGenre,
    limit: 15,
  });
}
```

---

### getBandApplications

Get all applications submitted by a band.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ bandId: Id<"bands"> }` |
| **Returns** | `ApplicationWithDetails[]` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `bandId` | `Id<"bands">` | Yes | The band to get applications for |

#### Response Schema

```typescript
{
  // Application fields
  _id: Id<"applications">;
  bandId: Id<"bands">;
  openDateId: Id<"openDates">;
  status: "pending" | "accepted" | "rejected";
  message?: string;
  appliedAt: number;
  respondedAt?: number;

  // Enriched data
  openDate: OpenDate | null;
  venue: Venue | null;
}
```

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function BandApplications({ bandId }: { bandId: Id<"bands"> }) {
  const applications = useQuery(api.venues.getBandApplications, { bandId });

  return (
    <div>
      <h2>Your Applications</h2>
      {applications?.map((app) => (
        <ApplicationCard
          key={app._id}
          application={app}
          venue={app.venue}
          date={app.openDate?.date}
        />
      ))}
    </div>
  );
}
```

---

### findByCoordinates

Find a venue by coordinates (for deduplication when creating venues).

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ lat: number, lng: number, tolerance?: number }` |
| **Returns** | `Venue \| null` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `lat` | `number` | Yes | - | Latitude to search |
| `lng` | `number` | Yes | - | Longitude to search |
| `tolerance` | `number` | No | 0.0001 | Coordinate tolerance (~10 meters) |

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// Check if venue already exists before creating
function CheckExistingVenue({ coordinates }) {
  const existingVenue = useQuery(api.venues.findByCoordinates, {
    lat: coordinates.lat,
    lng: coordinates.lng,
  });

  if (existingVenue) {
    return <p>This venue already exists: {existingVenue.name}</p>;
  }

  return <CreateVenueForm coordinates={coordinates} />;
}
```

---

## Mutations

### toggleSave

Save or unsave a venue (follow/unfollow).

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ venueId: Id<"venues"> }` |
| **Returns** | `{ action: "saved" \| "unsaved" }` |
| **Throws** | `"Not authenticated"`, `"User not found"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `venueId` | `Id<"venues">` | Yes | The venue to save/unsave |

#### Behavior

- If venue is not saved: Creates a `savedVenues` record, returns `{ action: "saved" }`
- If venue is already saved: Deletes the record, returns `{ action: "unsaved" }`

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function VenueCard({ venue, isSaved }) {
  const toggleSave = useMutation(api.venues.toggleSave);
  const [saved, setSaved] = useState(isSaved);

  const handleToggleSave = async () => {
    const result = await toggleSave({ venueId: venue._id });
    setSaved(result.action === "saved");
  };

  return (
    <div>
      <h3>{venue.name}</h3>
      <button onClick={handleToggleSave}>
        {saved ? "Unsave" : "Save"} Venue
      </button>
    </div>
  );
}
```

---

### applyToOpenDate

Apply to a venue's open booking date.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ openDateId: Id<"openDates">, bandId: Id<"bands">, message?: string }` |
| **Returns** | `Id<"applications">` |
| **Throws** | See below |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `openDateId` | `Id<"openDates">` | Yes | The open date to apply for |
| `bandId` | `Id<"bands">` | Yes | The band applying |
| `message` | `string` | No | Optional message to venue |

#### Possible Errors

| Error | Meaning |
|-------|---------|
| `"Not authenticated"` | No valid auth token |
| `"User not found"` | User doesn't exist in Convex |
| `"Not authorized to apply for this band"` | User doesn't own the band |
| `"Already applied to this open date"` | Duplicate application |
| `"This date is no longer available"` | Open date status is not "open" |

#### Side Effects

- Creates an `applications` record with status `"pending"`
- Updates the open date status to `"pending"`

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function ApplyToDateForm({ openDate, bandId }) {
  const applyToOpenDate = useMutation(api.venues.applyToOpenDate);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    setError(null);
    try {
      await applyToOpenDate({
        openDateId: openDate._id,
        bandId,
        message: message || undefined,
      });
      // Show success message
    } catch (err) {
      if (err.message === "Already applied to this open date") {
        setError("You've already applied for this date");
      } else if (err.message === "This date is no longer available") {
        setError("Sorry, this date is no longer available");
      } else {
        setError("Failed to apply");
      }
    }
  };

  return (
    <div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message to venue (optional)"
      />
      <button onClick={handleApply}>Apply for This Date</button>
    </div>
  );
}
```

---

### createFromPlace

Create a new venue or find an existing one from Google Places data.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | See below |
| **Returns** | `Id<"venues">` |
| **Throws** | `"Not authenticated"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Venue name |
| `address` | `string` | Yes | Street address |
| `city` | `string` | Yes | City name |
| `coordinates` | `{ lat: number, lng: number }` | Yes | Geographic coordinates |
| `placeId` | `string` | No | Google Places ID |
| `capacity` | `number` | No | Default: 100 |
| `description` | `string` | No | Venue description |
| `genres` | `Genre[]` | No | Genres hosted at venue |

#### Deduplication Logic

1. First checks for existing venue with matching `name` and `address` in the same city
2. Then checks for existing venue within ~10 meters of the coordinates
3. If match found: Returns existing venue ID
4. If no match: Creates new venue

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function CreateEventWithVenue() {
  const createFromPlace = useMutation(api.venues.createFromPlace);

  const handlePlaceSelected = async (place: google.maps.places.PlaceResult) => {
    const venueId = await createFromPlace({
      name: place.name!,
      address: place.formatted_address!,
      city: extractCity(place.address_components),
      coordinates: {
        lat: place.geometry!.location!.lat(),
        lng: place.geometry!.location!.lng(),
      },
      placeId: place.place_id,
    });

    // Use venueId to create event
  };

  return <PlaceAutocomplete onSelect={handlePlaceSelected} />;
}
```

---

## Type Definitions

### Venue

```typescript
interface Venue {
  _id: Id<"venues">;
  _creationTime: number;
  name: string;
  address: string;
  city: string;
  capacity: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  images?: string[];
  description?: string;
  genres?: Genre[];
}
```

### VenueWithDistance

```typescript
interface VenueWithDistance extends Venue {
  distance: number;  // Distance in miles
}
```

### OpenDate

```typescript
interface OpenDate {
  _id: Id<"openDates">;
  _creationTime: number;
  venueId: Id<"venues">;
  date: number;                // Unix timestamp
  offeredPay?: number;         // In cents
  genre?: Genre;               // Preferred genre
  status: "open" | "pending" | "filled";
  description?: string;
  createdAt: number;
}
```

### Application

```typescript
interface Application {
  _id: Id<"applications">;
  _creationTime: number;
  bandId: Id<"bands">;
  openDateId: Id<"openDates">;
  status: "pending" | "accepted" | "rejected";
  message?: string;
  appliedAt: number;
  respondedAt?: number;
}
```

### Coordinates

```typescript
interface Coordinates {
  lat: number;
  lng: number;
}
```

---

## Database Schema

### Table: `venues`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Venue name |
| `address` | `string` | Street address |
| `city` | `string` | City name |
| `capacity` | `number` | Maximum capacity |
| `coordinates` | `{ lat, lng }` | Geographic location |
| `images` | `string[]?` | Image URLs |
| `description` | `string?` | Venue description |
| `genres` | `Genre[]?` | Genres hosted |

### Table: `savedVenues`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `Id<"users">` | User who saved the venue |
| `venueId` | `Id<"venues">` | The saved venue |
| `createdAt` | `number` | When saved |

### Table: `openDates`

| Field | Type | Description |
|-------|------|-------------|
| `venueId` | `Id<"venues">` | The venue |
| `date` | `number` | Date timestamp |
| `offeredPay` | `number?` | Payment offered (cents) |
| `genre` | `Genre?` | Preferred genre |
| `status` | `"open" \| "pending" \| "filled"` | Booking status |
| `description` | `string?` | Additional details |
| `createdAt` | `number` | Creation timestamp |

### Table: `applications`

| Field | Type | Description |
|-------|------|-------------|
| `bandId` | `Id<"bands">` | The applying band |
| `openDateId` | `Id<"openDates">` | The open date |
| `status` | `"pending" \| "accepted" \| "rejected"` | Application status |
| `message` | `string?` | Band's message |
| `appliedAt` | `number` | Application timestamp |
| `respondedAt` | `number?` | Response timestamp |

### Indexes

**venues:**
| Index | Fields | Purpose |
|-------|--------|---------|
| `by_city` | `city` | Filter venues by city |
| `by_name` | `name` | Look up venues by name |

**savedVenues:**
| Index | Fields | Purpose |
|-------|--------|---------|
| `by_user` | `userId` | Get user's saved venues |
| `by_venue` | `venueId` | Get users who saved a venue |
| `by_user_venue` | `userId, venueId` | Check if user saved venue |

**openDates:**
| Index | Fields | Purpose |
|-------|--------|---------|
| `by_venue` | `venueId` | Get venue's open dates |
| `by_date` | `date` | Sort by date |
| `by_status` | `status` | Filter by status |
| `by_genre` | `genre` | Filter by genre |

**applications:**
| Index | Fields | Purpose |
|-------|--------|---------|
| `by_band` | `bandId` | Get band's applications |
| `by_open_date` | `openDateId` | Get applications for date |
| `by_band_open_date` | `bandId, openDateId` | Check for duplicate |
| `by_status` | `status` | Filter by status |

---

## Geospatial Utilities

The venues module uses utility functions from `/convex/utils/geo.ts`:

### haversineDistance

Calculate distance between two coordinates in miles.

```typescript
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number
```

### coordinatesMatch

Check if two coordinates are within tolerance.

```typescript
function coordinatesMatch(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  tolerance?: number  // Default: 0.0001 (~10 meters)
): boolean
```

### Constants

```typescript
const EARTH_RADIUS_MILES = 3959;
const COORDINATE_TOLERANCE = 0.0001;
```

---

## Related Documentation

- [Events API](./events.md) - Creating events at venues
- [Bands API](./bands.md) - Bands applying to open dates
- [Messages API](./messages.md) - Band-venue conversations
