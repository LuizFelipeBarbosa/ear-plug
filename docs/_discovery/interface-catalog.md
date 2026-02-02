# Ear-Plug Interface Catalog

This document catalogs all TypeScript interfaces, types, and exported functions used across the Ear-Plug codebase.

---

## Table of Contents

1. [Package Organization](#package-organization)
2. [Core Types](#core-types)
3. [Entity Interfaces](#entity-interfaces)
4. [Composite Interfaces](#composite-interfaces)
5. [Validation Schemas](#validation-schemas)
6. [Constants & Configuration](#constants--configuration)
7. [Utility Functions](#utility-functions)
8. [Web Hooks](#web-hooks)
9. [Database Schema](#database-schema)

---

## Package Organization

```
packages/shared/src/
  index.ts          - Main entry point, re-exports all modules
  types/index.ts    - TypeScript interfaces and type definitions
  validation/index.ts - Zod validation schemas
  constants/index.ts  - Application constants and configuration
  utils/index.ts      - Utility functions
```

**Usage:**
```typescript
// Import from shared package
import { User, Genre, formatEventDate } from "@ear-plug/shared";

// Or import specific modules
import type { User } from "@ear-plug/shared/types";
import { userProfileUpdateSchema } from "@ear-plug/shared/validation";
```

---

## Core Types

**File:** `/packages/shared/src/types/index.ts`

### UserRole
User account type discriminator.

```typescript
type UserRole = "fan" | "musician";
```

---

### Genre
Musical genre categories.

```typescript
type Genre =
  | "indie"
  | "rock"
  | "jazz"
  | "electronic"
  | "folk"
  | "pop"
  | "alternative";
```

---

### EventStatus
Event booking status.

```typescript
type EventStatus = "confirmed" | "hold" | "available";
```

---

### OpenDateStatus
Venue open date status.

```typescript
type OpenDateStatus = "open" | "pending" | "filled";
```

---

### ApplicationStatus
Band application status.

```typescript
type ApplicationStatus = "pending" | "accepted" | "rejected";
```

---

### NotificationType
Notification category types.

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

### Coordinates
Geographic location.

```typescript
interface Coordinates {
  lat: number;
  lng: number;
}
```

---

### SocialLinks
Social media profile links.

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

---

## Entity Interfaces

### BaseEntity
Common fields for all database entities.

```typescript
interface BaseEntity {
  _id: string;
  _creationTime: number;
}
```

---

### User
User account entity.

```typescript
interface User extends BaseEntity {
  clerkId: string;
  role: UserRole;
  name: string;
  email: string;
  location?: string;
  avatar?: string;
  topGenres?: Genre[];
  memberSince: number;
  showsAttended?: number;
}
```

**Database Table:** `users`
**Indexes:** `by_clerk_id`, `by_email`, `by_role`

---

### Band
Musician band profile entity.

```typescript
interface Band extends BaseEntity {
  userId: string;
  name: string;
  genres: Genre[];
  location: string;
  image?: string;
  bio?: string;
  memberCount?: number;
  socialLinks?: SocialLinks;
  createdAt: number;
}
```

**Database Table:** `bands`
**Indexes:** `by_user`, `by_name`

---

### Venue
Venue/location entity.

```typescript
interface Venue extends BaseEntity {
  name: string;
  address: string;
  city: string;
  capacity: number;
  coordinates: Coordinates;
  images?: string[];
  description?: string;
  genres?: Genre[];
}
```

**Database Table:** `venues`
**Indexes:** `by_city`, `by_name`

---

### Event
Live music event entity.

```typescript
interface Event extends BaseEntity {
  title: string;
  bandId: string;
  venueId: string;
  dateTime: number;
  image?: string;
  rsvpCount: number;
  capacity: number;
  price?: number;
  description?: string;
  genres: Genre[];
  genre?: Genre; // Legacy single genre field
  status: EventStatus;
}
```

**Database Table:** `events`
**Indexes:** `by_band`, `by_venue`, `by_date`, `by_status`

---

### RSVP
User event attendance record.

```typescript
interface RSVP extends BaseEntity {
  userId: string;
  eventId: string;
  createdAt: number;
}
```

**Database Table:** `rsvps`
**Indexes:** `by_user`, `by_event`, `by_user_event`

---

### Like
User event interest record.

```typescript
interface Like extends BaseEntity {
  userId: string;
  eventId: string;
  createdAt: number;
}
```

**Database Table:** `likes`
**Indexes:** `by_user`, `by_event`, `by_user_event`

---

### Conversation
Band-venue messaging thread.

```typescript
interface Conversation extends BaseEntity {
  bandId: string;
  venueId: string;
  lastMessageAt: number;
  lastMessagePreview?: string;
}
```

**Database Table:** `conversations`
**Indexes:** `by_band`, `by_venue`, `by_band_venue`, `by_last_message`

---

### Message
Individual message in a conversation.

```typescript
interface Message extends BaseEntity {
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: number;
  read: boolean;
}
```

**Database Table:** `messages`
**Indexes:** `by_conversation`, `by_sender`, `by_timestamp`

---

### Notification
User notification entity.

```typescript
interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  timestamp: number;
  read: boolean;
  eventId?: string;
  bandId?: string;
  venueId?: string;
}
```

**Database Table:** `notifications`
**Indexes:** `by_user`, `by_user_read`, `by_timestamp`

---

### OpenDate
Venue booking opportunity.

```typescript
interface OpenDate extends BaseEntity {
  venueId: string;
  date: number;
  offeredPay?: number;
  genre?: Genre;
  status: OpenDateStatus;
  description?: string;
  createdAt: number;
}
```

**Database Table:** `openDates`
**Indexes:** `by_venue`, `by_date`, `by_status`, `by_genre`

---

### Application
Band application to open date.

```typescript
interface Application extends BaseEntity {
  bandId: string;
  openDateId: string;
  status: ApplicationStatus;
  message?: string;
  appliedAt: number;
  respondedAt?: number;
}
```

**Database Table:** `applications`
**Indexes:** `by_band`, `by_open_date`, `by_band_open_date`, `by_status`

---

## Composite Interfaces

### EventWithDetails
Event with related band and venue data.

```typescript
interface EventWithDetails extends Event {
  band: Band | null;
  venue: Venue | null;
}
```

---

### BandStats
Band dashboard statistics.

```typescript
interface BandStats {
  showsThisMonth: number;
  totalRsvps: number;
  newFans: number;
}
```

---

### AnalyticsData
Band analytics for dashboard.

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

### MapFilters
Map view filter options.

```typescript
interface MapFilters {
  genre?: Genre;
  radiusMiles?: number;
  searchQuery?: string;
}
```

---

## Validation Schemas

**File:** `/packages/shared/src/validation/index.ts`

All schemas use **Zod** for runtime validation.

### Enum Schemas

```typescript
const genreSchema = z.enum([
  "indie", "rock", "jazz", "electronic", "folk", "pop", "alternative"
]);

const userRoleSchema = z.enum(["fan", "musician"]);

const eventStatusSchema = z.enum(["confirmed", "hold", "available"]);

const openDateStatusSchema = z.enum(["open", "pending", "filled"]);

const applicationStatusSchema = z.enum(["pending", "accepted", "rejected"]);

const notificationTypeSchema = z.enum([
  "event_reminder", "lineup_change", "new_event_followed_artist",
  "new_event_nearby", "application_update", "message"
]);
```

---

### Object Schemas

#### coordinatesSchema

```typescript
const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
```

---

#### socialLinksSchema

```typescript
const socialLinksSchema = z.object({
  spotify: z.string().url().optional(),
  appleMusic: z.string().url().optional(),
  instagram: z.string().url().optional(),
  tiktok: z.string().url().optional(),
  youtube: z.string().url().optional(),
  website: z.string().url().optional(),
});
```

---

#### userProfileUpdateSchema

```typescript
const userProfileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  location: z.string().max(200).optional(),
  avatar: z.string().url().optional(),
  topGenres: z.array(genreSchema).max(5).optional(),
});

type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;
```

---

#### bandCreateSchema

```typescript
const bandCreateSchema = z.object({
  name: z.string().min(1).max(100),
  genres: z.array(genreSchema).min(1).max(5),
  location: z.string().min(1).max(200),
  image: z.string().url().optional(),
  bio: z.string().max(1000).optional(),
  memberCount: z.number().int().min(1).max(50).optional(),
  socialLinks: socialLinksSchema.optional(),
});

type BandCreateInput = z.infer<typeof bandCreateSchema>;
```

---

#### bandUpdateSchema

```typescript
const bandUpdateSchema = bandCreateSchema.partial();

type BandUpdateInput = z.infer<typeof bandUpdateSchema>;
```

---

#### eventCreateSchema

```typescript
const eventCreateSchema = z.object({
  title: z.string().min(1).max(200),
  bandId: z.string(),
  venueId: z.string(),
  dateTime: z.number().positive(),
  image: z.string().url().optional(),
  capacity: z.number().int().positive(),
  price: z.number().int().nonnegative().optional(),
  description: z.string().max(2000).optional(),
  genre: genreSchema,
});

type EventCreateInput = z.infer<typeof eventCreateSchema>;
```

---

#### messageSendSchema

```typescript
const messageSendSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1).max(5000),
});

type MessageSendInput = z.infer<typeof messageSendSchema>;
```

---

#### searchSchema

```typescript
const searchSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(100).optional(),
});

type SearchInput = z.infer<typeof searchSchema>;
```

---

#### mapFilterSchema

```typescript
const mapFilterSchema = z.object({
  genre: genreSchema.optional(),
  radiusMiles: z.number().min(1).max(50).optional(),
  searchQuery: z.string().max(200).optional(),
});

type MapFilterInput = z.infer<typeof mapFilterSchema>;
```

---

#### applicationCreateSchema

```typescript
const applicationCreateSchema = z.object({
  openDateId: z.string(),
  bandId: z.string(),
  message: z.string().max(1000).optional(),
});

type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;
```

---

## Constants & Configuration

**File:** `/packages/shared/src/constants/index.ts`

### GENRES
Genre options with display labels.

```typescript
const GENRES: { value: Genre; label: string }[] = [
  { value: "indie", label: "Indie" },
  { value: "rock", label: "Rock" },
  { value: "jazz", label: "Jazz" },
  { value: "electronic", label: "Electronic" },
  { value: "folk", label: "Folk" },
  { value: "pop", label: "Pop" },
  { value: "alternative", label: "Alternative" },
];
```

---

### GENRE_COLORS
Color mapping for UI.

```typescript
const GENRE_COLORS: Record<Genre, string> = {
  indie: "#f59e0b",       // Amber
  rock: "#ef4444",        // Red
  jazz: "#6366f1",        // Indigo
  electronic: "#8b5cf6",  // Violet
  folk: "#22c55e",        // Green
  pop: "#ec4899",         // Pink
  alternative: "#06b6d4", // Cyan
};
```

---

### Map Defaults

```typescript
const DEFAULT_MAP_CENTER = {
  lat: 37.8044,
  lng: -122.2712, // Oakland/Berkeley area
};

const DEFAULT_MAP_ZOOM = 12;

const DISTANCE_OPTIONS = [1, 5, 10, 25, 50];

const DEFAULT_RADIUS_MILES = 25;
```

---

### Navigation Routes

```typescript
const ROUTES = {
  HOME: "/home",
  CALENDAR: "/calendar",
  MESSAGES: "/messages",
  PROFILE: "/profile",
  GIG: "/gig",
  ONBOARDING: "/",
} as const;
```

---

### Navigation Items

```typescript
const FAN_NAV_ITEMS = [
  { href: ROUTES.HOME, label: "Discover", icon: "map" },
  { href: ROUTES.CALENDAR, label: "My Events", icon: "calendar" },
  { href: ROUTES.MESSAGES, label: "Notifications", icon: "bell" },
  { href: ROUTES.PROFILE, label: "Profile", icon: "user" },
] as const;

const MUSICIAN_NAV_ITEMS = [
  { href: ROUTES.HOME, label: "Dashboard", icon: "layout-dashboard" },
  { href: ROUTES.CALENDAR, label: "Shows", icon: "calendar" },
  { href: ROUTES.MESSAGES, label: "Messages", icon: "message-circle" },
  { href: ROUTES.PROFILE, label: "Profile", icon: "user" },
] as const;
```

---

### Status Configuration

```typescript
const EVENT_STATUS_CONFIG = {
  confirmed: { label: "Confirmed", color: "text-green-600", bgColor: "bg-green-100" },
  hold: { label: "Hold", color: "text-yellow-600", bgColor: "bg-yellow-100" },
  available: { label: "Available", color: "text-blue-600", bgColor: "bg-blue-100" },
} as const;

const APPLICATION_STATUS_CONFIG = {
  pending: { label: "Pending", color: "text-yellow-600", bgColor: "bg-yellow-100" },
  accepted: { label: "Accepted", color: "text-green-600", bgColor: "bg-green-100" },
  rejected: { label: "Rejected", color: "text-red-600", bgColor: "bg-red-100" },
} as const;

const NOTIFICATION_TYPE_CONFIG = {
  event_reminder: { icon: "clock", title: "Event Reminder" },
  lineup_change: { icon: "refresh-cw", title: "Lineup Change" },
  new_event_followed_artist: { icon: "music", title: "New Show" },
  new_event_nearby: { icon: "map-pin", title: "Nearby Event" },
  application_update: { icon: "file-text", title: "Application Update" },
  message: { icon: "message-circle", title: "New Message" },
} as const;
```

---

### Formatting Functions

```typescript
function formatPrice(cents: number): string;  // Returns "Free" or "$X.XX"
function formatEventDate(timestamp: number): string;  // "Mon, Jan 1"
function formatEventTime(timestamp: number): string;  // "7:00 PM"
function formatFullDate(timestamp: number): string;   // "Monday, January 1, 2024"
function getRelativeTime(timestamp: number): string;  // "2h ago", "Just now"
```

---

## Utility Functions

**File:** `/packages/shared/src/utils/index.ts`

### calculateDistance
Calculate distance between two coordinates (Haversine formula).

```typescript
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number; // Returns distance in miles
```

---

### clamp
Clamp a number between min and max.

```typescript
function clamp(value: number, min: number, max: number): number;
```

---

### generateId
Generate a random ID string.

```typescript
function generateId(): string; // 13-character alphanumeric
```

---

### debounce
Create a debounced function.

```typescript
function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void;
```

---

### throttle
Create a throttled function.

```typescript
function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void;
```

---

### pluralize
Get singular/plural form based on count.

```typescript
function pluralize(count: number, singular: string, plural?: string): string;
// pluralize(1, "event") => "event"
// pluralize(5, "event") => "events"
```

---

### truncate
Truncate text with ellipsis.

```typescript
function truncate(text: string, maxLength: number): string;
```

---

### formatNumber
Format large numbers (1000 -> "1K").

```typescript
function formatNumber(num: number): string;
```

---

### Date Helpers

```typescript
function isToday(timestamp: number): boolean;
function isThisWeek(timestamp: number): boolean;
```

---

### String Helpers

```typescript
function getInitials(name: string): string; // "John Doe" => "JD"
function isValidEmail(email: string): boolean;
function isValidUrl(url: string): boolean;
```

---

### cn
Class name utility (simplified).

```typescript
function cn(...classes: (string | undefined | false | null)[]): string;
```

---

### groupBy
Group array items by a key function.

```typescript
function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]>;
```

---

### sortByDate
Sort items by dateTime field.

```typescript
function sortByDate<T extends { dateTime: number }>(
  items: T[],
  ascending?: boolean
): T[];
```

---

## Web Hooks

**File:** `/apps/web/src/hooks/index.ts`

React hooks that wrap Convex queries and mutations for the web application.

### useCurrentUser
Get and manage the current user.

```typescript
function useCurrentUser(): {
  user: User | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  isFan: boolean;
  isMusician: boolean;
  setRole: (role: UserRole) => Promise<void>;
  updateProfile: MutationFunction;
};
```

---

### useEvents
Get upcoming events with optional filtering.

```typescript
function useEvents(options?: { genre?: Genre; limit?: number }): {
  events: EventWithDetails[] | undefined;
  isLoading: boolean;
};
```

---

### useEvent
Get a single event with user interaction status.

```typescript
function useEvent(eventId: Id<"events"> | undefined): {
  event: EventWithDetails | null | undefined;
  hasRsvp: boolean;
  hasLiked: boolean;
  isLoading: boolean;
  rsvp: () => Promise<void>;
  toggleLike: () => Promise<void>;
};
```

---

### useUserEvents
Get the current user's RSVP'd and liked events.

```typescript
function useUserEvents(): {
  rsvps: EventWithDetails[];
  likes: EventWithDetails[];
  pastRsvps: EventWithDetails[];
  isLoading: boolean;
};
```

---

### useSearchEvents
Search events by query string.

```typescript
function useSearchEvents(query: string): {
  results: EventWithDetails[];
  isLoading: boolean;
};
```

---

### useNearbyEvents
Get events near a location.

```typescript
function useNearbyEvents(options: {
  latitude: number | null;
  longitude: number | null;
  radiusMiles: number;
  genre?: Genre;
  limit?: number;
  enabled?: boolean;
}): {
  events: EventWithDetails[];
  isLoading: boolean;
};
```

---

### useCurrentBand
Get the current musician's band.

```typescript
function useCurrentBand(): {
  band: Band | null | undefined;
  bandWithStats: BandWithStats | null | undefined;
  isLoading: boolean;
  createBand: MutationFunction;
  updateBand: MutationFunction;
};
```

---

### useBandAnalytics
Get analytics for a band.

```typescript
function useBandAnalytics(bandId: Id<"bands"> | undefined): {
  analytics: AnalyticsData | undefined;
  isLoading: boolean;
};
```

---

### useSavedBands
Get and manage saved bands.

```typescript
function useSavedBands(): {
  savedBands: Band[];
  isLoading: boolean;
  toggleSave: (bandId: Id<"bands">) => Promise<void>;
};
```

---

### useVenues
Get venue listings.

```typescript
function useVenues(options?: { city?: string; limit?: number }): {
  venues: Venue[];
  isLoading: boolean;
};
```

---

### useSuggestedVenues
Get suggested venues based on genre.

```typescript
function useSuggestedVenues(genre?: Genre): {
  venues: Venue[];
  isLoading: boolean;
};
```

---

### useNearbyVenues
Get venues near a location.

```typescript
function useNearbyVenues(
  lat: number | undefined,
  lng: number | undefined,
  radiusMiles?: number
): {
  venues: VenueWithDistance[];
  isLoading: boolean;
};
```

---

### useOpenDates
Get open dates with optional filtering.

```typescript
function useOpenDates(options?: {
  venueId?: Id<"venues">;
  genre?: Genre;
  limit?: number;
}): {
  openDates: OpenDateWithVenue[];
  isLoading: boolean;
  applyToOpenDate: MutationFunction;
};
```

---

### useSavedVenues
Get and manage saved venues.

```typescript
function useSavedVenues(): {
  savedVenues: Venue[];
  isLoading: boolean;
  toggleSave: (venueId: Id<"venues">) => Promise<void>;
};
```

---

### useBandConversations
Get the current band's conversations.

```typescript
function useBandConversations(): {
  conversations: ConversationWithDetails[];
  unreadCount: number;
  isLoading: boolean;
  startConversation: MutationFunction;
};
```

---

### useConversation
Get messages in a conversation.

```typescript
function useConversation(conversationId: Id<"conversations"> | undefined): {
  messages: MessageWithSender[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: () => Promise<void>;
};
```

---

### useNotifications
Get and manage notifications.

```typescript
function useNotifications(options?: { limit?: number; unreadOnly?: boolean }): {
  notifications: NotificationWithDetails[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: Id<"notifications">) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (notificationId: Id<"notifications">) => Promise<void>;
};
```

---

### useGeolocation
Browser geolocation API wrapper.

```typescript
interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: GeolocationPositionError | null;
  loading: boolean;
  supported: boolean;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

function useGeolocation(options?: GeolocationOptions): GeolocationState & {
  requestPosition: () => void;
  getDistance: (targetLat: number, targetLng: number) => number | null;
  hasLocation: boolean;
};
```

---

### useLocalStorage
Persist state in localStorage with SSR support.

```typescript
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void];
```

---

### useRolePersistence
Persist user role and event interactions locally.

```typescript
function useRolePersistence(): {
  role: "fan" | "musician" | null;
  setRole: (role: "fan" | "musician" | null) => void;
  likedEvents: string[];
  rsvpEvents: string[];
  addLikedEvent: (eventId: string) => void;
  removeLikedEvent: (eventId: string) => void;
  addRsvpEvent: (eventId: string) => void;
  removeRsvpEvent: (eventId: string) => void;
  isEventLiked: (eventId: string) => boolean;
  isEventRsvp: (eventId: string) => boolean;
  clearAllData: () => void;
};
```

---

### useSharedEvents
Create events with automatic venue handling.

```typescript
interface VenueLocationData {
  name: string;
  address: string;
  city: string;
  coordinates: { lat: number; lng: number };
  placeId?: string;
  phoneNumber?: string;
  website?: string;
  capacity?: number;
}

interface CreateEventInput {
  title: string;
  bandId: string;
  date: string;      // ISO date (YYYY-MM-DD)
  startTime: string; // HH:MM format
  endTime?: string;
  venue: VenueLocationData;
  image?: string;
  genres: Genre[];
  capacity?: number;
  description?: string;
  price?: number;
}

function useSharedEvents(): {
  createEvent: (input: CreateEventInput) => Promise<{
    eventId: Id<"events">;
    venueId: Id<"venues">;
  }>;
  createVenue: (venueData: VenueLocationData) => Promise<Id<"venues">>;
};
```

---

### useBandEvents
Create events for the current band.

```typescript
function useBandEvents(bandId: string | undefined): {
  createEvent: (input: Omit<CreateEventInput, "bandId">) => Promise<{
    eventId: Id<"events">;
    venueId: Id<"venues">;
  }>;
};
```

---

## Database Schema

**File:** `/convex/schema.ts`

### Convex Validators (Used in Schema)

```typescript
// User role
const userRoleValidator = v.union(v.literal("fan"), v.literal("musician"));

// Genre
const genreValidator = v.union(
  v.literal("indie"),
  v.literal("rock"),
  v.literal("jazz"),
  v.literal("electronic"),
  v.literal("folk"),
  v.literal("pop"),
  v.literal("alternative")
);

// Event status
const eventStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("hold"),
  v.literal("available")
);

// Open date status
const openDateStatusValidator = v.union(
  v.literal("open"),
  v.literal("pending"),
  v.literal("filled")
);

// Application status
const applicationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("rejected")
);

// Notification type
const notificationTypeValidator = v.union(
  v.literal("event_reminder"),
  v.literal("lineup_change"),
  v.literal("new_event_followed_artist"),
  v.literal("new_event_nearby"),
  v.literal("application_update"),
  v.literal("message")
);

// Social links
const socialLinksValidator = v.object({
  spotify: v.optional(v.string()),
  appleMusic: v.optional(v.string()),
  instagram: v.optional(v.string()),
  tiktok: v.optional(v.string()),
  youtube: v.optional(v.string()),
  website: v.optional(v.string()),
});

// Coordinates
const coordinatesValidator = v.object({
  lat: v.number(),
  lng: v.number(),
});
```

---

### Table Summary

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `users` | User accounts linked to Clerk | `by_clerk_id`, `by_email`, `by_role` |
| `bands` | Musician band profiles | `by_user`, `by_name` |
| `venues` | Bay Area venue locations | `by_city`, `by_name` |
| `events` | Live music events/shows | `by_band`, `by_venue`, `by_date`, `by_status` |
| `rsvps` | User event attendance | `by_user`, `by_event`, `by_user_event` |
| `likes` | User event interest | `by_user`, `by_event`, `by_user_event` |
| `savedArtists` | Fans following bands | `by_user`, `by_band`, `by_user_band` |
| `savedVenues` | Users following venues | `by_user`, `by_venue`, `by_user_venue` |
| `conversations` | Band-venue messaging | `by_band`, `by_venue`, `by_band_venue`, `by_last_message` |
| `messages` | Individual messages | `by_conversation`, `by_sender`, `by_timestamp` |
| `notifications` | User notifications | `by_user`, `by_user_read`, `by_timestamp` |
| `openDates` | Venue booking opportunities | `by_venue`, `by_date`, `by_status`, `by_genre` |
| `applications` | Band applications | `by_band`, `by_open_date`, `by_band_open_date`, `by_status` |
