/**
 * @fileoverview Type definitions for the Ear-Plug platform.
 * Contains all shared TypeScript types and interfaces used across web and mobile apps.
 * @module @ear-plug/shared/types
 */

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
 * Role a user can hold within a shared band workspace.
 */
export type BandMemberRole = "owner" | "admin" | "member";

/**
 * Status for existing-user band invites.
 */
export type BandInviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked"
  | "expired";

/**
 * Music genre categories supported by the platform.
 * Used for filtering events, matching bands with venues, and user preferences.
 */
export type Genre =
  | "indie"
  | "rock"
  | "jazz"
  | "electronic"
  | "folk"
  | "pop"
  | "alternative";

/**
 * Status of an event on a band's calendar.
 * - "confirmed": Event is definitely happening
 * - "hold": Tentative booking, pending confirmation
 * - "available": Open slot, no event booked yet
 */
export type EventStatus = "confirmed" | "hold" | "available";

/**
 * Status of an open date at a venue.
 * - "open": Available for band applications
 * - "pending": Applications received, under review
 * - "filled": A band has been selected and confirmed
 */
export type OpenDateStatus = "open" | "pending" | "filled";

/**
 * Status of a band's application to an open date.
 * - "pending": Application submitted, awaiting venue response
 * - "accepted": Venue accepted the band for the date
 * - "rejected": Venue declined the application
 */
export type ApplicationStatus = "pending" | "accepted" | "rejected";

/**
 * Types of notifications that can be sent to users.
 * Each type triggers different display formatting and actions.
 */
export type NotificationType =
  | "event_reminder"              // Reminder for an upcoming RSVP'd event
  | "lineup_change"               // Changes to an event the user is attending
  | "new_event_followed_artist"   // New event from a saved band
  | "new_event_nearby"            // New event at a saved venue
  | "application_update"          // Update on band's application status
  | "message"                     // New message in a conversation
  | "booking_cancelled"           // Booking was canceled
  | "booking_message"             // Booking thread update
  | "booking_accepted"            // Booking accepted
  | "booking_request";            // New booking request

/**
 * Geographic coordinates for mapping and distance calculations.
 */
export interface Coordinates {
  /** Latitude in decimal degrees (-90 to 90) */
  lat: number;
  /** Longitude in decimal degrees (-180 to 180) */
  lng: number;
}

/**
 * Social media and website links for bands.
 * All fields are optional URLs.
 */
export interface SocialLinks {
  /** Spotify artist profile URL */
  spotify?: string;
  /** Apple Music artist profile URL */
  appleMusic?: string;
  /** Instagram profile URL */
  instagram?: string;
  /** TikTok profile URL */
  tiktok?: string;
  /** YouTube channel URL */
  youtube?: string;
  /** Band's official website URL */
  website?: string;
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
 * Band profile entity.
 * Represents a musical act managed by a musician user.
 */
export interface Band extends BaseEntity {
  /** ID of the musician user who owns this band */
  userId: string;
  /** Band name */
  name: string;
  /** Music genres the band performs (1-5 genres) */
  genres: Genre[];
  /** Band's home location (city/area) */
  location: string;
  /** URL to band's profile/promo image */
  image?: string;
  /** Band biography/description */
  bio?: string;
  /** Number of members in the band */
  memberCount?: number;
  /** Social media and website links */
  socialLinks?: SocialLinks;
  /** Unix timestamp (ms) when band profile was created */
  createdAt: number;
}

/**
 * Membership linking a user to a shared band workspace.
 */
export interface BandMembership extends BaseEntity {
  /** ID of the band workspace */
  bandId: string;
  /** ID of the member user */
  userId: string;
  /** Member role within the workspace */
  role: BandMemberRole;
  /** Unix timestamp (ms) when membership started */
  joinedAt: number;
  /** Optional user who invited this member */
  invitedBy?: string;
}

/**
 * Invitation for an existing user to join a band workspace.
 */
export interface BandInvite extends BaseEntity {
  /** Target band workspace */
  bandId: string;
  /** Existing target user */
  targetUserId: string;
  /** @deprecated Legacy compatibility field. Prefer phoneNumber for invites. */
  email: string;
  /** Target phone number (denormalized, normalized E.164 when available) */
  phoneNumber?: string;
  /** Invited role */
  role: Exclude<BandMemberRole, "owner">;
  /** Invite lifecycle status */
  status: BandInviteStatus;
  /** User who created the invite */
  invitedBy: string;
  /** Unix timestamp (ms) when invite was created */
  createdAt: number;
  /** Unix timestamp (ms) when invite was responded to */
  respondedAt?: number;
  /** Unix timestamp (ms) when pending invite expires */
  expiresAt: number;
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
 * Venue entity.
 * Represents a Bay Area live music venue.
 */
export interface Venue extends BaseEntity {
  /** Venue name */
  name: string;
  /** Street address */
  address: string;
  /** City name */
  city: string;
  /** Maximum capacity for events */
  capacity: number;
  /** Geographic coordinates for mapping */
  coordinates: Coordinates;
  /** URLs to venue photos */
  images?: string[];
  /** Venue description */
  description?: string;
  /** Music genres typically hosted */
  genres?: Genre[];
}

/**
 * Event entity.
 * Represents a live music show at a venue.
 */
export interface Event extends BaseEntity {
  /** Event title/name */
  title: string;
  /** ID of the performing band */
  bandId: string;
  /** ID of the venue hosting the event */
  venueId: string;
  /** Unix timestamp (ms) for event start time */
  dateTime: number;
  /** URL to event promotional image */
  image?: string;
  /** Current number of RSVPs */
  rsvpCount: number;
  /** Maximum attendance capacity */
  capacity: number;
  /** Ticket price in cents (0 = free) */
  price?: number;
  /** Event description */
  description?: string;
  /** Music genres for this event */
  genres: Genre[];
  /** @deprecated Legacy single genre field - use genres array instead */
  genre?: Genre;
  /** Current booking status */
  status: EventStatus;
}

/**
 * Event with related band and venue data populated.
 * Used for displaying complete event information in UI.
 */
export interface EventWithDetails extends Event {
  /** The performing band (null if not found) */
  band: Band | null;
  /** The hosting venue (null if not found) */
  venue: Venue | null;
}

/**
 * RSVP entity.
 * Records a user's intention to attend an event.
 */
export interface RSVP extends BaseEntity {
  /** ID of the user who RSVP'd */
  userId: string;
  /** ID of the event they're attending */
  eventId: string;
  /** Unix timestamp (ms) when RSVP was created */
  createdAt: number;
}

/**
 * Like entity.
 * Records a user's interest in an event (saved for later).
 */
export interface Like extends BaseEntity {
  /** ID of the user who liked the event */
  userId: string;
  /** ID of the liked event */
  eventId: string;
  /** Unix timestamp (ms) when like was created */
  createdAt: number;
}

/**
 * Conversation entity.
 * Represents a messaging thread between a band and venue.
 */
export interface Conversation extends BaseEntity {
  /** ID of the band in the conversation */
  bandId: string;
  /** ID of the venue in the conversation */
  venueId: string;
  /** Unix timestamp (ms) of the most recent message */
  lastMessageAt: number;
  /** Preview text of the last message */
  lastMessagePreview?: string;
}

/**
 * Message entity.
 * A single message within a conversation.
 */
export interface Message extends BaseEntity {
  /** ID of the parent conversation */
  conversationId: string;
  /** ID of the user who sent the message */
  senderId: string;
  /** Message text content */
  content: string;
  /** Unix timestamp (ms) when message was sent */
  timestamp: number;
  /** Whether the recipient has read the message */
  read: boolean;
}

/**
 * Notification entity.
 * Platform notification sent to a user.
 */
export interface Notification extends BaseEntity {
  /** ID of the recipient user */
  userId: string;
  /** Type of notification for formatting/handling */
  type: NotificationType;
  /** Notification headline */
  title: string;
  /** Notification body text */
  content: string;
  /** Unix timestamp (ms) when notification was created */
  timestamp: number;
  /** Whether the user has read the notification */
  read: boolean;
  /** Related event ID (if applicable) */
  eventId?: string;
  /** Related band ID (if applicable) */
  bandId?: string;
  /** Related venue ID (if applicable) */
  venueId?: string;
}

/**
 * Open date entity.
 * Represents an available booking slot at a venue.
 */
export interface OpenDate extends BaseEntity {
  /** ID of the venue offering the date */
  venueId: string;
  /** Unix timestamp (ms) for the available date */
  date: number;
  /** Compensation offered in cents */
  offeredPay?: number;
  /** Preferred genre for the date */
  genre?: Genre;
  /** Current status of the open date */
  status: OpenDateStatus;
  /** Additional requirements or notes */
  description?: string;
  /** Unix timestamp (ms) when open date was posted */
  createdAt: number;
}

/**
 * Application entity.
 * A band's application to perform on an open date.
 */
export interface Application extends BaseEntity {
  /** ID of the applying band */
  bandId: string;
  /** ID of the open date being applied to */
  openDateId: string;
  /** Current application status */
  status: ApplicationStatus;
  /** Band's message to the venue */
  message?: string;
  /** Unix timestamp (ms) when application was submitted */
  appliedAt: number;
  /** Unix timestamp (ms) when venue responded */
  respondedAt?: number;
}

/**
 * Band statistics for the musician dashboard.
 * Aggregated metrics about a band's performance.
 */
export interface BandStats {
  /** Number of shows performed this calendar month */
  showsThisMonth: number;
  /** Total RSVPs across all events */
  totalRsvps: number;
  /** Number of fans who have saved the band */
  newFans: number;
}

/**
 * Analytics data for band performance charts.
 * Used to render dashboard visualizations.
 */
export interface AnalyticsData {
  /** Total RSVPs across all time */
  totalRsvps: number;
  /** Total number of events */
  eventCount: number;
  /** Event-by-event comparison data for charts */
  eventComparison: {
    /** Display name (formatted date) */
    name: string;
    /** Number of RSVPs for this event */
    rsvps: number;
    /** Name of the venue */
    venueName: string;
  }[];
  /** Traffic source breakdown for pie chart */
  trafficData: {
    /** Traffic source name */
    name: string;
    /** Percentage value */
    value: number;
  }[];
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
