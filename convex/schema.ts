/**
 * @fileoverview Convex database schema definition for the Ear-Plug platform.
 * Defines the database tables, fields, validators, and indexes.
 * @module convex/schema
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// VALIDATORS
// Reusable Convex validators for common field types
// ============================================================================

/**
 * Validator for user role field.
 * Users can be either "fan" (discover events) or "musician" (manage bands).
 */
const userRoleValidator = v.union(v.literal("fan"), v.literal("musician"));

/**
 * Validator for music genre field.
 * Supports 7 genre categories used throughout the platform.
 */
const genreValidator = v.union(
  v.literal("indie"),
  v.literal("rock"),
  v.literal("jazz"),
  v.literal("electronic"),
  v.literal("folk"),
  v.literal("pop"),
  v.literal("alternative")
);

/**
 * Validator for band post media type.
 */
const bandPostMediaTypeValidator = v.union(
  v.literal("image"),
  v.literal("video")
);

/**
 * Validator for fixed band profile media slot index.
 */
const bandMediaSlotIndexValidator = v.union(
  v.literal(0),
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5)
);

/**
 * Validator for event booking status.
 * - "confirmed": Event is definitely happening
 * - "hold": Tentative booking
 * - "available": Open slot
 */
const eventStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("hold"),
  v.literal("available")
);

/**
 * Validator for event address visibility.
 * - "public": Street address is visible to all fans
 * - "rsvp_only": Street address is revealed only after RSVP
 */
const eventAddressVisibilityValidator = v.union(
  v.literal("public"),
  v.literal("rsvp_only")
);

/**
 * Validator for a single event RSVP poll option.
 */
const eventPollOptionValidator = v.object({
  id: v.string(),
  label: v.string(),
});

/**
 * Validator for an optional event RSVP poll.
 */
const eventPollValidator = v.object({
  question: v.string(),
  options: v.array(eventPollOptionValidator),
});

/**
 * Validator for open date status.
 * - "open": Available for applications
 * - "pending": Has applications under review
 * - "filled": Band has been selected
 */
const openDateStatusValidator = v.union(
  v.literal("open"),
  v.literal("pending"),
  v.literal("filled")
);

/**
 * Validator for application status.
 * - "pending": Awaiting venue response
 * - "accepted": Band was selected
 * - "rejected": Application declined
 */
const applicationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("rejected")
);

/**
 * Validator for band membership roles.
 * - "owner": Full control, including ownership transfer
 * - "admin": Can manage band profile and members
 * - "member": Can access shared workspace, cannot manage members/settings
 */
const bandMemberRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member")
);

/**
 * Validator for band invite lifecycle status.
 */
const bandInviteStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("revoked"),
  v.literal("expired")
);

/**
 * Validator for event co-host invite lifecycle status.
 */
const eventCohostInviteStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("revoked"),
  v.literal("expired")
);

/**
 * Validator for event ticket lifecycle status.
 */
const eventTicketStatusValidator = v.union(
  v.literal("active"),
  v.literal("used"),
  v.literal("revoked")
);

/**
 * Validator for event check-in staff assignment status.
 */
const eventCheckinStaffStatusValidator = v.union(
  v.literal("active"),
  v.literal("revoked")
);

/**
 * Validator for notification types.
 * Each type triggers different UI handling and display.
 */
const notificationTypeValidator = v.union(
  v.literal("event_reminder"),
  v.literal("lineup_change"),
  v.literal("new_event_followed_artist"),
  v.literal("new_event_nearby"),
  v.literal("application_update"),
  v.literal("message"),
  v.literal("booking_cancelled"),
  v.literal("booking_message"),
  v.literal("booking_accepted"),
  v.literal("booking_request")
);

/**
 * Validator for social media links object.
 * All fields are optional URLs to various platforms.
 */
const socialLinksValidator = v.object({
  spotify: v.optional(v.string()),
  appleMusic: v.optional(v.string()),
  instagram: v.optional(v.string()),
  tiktok: v.optional(v.string()),
  youtube: v.optional(v.string()),
  website: v.optional(v.string()),
});

/**
 * Validator for a Spotify top-artist preview row saved for personalization UI.
 */
const spotifyTopArtistPreviewValidator = v.object({
  spotifyArtistId: v.string(),
  name: v.string(),
  imageUrl: v.optional(v.string()),
  externalUrl: v.optional(v.string()),
});

/**
 * Validator for geographic coordinates.
 * Used for venue locations and distance calculations.
 */
const coordinatesValidator = v.object({
  lat: v.number(),
  lng: v.number(),
});

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

export default defineSchema({
  // ==================== USERS ====================
  /**
   * Users table - Platform user profiles linked to Clerk authentication.
   *
   * Stores user metadata, role (fan/musician), and preferences.
   * Each user has a unique Clerk ID for authentication linking.
   *
   * Indexes:
   * - by_clerk_id: Look up user by Clerk authentication ID
   * - by_email: Look up user by email address
   * - by_phone_number: Look up user by normalized E.164 phone number
   * - by_role: Filter users by role (fan/musician)
   */
  users: defineTable({
    /** Clerk authentication user ID (unique) */
    clerkId: v.string(),
    /** User type: "fan" or "musician" */
    role: userRoleValidator,
    /** Display name */
    name: v.string(),
    /** Email address */
    email: v.string(),
    /** Primary phone number (normalized E.164 when available) */
    phoneNumber: v.optional(v.string()),
    /** User's location (city/area) */
    location: v.optional(v.string()),
    /** Avatar image URL */
    avatar: v.optional(v.string()),
    /** Convex storage ID for avatar image (if uploaded via storage) */
    avatarStorageId: v.optional(v.id("_storage")),
    /** Preferred music genres (up to 5) */
    topGenres: v.optional(v.array(genreValidator)),
    /** Unix timestamp when user joined */
    memberSince: v.number(),
    /** Number of shows attended (for fans) */
    showsAttended: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_phone_number", ["phoneNumber"])
    .index("by_role", ["role"]),

  // ==================== SPOTIFY PROFILES ====================
  /**
   * Derived Spotify personalization state for a user.
   *
   * Stores sync timestamps and normalized taste data only.
   * OAuth tokens remain in Clerk and are never persisted in Convex.
   */
  spotifyProfiles: defineTable({
    /** Reference to the owning user */
    userId: v.id("users"),
    /** Unix timestamp when Spotify taste was last synced */
    lastSyncedAt: v.number(),
    /** Derived Ear-Plug genres from Spotify top artists */
    topGenres: v.array(genreValidator),
    /** Preview of top Spotify artists for settings UI */
    topArtists: v.array(spotifyTopArtistPreviewValidator),
    /** Local bands matched from Spotify artist ids / names */
    matchedBandIds: v.array(v.id("bands")),
  }).index("by_user", ["userId"]),

  // ==================== BANDS ====================
  /**
   * Bands table - Musical act profiles managed by musician users.
   *
   * Each band belongs to exactly one musician user.
   * Supports multiple genres and social media links.
   *
   * Indexes:
   * - by_user: Find band by owner user ID
   * - by_name: Search bands by name
   */
  bands: defineTable({
    /** Reference to the musician user who owns this band */
    userId: v.id("users"),
    /** Band name */
    name: v.string(),
    /** Music genres (1-5) - preferred field */
    genres: v.optional(v.array(genreValidator)),
    /** @deprecated Legacy single genre field - use genres array instead */
    genre: v.optional(genreValidator),
    /** Band's home location (city/area) */
    location: v.string(),
    /** Profile/promo image URL */
    image: v.optional(v.string()),
    /** Convex storage ID for band image (if uploaded via storage) */
    imageStorageId: v.optional(v.id("_storage")),
    /** Band biography */
    bio: v.optional(v.string()),
    /** Number of members */
    memberCount: v.optional(v.number()),
    /** Social media links */
    socialLinks: v.optional(socialLinksValidator),
    /** Unix timestamp when band was created */
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_name", ["name"]),

  // ==================== BAND MEMBERSHIPS ====================
  /**
   * Shared workspace access for band profiles.
   *
   * Legacy single-owner `bands.userId` remains for compatibility, while this
   * table is the source of truth for authorization.
   */
  bandMemberships: defineTable({
    /** Reference to the shared band workspace */
    bandId: v.id("bands"),
    /** Reference to member user */
    userId: v.id("users"),
    /** Membership role */
    role: bandMemberRoleValidator,
    /** Unix timestamp when membership was created */
    joinedAt: v.number(),
    /** User who invited this member (optional for backfilled owners) */
    invitedBy: v.optional(v.id("users")),
  })
    .index("by_band", ["bandId"])
    .index("by_user", ["userId"])
    .index("by_band_user", ["bandId", "userId"]),

  // ==================== BAND INVITES ====================
  /**
   * Pending/accepted/declined invitations for existing users to join a band.
   */
  bandInvites: defineTable({
    /** Target band workspace */
    bandId: v.id("bands"),
    /** Target existing user */
    targetUserId: v.id("users"),
    /** Target email (denormalized for audit/debugging) */
    email: v.string(),
    /** Target phone number (denormalized, normalized E.164 when available) */
    phoneNumber: v.optional(v.string()),
    /** Invited role */
    role: v.union(v.literal("admin"), v.literal("member")),
    /** Current invite status */
    status: bandInviteStatusValidator,
    /** User who sent the invite */
    invitedBy: v.id("users"),
    /** Unix timestamp when invite was created */
    createdAt: v.number(),
    /** Unix timestamp when invite was accepted/declined/revoked/expired */
    respondedAt: v.optional(v.number()),
    /** Unix timestamp after which pending invite is invalid */
    expiresAt: v.number(),
  })
    .index("by_band", ["bandId"])
    .index("by_target_user", ["targetUserId"])
    .index("by_band_target_status", ["bandId", "targetUserId", "status"]),

  // ==================== VENUES ====================
  /**
   * Venues table - Bay Area live music venues.
   *
   * Stores venue information including location, capacity, and genres.
   * Coordinates are used for map display and distance filtering.
   *
   * Indexes:
   * - by_city: Filter venues by city
   * - by_name: Search venues by name
   */
  venues: defineTable({
    /** Venue name */
    name: v.string(),
    /** Street address */
    address: v.string(),
    /** City name */
    city: v.string(),
    /** Maximum event capacity */
    capacity: v.number(),
    /** Geographic coordinates for mapping */
    coordinates: coordinatesValidator,
    /** Photo URLs */
    images: v.optional(v.array(v.string())),
    /** Venue description */
    description: v.optional(v.string()),
    /** Music genres typically hosted */
    genres: v.optional(v.array(genreValidator)),
  })
    .index("by_city", ["city"])
    .index("by_name", ["name"]),

  // ==================== EVENTS ====================
  /**
   * Events table - Live music shows at venues.
   *
   * Each event links a band to a venue at a specific date/time.
   * Tracks RSVP count and booking status.
   *
   * Indexes:
   * - by_band: Find events by performing band
   * - by_venue: Find events at a specific venue
   * - by_date: Sort/filter events chronologically
   * - by_status: Filter events by booking status
   */
  events: defineTable({
    /** Event title/name (optional for tentative drafts) */
    title: v.optional(v.string()),
    /** Reference to performing band */
    bandId: v.id("bands"),
    /** Reference to hosting venue (optional for tentative drafts) */
    venueId: v.optional(v.id("venues")),
    /** Event start time (Unix timestamp, optional for tentative drafts) */
    dateTime: v.optional(v.number()),
    /** Promotional image URL */
    image: v.optional(v.string()),
    /** Convex storage ID for event image (if uploaded via storage) */
    imageStorageId: v.optional(v.id("_storage")),
    /** Current number of RSVPs */
    rsvpCount: v.number(),
    /** Maximum attendance (optional for tentative drafts) */
    capacity: v.optional(v.number()),
    /** Ticket price in cents (0 = free) */
    price: v.optional(v.number()),
    /** Event description */
    description: v.optional(v.string()),
    /** Music genres - preferred field */
    genres: v.optional(v.array(genreValidator)),
    /** @deprecated Legacy single genre field - use genres array instead */
    genre: v.optional(genreValidator),
    /** Booking status */
    status: eventStatusValidator,
    /**
     * Street-address visibility for fan-facing surfaces.
     * Optional for backward compatibility; treat missing as "public".
     */
    addressVisibility: v.optional(eventAddressVisibilityValidator),
    /** Optional RSVP poll configuration */
    poll: v.optional(eventPollValidator),
  })
    .index("by_band", ["bandId"])
    .index("by_venue", ["venueId"])
    .index("by_date", ["dateTime"])
    .index("by_status", ["status"])
    .index("by_status_date", ["status", "dateTime"])
    .index("by_band_date", ["bandId", "dateTime"])
    .index("by_venue_date", ["venueId", "dateTime"]),

  // ==================== EVENT CO-HOST INVITES ====================
  /**
   * Co-host invitations for events between bands.
   *
   * Host band remains canonical owner on `events.bandId`, while accepted co-host
   * rows grant collaborative access for management and analytics.
   */
  eventCohostInvites: defineTable({
    /** Event being co-hosted */
    eventId: v.id("events"),
    /** Canonical host band (matches events.bandId) */
    hostBandId: v.id("bands"),
    /** Invited co-host band */
    invitedBandId: v.id("bands"),
    /** Band workspace used by inviter */
    invitedByBandId: v.id("bands"),
    /** User who sent the invite */
    invitedByUserId: v.id("users"),
    /** Current invite lifecycle status */
    status: eventCohostInviteStatusValidator,
    /** Unix timestamp when invite was created */
    createdAt: v.number(),
    /** Unix timestamp when invite was responded to/revoked/expired */
    respondedAt: v.optional(v.number()),
    /** Unix timestamp after which pending invite is invalid */
    expiresAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_event_status", ["eventId", "status"])
    .index("by_invited_band", ["invitedBandId"])
    .index("by_host_band", ["hostBandId"])
    .index("by_invited_by_band", ["invitedByBandId"])
    .index("by_invited_band_status", ["invitedBandId", "status"])
    .index("by_event_invited_band", ["eventId", "invitedBandId"]),

  // ==================== RSVPs ====================
  /**
   * RSVPs table - Records of users planning to attend events.
   *
   * Creates a many-to-many relationship between users and events.
   * Used for calendar view and RSVP count tracking.
   *
   * Indexes:
   * - by_user: Get all RSVPs for a user (calendar view)
   * - by_event: Get all RSVPs for an event (attendee list)
   * - by_user_event: Check if specific user has RSVP'd to specific event
   */
  rsvps: defineTable({
    /** Reference to the user who RSVP'd */
    userId: v.id("users"),
    /** Reference to the event */
    eventId: v.id("events"),
    /** Unix timestamp when RSVP was created */
    createdAt: v.number(),
    /**
     * Attendance state managed by bands at check-in time.
     * Optional for backward compatibility; treat missing as "on_list".
     */
    attendanceStatus: v.optional(v.union(v.literal("on_list"), v.literal("attended"))),
    /** Unix timestamp when the RSVP was marked attended */
    attendedAt: v.optional(v.number()),
    /** Selected poll option id for the related event poll */
    pollAnswerOptionId: v.optional(v.string()),
    /** Unix timestamp when the RSVP poll was answered */
    pollAnsweredAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_user_event", ["userId", "eventId"]),

  // ==================== EVENT TICKETS ====================
  /**
   * Event tickets table - One-time QR tickets issued for RSVPs.
   *
   * Each RSVP receives a single ticket token used for door check-in.
   *
   * Indexes:
   * - by_rsvp: Resolve ticket from RSVP
   * - by_event: List tickets for an event
   * - by_user: List tickets for a user
   * - by_token: Resolve scan payload token
   * - by_event_status: Filter event tickets by status
   */
  eventTickets: defineTable({
    /** Reference to the event */
    eventId: v.id("events"),
    /** Reference to the RSVP that owns this ticket */
    rsvpId: v.id("rsvps"),
    /** Reference to the attendee */
    userId: v.id("users"),
    /** Opaque one-time scan token */
    token: v.string(),
    /** Ticket lifecycle status */
    status: eventTicketStatusValidator,
    /** Unix timestamp when ticket was issued */
    issuedAt: v.number(),
    /** Unix timestamp when ticket was consumed by scan/check-in */
    usedAt: v.optional(v.number()),
    /** User who consumed the ticket */
    usedByUserId: v.optional(v.id("users")),
    /** Unix timestamp when ticket was revoked */
    revokedAt: v.optional(v.number()),
    /** Reason for revocation */
    revokedReason: v.optional(v.string()),
  })
    .index("by_rsvp", ["rsvpId"])
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_token", ["token"])
    .index("by_event_status", ["eventId", "status"]),

  // ==================== EVENT CHECK-IN STAFF ====================
  /**
   * Event check-in staff table - Event-scoped scanner access.
   *
   * Managers (event band owner/admin) can assign existing users as door staff.
   */
  eventCheckinStaff: defineTable({
    /** Event where the staff user can scan tickets */
    eventId: v.id("events"),
    /** Staff user granted scanner access */
    userId: v.id("users"),
    /** Assignment lifecycle status */
    status: eventCheckinStaffStatusValidator,
    /** Manager user who assigned this staff record */
    assignedByUserId: v.id("users"),
    /** Active band workspace used by manager for assignment */
    assignedByBandId: v.id("bands"),
    /** Unix timestamp when assignment was created */
    createdAt: v.number(),
    /** Unix timestamp when assignment was revoked */
    revokedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_assigned_by_band", ["assignedByBandId"])
    .index("by_event_user", ["eventId", "userId"])
    .index("by_event_status", ["eventId", "status"]),

  // ==================== LIKES ====================
  /**
   * Likes table - Events that users have saved/liked for later.
   *
   * Allows users to bookmark events without committing to RSVP.
   *
   * Indexes:
   * - by_user: Get all liked events for a user
   * - by_event: Get all users who liked an event
   * - by_user_event: Check if specific user liked specific event
   */
  likes: defineTable({
    /** Reference to the user who liked the event */
    userId: v.id("users"),
    /** Reference to the liked event */
    eventId: v.id("events"),
    /** Unix timestamp when like was created */
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_user_event", ["userId", "eventId"]),

  // ==================== SAVED ARTISTS ====================
  /**
   * Saved Artists table - Bands that users follow/save.
   *
   * Enables fans to follow bands and receive notifications about new events.
   *
   * Indexes:
   * - by_user: Get all saved bands for a user
   * - by_band: Get all users who saved a band (followers)
   * - by_user_band: Check if specific user follows specific band
   */
  savedArtists: defineTable({
    /** Reference to the user who saved the band */
    userId: v.id("users"),
    /** Reference to the saved band */
    bandId: v.id("bands"),
    /** Unix timestamp when band was saved */
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_band", ["bandId"])
    .index("by_user_band", ["userId", "bandId"]),

  // ==================== SAVED VENUES ====================
  /**
   * Saved Venues table - Venues that users follow/save.
   *
   * Enables users to follow venues and receive notifications about new events.
   *
   * Indexes:
   * - by_user: Get all saved venues for a user
   * - by_venue: Get all users who saved a venue
   * - by_user_venue: Check if specific user follows specific venue
   */
  savedVenues: defineTable({
    /** Reference to the user who saved the venue */
    userId: v.id("users"),
    /** Reference to the saved venue */
    venueId: v.id("venues"),
    /** Unix timestamp when venue was saved */
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_venue", ["venueId"])
    .index("by_user_venue", ["userId", "venueId"]),

  // ==================== BAND PROFILE ENGAGEMENTS ====================
  /**
   * Per-fan engagement records for band public profile views.
   *
   * Stores a running, deduplicated personal view counter for each (user, band)
   * pair to power fan-profile "most viewed/saved artists" insights.
   *
   * Indexes:
   * - by_user: Get all viewed bands for a user
   * - by_user_band: Read/update one engagement row
   * - by_band: Aggregate engagement for a band if needed
   */
  bandProfileEngagements: defineTable({
    /** Reference to the fan viewing band profiles */
    userId: v.id("users"),
    /** Reference to the viewed band */
    bandId: v.id("bands"),
    /** Deduplicated personal profile view count */
    viewCount: v.number(),
    /** Unix timestamp when first tracked */
    firstViewedAt: v.number(),
    /** Unix timestamp when last tracked */
    lastViewedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_band", ["userId", "bandId"])
    .index("by_band", ["bandId"]),

  // ==================== BAND MEDIA SLOTS ====================
  /**
   * Fixed profile media slots for band workspace profile.
   *
   * Exactly one slot row per (bandId, slotIndex). Empty slots have no row.
   */
  bandMediaSlots: defineTable({
    /** Reference to the owning band */
    bandId: v.id("bands"),
    /** Fixed slot index [0..5] */
    slotIndex: bandMediaSlotIndexValidator,
    /** Reference to Convex storage object */
    mediaStorageId: v.id("_storage"),
    /** Media type */
    mediaType: bandPostMediaTypeValidator,
    /** Optional short caption */
    caption: v.optional(v.string()),
    /** Optional city-level event location */
    location: v.optional(v.string()),
    /** Uploaded file MIME type */
    mimeType: v.string(),
    /** Uploaded file size in bytes */
    fileSizeBytes: v.number(),
    /** Video duration in seconds (video slots only) */
    durationSeconds: v.optional(v.number()),
    /** Unix timestamp when slot was created */
    createdAt: v.number(),
    /** Unix timestamp when slot was last updated */
    updatedAt: v.number(),
  })
    .index("by_band_slot", ["bandId", "slotIndex"])
    .index("by_band_updated", ["bandId", "updatedAt"]),

  // ==================== CONVERSATIONS ====================
  /**
   * Conversations table - Messaging threads between bands and venues.
   *
   * Each conversation is between exactly one band and one venue.
   * Stores metadata about the last message for preview display.
   *
   * Indexes:
   * - by_band: Get all conversations for a band
   * - by_venue: Get all conversations for a venue
   * - by_band_venue: Find specific conversation between band and venue
   * - by_last_message: Sort conversations by most recent activity
   */
  conversations: defineTable({
    /** Reference to the band in the conversation */
    bandId: v.id("bands"),
    /** Reference to the venue in the conversation */
    venueId: v.id("venues"),
    /** Unix timestamp of the most recent message */
    lastMessageAt: v.number(),
    /** Preview text of the last message (truncated) */
    lastMessagePreview: v.optional(v.string()),
  })
    .index("by_band", ["bandId"])
    .index("by_venue", ["venueId"])
    .index("by_band_venue", ["bandId", "venueId"])
    .index("by_last_message", ["lastMessageAt"]),

  // ==================== MESSAGES ====================
  /**
   * Messages table - Individual messages within conversations.
   *
   * Each message belongs to exactly one conversation.
   * Tracks read status for unread count display.
   *
   * Indexes:
   * - by_conversation: Get all messages in a conversation
   * - by_sender: Get all messages sent by a user
   * - by_timestamp: Sort messages chronologically
   */
  messages: defineTable({
    /** Reference to the parent conversation */
    conversationId: v.id("conversations"),
    /** Reference to the sender user */
    senderId: v.id("users"),
    /** Message text content */
    content: v.string(),
    /** Unix timestamp when message was sent */
    timestamp: v.number(),
    /** Whether the recipient has read this message */
    read: v.boolean(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_sender", ["senderId"])
    .index("by_timestamp", ["timestamp"]),

  // ==================== CONVERSATION READS ====================
  /**
   * Per-user read cursors for conversation-level unread counts.
   */
  conversationReads: defineTable({
    /** Conversation being tracked */
    conversationId: v.id("conversations"),
    /** Member whose read cursor is stored */
    userId: v.id("users"),
    /** Unix timestamp of latest message this user has read */
    lastReadAt: v.number(),
  })
    .index("by_conversation_user", ["conversationId", "userId"])
    .index("by_user", ["userId"]),

  // ==================== NOTIFICATIONS ====================
  /**
   * Notifications table - Platform notifications for users.
   *
   * Stores various notification types with optional references to related entities.
   *
   * Indexes:
   * - by_user: Get all notifications for a user
   * - by_user_read: Filter notifications by user and read status
   * - by_timestamp: Sort notifications chronologically
   */
  notifications: defineTable({
    /** Reference to the recipient user */
    userId: v.id("users"),
    /** Notification type for UI handling */
    type: notificationTypeValidator,
    /** Notification headline */
    title: v.string(),
    /** Notification body text */
    content: v.string(),
    /** Unix timestamp when notification was created */
    timestamp: v.number(),
    /** Whether user has read this notification */
    read: v.boolean(),
    /** Optional reference to related event */
    eventId: v.optional(v.id("events")),
    /** Optional reference to related band */
    bandId: v.optional(v.id("bands")),
    /** Optional reference to related venue */
    venueId: v.optional(v.id("venues")),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"])
    .index("by_band", ["bandId"])
    .index("by_event", ["eventId"])
    .index("by_timestamp", ["timestamp"]),

  // ==================== OPEN DATES ====================
  /**
   * Open Dates table - Available booking slots at venues.
   *
   * Venues can post open dates to solicit band applications.
   * Status tracks whether the slot is available, pending review, or filled.
   *
   * Indexes:
   * - by_venue: Get all open dates for a venue
   * - by_date: Sort/filter by date
   * - by_status: Filter by availability status
   * - by_genre: Filter by preferred genre
   */
  openDates: defineTable({
    /** Reference to the venue offering the date */
    venueId: v.id("venues"),
    /** The available date (Unix timestamp) */
    date: v.number(),
    /** Compensation offered in cents */
    offeredPay: v.optional(v.number()),
    /** Preferred genre for the slot */
    genre: v.optional(genreValidator),
    /** Current status of the open date */
    status: openDateStatusValidator,
    /** Additional requirements or notes */
    description: v.optional(v.string()),
    /** Unix timestamp when open date was posted */
    createdAt: v.number(),
  })
    .index("by_venue", ["venueId"])
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_genre", ["genre"]),

  // ==================== APPLICATIONS ====================
  /**
   * Applications table - Band applications to open dates.
   *
   * Tracks the application process from submission through venue response.
   *
   * Indexes:
   * - by_band: Get all applications from a band
   * - by_open_date: Get all applications for an open date
   * - by_band_open_date: Check if band already applied to specific open date
   * - by_status: Filter applications by status
   */
  applications: defineTable({
    /** Reference to the applying band */
    bandId: v.id("bands"),
    /** Reference to the open date being applied to */
    openDateId: v.id("openDates"),
    /** Current application status */
    status: applicationStatusValidator,
    /** Band's message to the venue */
    message: v.optional(v.string()),
    /** Unix timestamp when application was submitted */
    appliedAt: v.number(),
    /** Unix timestamp when venue responded (if any) */
    respondedAt: v.optional(v.number()),
  })
    .index("by_band", ["bandId"])
    .index("by_open_date", ["openDateId"])
    .index("by_band_open_date", ["bandId", "openDateId"])
    .index("by_status", ["status"]),
});
