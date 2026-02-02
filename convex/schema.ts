/**
 * @fileoverview Convex database schema definition for the Ear-Plug platform.
 * Defines all 13 tables, their fields, validators, and indexes.
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
  // Booking marketplace notification types
  v.literal("booking_request"),
  v.literal("booking_accepted"),
  v.literal("booking_rejected"),
  v.literal("booking_cancelled"),
  v.literal("deposit_received"),
  v.literal("payment_received"),
  v.literal("booking_reminder"),
  v.literal("booking_message")
);

/**
 * Validator for marketplace event types.
 * Categories of private/public events fans can book bands for.
 */
const marketplaceEventTypeValidator = v.union(
  v.literal("wedding"),
  v.literal("corporate"),
  v.literal("private_party"),
  v.literal("public_gig"),
  v.literal("festival"),
  v.literal("other")
);

/**
 * Validator for booking status.
 * Tracks the lifecycle of a booking from request to completion.
 * - "pending": Initial request from fan, awaiting band response
 * - "negotiating": Band and fan are discussing terms/price
 * - "accepted": Band accepted the booking
 * - "deposit_paid": Fan has paid the deposit
 * - "confirmed": Fully paid and confirmed
 * - "completed": Event has occurred
 * - "cancelled": Booking was cancelled by either party
 * - "rejected": Band declined the request
 * - "expired": Request timed out without response
 */
const bookingStatusValidator = v.union(
  v.literal("pending"),
  v.literal("negotiating"),
  v.literal("accepted"),
  v.literal("deposit_paid"),
  v.literal("confirmed"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("rejected"),
  v.literal("expired")
);

/**
 * Validator for band listing status.
 * - "draft": Listing not yet published
 * - "active": Listing is live and accepting bookings
 * - "paused": Temporarily not accepting bookings
 * - "archived": No longer active
 */
const listingStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("archived")
);

/**
 * Validator for band availability slot status.
 * - "available": Open for booking
 * - "booked": Slot has been booked
 * - "blocked": Manually blocked by band
 */
const availabilityStatusValidator = v.union(
  v.literal("available"),
  v.literal("booked"),
  v.literal("blocked")
);

/**
 * Validator for booking message types.
 * - "text": Regular text message
 * - "quote_update": Price/quote change message
 * - "system": Automated system message
 */
const bookingMessageTypeValidator = v.union(
  v.literal("text"),
  v.literal("quote_update"),
  v.literal("system")
);

/**
 * Validator for transaction types.
 * - "deposit": Initial deposit payment
 * - "final_payment": Remaining balance payment
 * - "refund": Money returned to fan
 */
const transactionTypeValidator = v.union(
  v.literal("deposit"),
  v.literal("final_payment"),
  v.literal("refund")
);

/**
 * Validator for transaction status.
 * - "pending": Payment initiated
 * - "succeeded": Payment completed successfully
 * - "failed": Payment failed
 * - "refunded": Payment has been refunded
 */
const transactionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("refunded")
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
    /** User's location (city/area) */
    location: v.optional(v.string()),
    /** Avatar image URL */
    avatar: v.optional(v.string()),
    /** Preferred music genres (up to 5) */
    topGenres: v.optional(v.array(genreValidator)),
    /** Unix timestamp when user joined */
    memberSince: v.number(),
    /** Number of shows attended (for fans) */
    showsAttended: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

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
    /** Event title/name */
    title: v.string(),
    /** Reference to performing band */
    bandId: v.id("bands"),
    /** Reference to hosting venue */
    venueId: v.id("venues"),
    /** Event start time (Unix timestamp) */
    dateTime: v.number(),
    /** Promotional image URL */
    image: v.optional(v.string()),
    /** Current number of RSVPs */
    rsvpCount: v.number(),
    /** Maximum attendance */
    capacity: v.number(),
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
  })
    .index("by_band", ["bandId"])
    .index("by_venue", ["venueId"])
    .index("by_date", ["dateTime"])
    .index("by_status", ["status"]),

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
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_user_event", ["userId", "eventId"]),

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

  // ==================== BAND LISTINGS (MARKETPLACE) ====================
  /**
   * Band Listings table - Band's marketplace profile for accepting bookings.
   *
   * Contains pricing, availability settings, and supported event types.
   * Each band can have one active listing at a time.
   *
   * Indexes:
   * - by_band: Get listing for a specific band
   * - by_status: Filter listings by status
   * - by_status_event_type: Search active listings by event type
   */
  bandListings: defineTable({
    /** Reference to the band */
    bandId: v.id("bands"),
    /** Listing title/headline */
    title: v.string(),
    /** Detailed description of services offered */
    description: v.optional(v.string()),
    /** Event types the band is available for */
    eventTypes: v.array(marketplaceEventTypeValidator),
    /** Base hourly rate in cents */
    baseHourlyRate: v.number(),
    /** Minimum booking hours */
    minimumHours: v.number(),
    /** Deposit percentage required (0-100) */
    depositPercentage: v.number(),
    /** Optional add-on services with pricing */
    addOns: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.optional(v.string()),
          priceInCents: v.number(),
        })
      )
    ),
    /** Maximum travel distance in miles (0 = no limit) */
    maxTravelDistance: v.optional(v.number()),
    /** Additional notes about booking requirements */
    bookingNotes: v.optional(v.string()),
    /** Cancellation policy description */
    cancellationPolicy: v.optional(v.string()),
    /** Current listing status */
    status: listingStatusValidator,
    /** Unix timestamp when listing was created */
    createdAt: v.number(),
    /** Unix timestamp when listing was last updated */
    updatedAt: v.number(),
  })
    .index("by_band", ["bandId"])
    .index("by_status", ["status"]),

  // ==================== BAND AVAILABILITY ====================
  /**
   * Band Availability table - Specific date/time slots for bookings.
   *
   * Tracks when a band is available, booked, or blocked off.
   *
   * Indexes:
   * - by_band: Get all availability for a band
   * - by_listing: Get availability for a specific listing
   * - by_band_date: Check availability for a specific date
   * - by_status: Filter by availability status
   */
  bandAvailability: defineTable({
    /** Reference to the band */
    bandId: v.id("bands"),
    /** Reference to the band's listing */
    listingId: v.id("bandListings"),
    /** Start date/time (Unix timestamp) */
    startDateTime: v.number(),
    /** End date/time (Unix timestamp) */
    endDateTime: v.number(),
    /** Slot status */
    status: availabilityStatusValidator,
    /** Reference to booking if slot is booked */
    bookingId: v.optional(v.id("bookings")),
    /** Notes for blocked slots */
    notes: v.optional(v.string()),
    /** Unix timestamp when slot was created */
    createdAt: v.number(),
  })
    .index("by_band", ["bandId"])
    .index("by_listing", ["listingId"])
    .index("by_band_date", ["bandId", "startDateTime"])
    .index("by_status", ["status"]),

  // ==================== BOOKINGS ====================
  /**
   * Bookings table - Booking requests from fans to bands.
   *
   * Tracks the full lifecycle of a booking from request to completion.
   *
   * Indexes:
   * - by_fan: Get all bookings for a fan
   * - by_band: Get all bookings for a band
   * - by_listing: Get bookings for a specific listing
   * - by_status: Filter bookings by status
   * - by_event_date: Sort bookings by event date
   */
  bookings: defineTable({
    /** Reference to the fan who requested the booking */
    fanId: v.id("users"),
    /** Reference to the band being booked */
    bandId: v.id("bands"),
    /** Reference to the band's listing */
    listingId: v.id("bandListings"),
    /** Type of event */
    eventType: marketplaceEventTypeValidator,
    /** Event name/title */
    eventName: v.string(),
    /** Event description */
    eventDescription: v.optional(v.string()),
    /** Event date/time (Unix timestamp) */
    eventDateTime: v.number(),
    /** Event duration in hours */
    durationHours: v.number(),
    /** Event location/address */
    eventLocation: v.string(),
    /** Event city */
    eventCity: v.optional(v.string()),
    /** Expected number of guests */
    guestCount: v.optional(v.number()),
    /** Selected add-on names */
    selectedAddOns: v.optional(v.array(v.string())),
    /** Additional requirements from fan */
    specialRequests: v.optional(v.string()),
    /** Current quoted total price in cents */
    totalPriceInCents: v.number(),
    /** Deposit amount in cents */
    depositAmountInCents: v.number(),
    /** Amount paid so far in cents */
    paidAmountInCents: v.number(),
    /** Current booking status */
    status: bookingStatusValidator,
    /** Reason for cancellation/rejection */
    statusReason: v.optional(v.string()),
    /** Unix timestamp when booking was requested */
    requestedAt: v.number(),
    /** Unix timestamp when band responded */
    respondedAt: v.optional(v.number()),
    /** Unix timestamp when deposit was paid */
    depositPaidAt: v.optional(v.number()),
    /** Unix timestamp when final payment was made */
    finalPaymentAt: v.optional(v.number()),
    /** Unix timestamp when booking was confirmed */
    confirmedAt: v.optional(v.number()),
    /** Unix timestamp when booking was completed */
    completedAt: v.optional(v.number()),
    /** Unix timestamp when booking was cancelled */
    cancelledAt: v.optional(v.number()),
  })
    .index("by_fan", ["fanId"])
    .index("by_band", ["bandId"])
    .index("by_listing", ["listingId"])
    .index("by_status", ["status"])
    .index("by_event_date", ["eventDateTime"]),

  // ==================== BOOKING CONVERSATIONS ====================
  /**
   * Booking Conversations table - Messaging threads for bookings.
   *
   * Each booking has one conversation between the fan and band.
   *
   * Indexes:
   * - by_booking: Get conversation for a booking
   * - by_fan: Get all conversations for a fan
   * - by_band: Get all conversations for a band
   * - by_last_message: Sort conversations by recent activity
   */
  bookingConversations: defineTable({
    /** Reference to the booking */
    bookingId: v.id("bookings"),
    /** Reference to the fan */
    fanId: v.id("users"),
    /** Reference to the band */
    bandId: v.id("bands"),
    /** Unix timestamp of the most recent message */
    lastMessageAt: v.number(),
    /** Preview text of the last message */
    lastMessagePreview: v.optional(v.string()),
    /** Number of unread messages for fan */
    fanUnreadCount: v.number(),
    /** Number of unread messages for band */
    bandUnreadCount: v.number(),
  })
    .index("by_booking", ["bookingId"])
    .index("by_fan", ["fanId"])
    .index("by_band", ["bandId"])
    .index("by_last_message", ["lastMessageAt"]),

  // ==================== BOOKING MESSAGES ====================
  /**
   * Booking Messages table - Individual messages within booking conversations.
   *
   * Supports text messages, quote updates, and system messages.
   *
   * Indexes:
   * - by_conversation: Get all messages in a conversation
   * - by_sender: Get all messages sent by a user
   * - by_timestamp: Sort messages chronologically
   */
  bookingMessages: defineTable({
    /** Reference to the parent conversation */
    conversationId: v.id("bookingConversations"),
    /** Reference to the sender user */
    senderId: v.id("users"),
    /** Message content */
    content: v.string(),
    /** Type of message */
    messageType: bookingMessageTypeValidator,
    /** For quote_update messages: new price in cents */
    newPriceInCents: v.optional(v.number()),
    /** Unix timestamp when message was sent */
    timestamp: v.number(),
    /** Whether the recipient has read this message */
    read: v.boolean(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_sender", ["senderId"])
    .index("by_timestamp", ["timestamp"]),

  // ==================== TRANSACTIONS ====================
  /**
   * Transactions table - Payment transaction records.
   *
   * Tracks all payments and refunds for bookings.
   *
   * Indexes:
   * - by_booking: Get all transactions for a booking
   * - by_stripe_payment_intent: Look up by Stripe PaymentIntent ID
   * - by_status: Filter transactions by status
   * - by_type: Filter transactions by type
   */
  transactions: defineTable({
    /** Reference to the booking */
    bookingId: v.id("bookings"),
    /** Transaction type */
    type: transactionTypeValidator,
    /** Amount in cents */
    amountInCents: v.number(),
    /** Stripe PaymentIntent ID */
    stripePaymentIntentId: v.optional(v.string()),
    /** Stripe Charge ID (for refunds) */
    stripeChargeId: v.optional(v.string()),
    /** Stripe Refund ID */
    stripeRefundId: v.optional(v.string()),
    /** Transaction status */
    status: transactionStatusValidator,
    /** Error message if failed */
    errorMessage: v.optional(v.string()),
    /** Unix timestamp when transaction was created */
    createdAt: v.number(),
    /** Unix timestamp when transaction was last updated */
    updatedAt: v.number(),
  })
    .index("by_booking", ["bookingId"])
    .index("by_stripe_payment_intent", ["stripePaymentIntentId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"]),
});
