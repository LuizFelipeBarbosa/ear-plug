import type { Genre } from "./band";

/**
 * User role type for the platform.
 * Determines the user's experience and available features.
 * - "fan": Music fan who discovers events, RSVPs, and follows bands
 * - "musician": Band member who manages their band profile and events
 *
 * @deprecated Legacy compatibility field. Web now uses profile context + band memberships.
 */
export type UserRole = "fan" | "musician";

/**
 * Active profile context mode in the web app.
 */
export type ProfileMode = "personal" | "band";

/**
 * Personalization badge reason attached to fan-facing discover results.
 */
export type SpotifyPersonalizationReason =
  | "spotify_artist_match"
  | "spotify_genre_match";

/**
 * Small Spotify artist preview shown in fan settings after sync.
 */
export interface SpotifyTopArtistPreview {
  /** Spotify artist id */
  spotifyArtistId: string;
  /** Artist display name */
  name: string;
  /** Optional artist image URL */
  imageUrl?: string;
  /** Optional Spotify artist URL */
  externalUrl?: string;
}

/**
 * Derived Spotify personalization state stored for a user.
 * Contains normalized taste data only, never OAuth tokens.
 */
export interface SpotifyPersonalizationProfile {
  /** Unix timestamp (ms) when Spotify taste was last synced */
  lastSyncedAt: number;
  /** Ear-Plug genres derived from Spotify top artists */
  topGenres: Genre[];
  /** Small top-artist preview for settings UI */
  topArtists: SpotifyTopArtistPreview[];
  /** Matched local band ids */
  matchedBandIds: string[];
}

/**
 * Base interface for all database entities.
 * Provides common fields from Convex document storage.
 */
export interface BaseEntity {
  /** Unique document ID from Convex */
  _id: string;
  /** Unix timestamp (ms) when the document was created */
  _creationTime: number;
}

/**
 * User profile entity.
 * Linked to Clerk authentication and stores platform-specific user data.
 */
export interface User extends BaseEntity {
  /** Clerk authentication user ID */
  clerkId: string;
  /** User's role determining their experience */
  role: UserRole;
  /** User's display name */
  name: string;
  /** User's email address */
  email: string;
  /** User's primary phone number (normalized E.164 when available) */
  phoneNumber?: string;
  /** User's location (city/area) */
  location?: string;
  /** URL to user's avatar image */
  avatar?: string;
  /** User's preferred music genres (max 5) */
  topGenres?: Genre[];
  /** Unix timestamp (ms) when user joined */
  memberSince: number;
  /** Number of shows the user has attended */
  showsAttended?: number;
}

/**
 * Web client profile context (tab-scoped).
 */
export interface ProfileContext {
  /** Active mode */
  mode: ProfileMode;
  /** Active band when mode is "band" */
  bandId?: string;
}

/**
 * Filter options for the event discovery map.
 * Used to narrow down displayed events.
 */
export interface MapFilters {
  /** Filter by music genre */
  genre?: Genre;
  /** Maximum distance from user location in miles */
  radiusMiles?: number;
  /** Text search query for event/band/venue names */
  searchQuery?: string;
}
