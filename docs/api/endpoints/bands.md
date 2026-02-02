# Bands API

This document details all band-related queries and mutations in the Ear-Plug backend.

**Module:** `/convex/bands.ts`

---

## Table of Contents

1. [Queries](#queries)
   - [getById](#getbyid)
   - [getCurrentUserBand](#getcurrentuserband)
   - [getBandWithStats](#getbandwithstats)
   - [list](#list)
   - [search](#search)
   - [getSavedBands](#getsavedbands)
   - [getAnalytics](#getanalytics)
2. [Mutations](#mutations)
   - [create](#create)
   - [update](#update)
   - [toggleSave](#togglesave)
3. [Type Definitions](#type-definitions)

---

## Queries

### getById

Get a band by its Convex document ID.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ bandId: Id<"bands"> }` |
| **Returns** | `Band \| null` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `bandId` | `Id<"bands">` | Yes | Convex document ID of the band |

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function BandProfile({ bandId }: { bandId: Id<"bands"> }) {
  const band = useQuery(api.bands.getById, { bandId });

  if (band === undefined) return <LoadingSpinner />;
  if (band === null) return <NotFound />;

  return (
    <div>
      <h1>{band.name}</h1>
      <p>{band.location}</p>
      <p>Genres: {band.genres?.join(", ")}</p>
    </div>
  );
}
```

---

### getCurrentUserBand

Get the current authenticated musician's band.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns `null` if not authenticated or not a musician) |
| **Arguments** | None |
| **Returns** | `Band \| null` |

#### Behavior

- Returns `null` if user is not authenticated
- Returns `null` if user's role is not `"musician"`
- Returns `null` if musician has not created a band yet
- Returns the band if found

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function MusicianDashboard() {
  const band = useQuery(api.bands.getCurrentUserBand);

  if (band === undefined) return <LoadingSpinner />;

  if (band === null) {
    return <CreateBandPrompt />;
  }

  return (
    <div>
      <h1>Welcome, {band.name}</h1>
      {/* Dashboard content */}
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useCurrentBand } from "@/hooks";

function Component() {
  const { band, isLoading, createBand } = useCurrentBand();
}
```

---

### getBandWithStats

Get the current user's band with computed statistics for the dashboard.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns `null` if not musician) |
| **Arguments** | None |
| **Returns** | `BandWithStats \| null` |

#### Response Schema

```typescript
{
  // All Band fields...
  _id: Id<"bands">;
  name: string;
  genres?: Genre[];
  location: string;
  // ...

  // Computed stats
  stats: {
    showsThisMonth: number;  // Events this calendar month
    totalRsvps: number;      // Sum of RSVPs across all events
    newFans: number;         // Number of users who saved this band
  }
}
```

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function BandDashboard() {
  const bandWithStats = useQuery(api.bands.getBandWithStats);

  if (!bandWithStats) return <LoadingSpinner />;

  return (
    <div>
      <h1>{bandWithStats.name}</h1>
      <div className="stats-grid">
        <StatCard label="Shows This Month" value={bandWithStats.stats.showsThisMonth} />
        <StatCard label="Total RSVPs" value={bandWithStats.stats.totalRsvps} />
        <StatCard label="Fans" value={bandWithStats.stats.newFans} />
      </div>
    </div>
  );
}
```

---

### list

List all bands with optional genre filtering.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ genre?: Genre, limit?: number }` |
| **Returns** | `Band[]` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `genre` | `Genre` | No | - | Filter bands by genre |
| `limit` | `number` | No | 50 | Maximum number of bands to return |

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function BandDirectory() {
  const [selectedGenre, setSelectedGenre] = useState<Genre | undefined>();

  const bands = useQuery(api.bands.list, {
    genre: selectedGenre,
    limit: 20,
  });

  return (
    <div>
      <GenreFilter value={selectedGenre} onChange={setSelectedGenre} />
      <div className="band-grid">
        {bands?.map((band) => (
          <BandCard key={band._id} band={band} />
        ))}
      </div>
    </div>
  );
}
```

---

### search

Search bands by name or location.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No |
| **Arguments** | `{ query: string, limit?: number }` |
| **Returns** | `Band[]` |

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `query` | `string` | Yes | - | Search term (case-insensitive) |
| `limit` | `number` | No | 20 | Maximum number of results |

#### Search Behavior

- Scans up to 100 bands
- Matches against `name` and `location` fields
- Case-insensitive partial matching

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useDebouncedValue } from "@/hooks";

function BandSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const results = useQuery(
    api.bands.search,
    debouncedSearch.length > 0
      ? { query: debouncedSearch, limit: 10 }
      : "skip"
  );

  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search bands..."
      />
      {results?.map((band) => (
        <BandSearchResult key={band._id} band={band} />
      ))}
    </div>
  );
}
```

---

### getSavedBands

Get the current user's saved/followed bands.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | No (returns `[]` if unauthenticated) |
| **Arguments** | None |
| **Returns** | `Band[]` |

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function SavedBands() {
  const savedBands = useQuery(api.bands.getSavedBands);

  if (savedBands === undefined) return <LoadingSpinner />;

  if (savedBands.length === 0) {
    return <EmptyState message="You haven't saved any bands yet" />;
  }

  return (
    <div>
      <h2>Saved Bands ({savedBands.length})</h2>
      {savedBands.map((band) => (
        <BandCard key={band._id} band={band} saved />
      ))}
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useSavedBands } from "@/hooks";

function Component() {
  const { savedBands, isLoading, toggleSave } = useSavedBands();
}
```

---

### getAnalytics

Get detailed analytics data for a specific band.

| Property | Value |
|----------|-------|
| **Type** | Query |
| **Auth Required** | Yes |
| **Arguments** | `{ bandId: Id<"bands"> }` |
| **Returns** | `AnalyticsData` |
| **Throws** | `"Not authenticated"`, `"Band not found"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `bandId` | `Id<"bands">` | Yes | The band to get analytics for |

#### Response Schema

```typescript
{
  totalRsvps: number;           // Sum of all RSVPs
  eventCount: number;           // Total number of events
  eventComparison: {
    name: string;               // Date label (e.g., "Jan 15")
    rsvps: number;              // RSVPs for that event
    venueName: string;          // Venue name
  }[];
  trafficData: {
    name: string;               // "Returning" or "New"
    value: number;              // Percentage value
  }[];
}
```

#### Usage Example

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function BandAnalytics({ bandId }: { bandId: Id<"bands"> }) {
  const analytics = useQuery(api.bands.getAnalytics, { bandId });

  if (!analytics) return <LoadingSpinner />;

  return (
    <div>
      <h2>Analytics</h2>
      <p>Total RSVPs: {analytics.totalRsvps}</p>
      <p>Events: {analytics.eventCount}</p>

      <h3>Event Performance</h3>
      <BarChart data={analytics.eventComparison} />

      <h3>Traffic Sources</h3>
      <PieChart data={analytics.trafficData} />
    </div>
  );
}
```

#### Hook Wrapper

```typescript
import { useBandAnalytics } from "@/hooks";

function Component({ bandId }) {
  const { analytics, isLoading } = useBandAnalytics(bandId);
}
```

---

## Mutations

### create

Create a new band for the current musician user.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | See below |
| **Returns** | `Id<"bands">` |
| **Throws** | `"Not authenticated"`, `"User not found"`, `"User already has a band"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Band name |
| `genres` | `Genre[]` | Yes | Array of genres (1-5) |
| `location` | `string` | Yes | Band's home base location |
| `image` | `string` | No | URL to band image |
| `bio` | `string` | No | Band biography |
| `memberCount` | `number` | No | Number of members |
| `socialLinks` | `SocialLinks` | No | Social media links |

#### SocialLinks Schema

```typescript
interface SocialLinks {
  spotify?: string;
  appleMusic?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
}
```

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function CreateBandForm() {
  const createBand = useMutation(api.bands.create);
  const [name, setName] = useState("");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const bandId = await createBand({
        name,
        genres,
        location,
        bio: "We make music!",
        memberCount: 4,
        socialLinks: {
          instagram: "https://instagram.com/myband",
          spotify: "https://open.spotify.com/artist/...",
        },
      });
      // Navigate to band dashboard
      router.push("/home");
    } catch (err) {
      if (err.message === "User already has a band") {
        setError("You already have a band profile");
      } else {
        setError("Failed to create band");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Band name" required />
      <GenreSelector value={genres} onChange={setGenres} min={1} max={5} />
      <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" required />
      <button type="submit">Create Band</button>
    </form>
  );
}
```

---

### update

Update a band's profile.

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | See below |
| **Returns** | `Id<"bands">` |
| **Throws** | `"Not authenticated"`, `"User not found"`, `"Not authorized to update this band"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `bandId` | `Id<"bands">` | Yes | The band to update |
| `name` | `string` | No | Updated band name |
| `genres` | `Genre[]` | No | Updated genres |
| `location` | `string` | No | Updated location |
| `image` | `string` | No | Updated image URL |
| `bio` | `string` | No | Updated biography |
| `memberCount` | `number` | No | Updated member count |
| `socialLinks` | `SocialLinks` | No | Updated social links |

#### Ownership Validation

Only the user who created the band can update it. The mutation verifies that `band.userId === user._id`.

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function EditBandProfile({ band }) {
  const updateBand = useMutation(api.bands.update);
  const [bio, setBio] = useState(band.bio || "");

  const handleSave = async () => {
    try {
      await updateBand({
        bandId: band._id,
        bio,
      });
      // Show success toast
    } catch (error) {
      if (error.message === "Not authorized to update this band") {
        // Handle unauthorized
      }
    }
  };

  return (
    <div>
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
      <button onClick={handleSave}>Save Changes</button>
    </div>
  );
}
```

---

### toggleSave

Save or unsave a band (follow/unfollow for fans).

| Property | Value |
|----------|-------|
| **Type** | Mutation |
| **Auth Required** | Yes |
| **Arguments** | `{ bandId: Id<"bands"> }` |
| **Returns** | `{ action: "saved" \| "unsaved" }` |
| **Throws** | `"Not authenticated"`, `"User not found"` |

#### Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `bandId` | `Id<"bands">` | Yes | The band to save/unsave |

#### Behavior

- If band is not saved: Creates a `savedArtists` record, returns `{ action: "saved" }`
- If band is already saved: Deletes the record, returns `{ action: "unsaved" }`

#### Usage Example

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function BandCard({ band, isSaved }) {
  const toggleSave = useMutation(api.bands.toggleSave);
  const [saved, setSaved] = useState(isSaved);

  const handleToggleSave = async () => {
    const result = await toggleSave({ bandId: band._id });
    setSaved(result.action === "saved");
  };

  return (
    <div>
      <h3>{band.name}</h3>
      <button onClick={handleToggleSave}>
        {saved ? "Unsave" : "Save"} Band
      </button>
    </div>
  );
}
```

---

## Type Definitions

### Band

```typescript
interface Band {
  _id: Id<"bands">;
  _creationTime: number;
  userId: Id<"users">;       // Owner of the band
  name: string;
  genres?: Genre[];          // Multiple genres supported
  genre?: Genre;             // Legacy single genre field
  location: string;
  image?: string;
  bio?: string;
  memberCount?: number;
  socialLinks?: SocialLinks;
  createdAt: number;
}
```

### BandWithStats

```typescript
interface BandWithStats extends Band {
  stats: {
    showsThisMonth: number;
    totalRsvps: number;
    newFans: number;
  };
}
```

### SocialLinks

```typescript
interface SocialLinks {
  spotify?: string;
  appleMusic?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
}
```

### AnalyticsData

```typescript
interface AnalyticsData {
  totalRsvps: number;
  eventCount: number;
  eventComparison: {
    name: string;
    rsvps: number;
    venueName: string;
  }[];
  trafficData: {
    name: string;
    value: number;
  }[];
}
```

---

## Database Schema

### Table: `bands`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `Id<"users">` | The musician who owns this band |
| `name` | `string` | Band name |
| `genres` | `Genre[]?` | Multiple genres (optional for migration) |
| `genre` | `Genre?` | Legacy single genre field |
| `location` | `string` | Band's home base |
| `image` | `string?` | Band image URL |
| `bio` | `string?` | Biography |
| `memberCount` | `number?` | Number of members |
| `socialLinks` | `SocialLinks?` | Social media links |
| `createdAt` | `number` | Creation timestamp |

### Table: `savedArtists`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `Id<"users">` | The fan who saved the band |
| `bandId` | `Id<"bands">` | The saved band |
| `createdAt` | `number` | When the band was saved |

### Indexes

**bands:**
| Index | Fields | Purpose |
|-------|--------|---------|
| `by_user` | `userId` | Find bands owned by a user |
| `by_name` | `name` | Look up bands by name |

**savedArtists:**
| Index | Fields | Purpose |
|-------|--------|---------|
| `by_user` | `userId` | Get all bands saved by a user |
| `by_band` | `bandId` | Get all users who saved a band |
| `by_user_band` | `userId, bandId` | Check if user saved specific band |

---

## Related Documentation

- [Users API](./users.md) - User management
- [Events API](./events.md) - Creating events for bands
- [Messages API](./messages.md) - Band-venue messaging
- [Venues API](./venues.md) - Applying to open dates
