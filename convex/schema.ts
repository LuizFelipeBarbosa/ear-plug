import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// User role type
const userRoleValidator = v.union(v.literal("fan"), v.literal("musician"));

// Genre options
const genreValidator = v.union(
  v.literal("indie"),
  v.literal("rock"),
  v.literal("jazz"),
  v.literal("electronic"),
  v.literal("folk"),
  v.literal("pop"),
  v.literal("alternative")
);

// Event status for band calendar
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

// Social links structure
const socialLinksValidator = v.object({
  spotify: v.optional(v.string()),
  appleMusic: v.optional(v.string()),
  instagram: v.optional(v.string()),
  tiktok: v.optional(v.string()),
  youtube: v.optional(v.string()),
  website: v.optional(v.string()),
});

// Coordinates for geolocation
const coordinatesValidator = v.object({
  lat: v.number(),
  lng: v.number(),
});

export default defineSchema({
  // ==================== USERS ====================
  users: defineTable({
    clerkId: v.string(),
    role: userRoleValidator,
    name: v.string(),
    email: v.string(),
    location: v.optional(v.string()),
    avatar: v.optional(v.string()),
    topGenres: v.optional(v.array(genreValidator)),
    memberSince: v.number(), // Unix timestamp
    showsAttended: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // ==================== BANDS ====================
  bands: defineTable({
    userId: v.id("users"), // The musician user who owns this band
    name: v.string(),
    genre: genreValidator,
    location: v.string(),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
    memberCount: v.optional(v.number()),
    socialLinks: v.optional(socialLinksValidator),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_genre", ["genre"])
    .index("by_name", ["name"]),

  // ==================== VENUES ====================
  venues: defineTable({
    name: v.string(),
    address: v.string(),
    city: v.string(),
    capacity: v.number(),
    coordinates: coordinatesValidator,
    images: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    genres: v.optional(v.array(genreValidator)),
  })
    .index("by_city", ["city"])
    .index("by_name", ["name"]),

  // ==================== EVENTS ====================
  events: defineTable({
    title: v.string(),
    bandId: v.id("bands"),
    venueId: v.id("venues"),
    dateTime: v.number(), // Unix timestamp
    image: v.optional(v.string()),
    rsvpCount: v.number(),
    capacity: v.number(),
    price: v.optional(v.number()), // Ticket price in cents
    description: v.optional(v.string()),
    genre: genreValidator,
    status: eventStatusValidator,
  })
    .index("by_band", ["bandId"])
    .index("by_venue", ["venueId"])
    .index("by_date", ["dateTime"])
    .index("by_genre", ["genre"])
    .index("by_status", ["status"]),

  // ==================== RSVPs ====================
  rsvps: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_user_event", ["userId", "eventId"]),

  // ==================== LIKES ====================
  likes: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_user_event", ["userId", "eventId"]),

  // ==================== SAVED ARTISTS ====================
  savedArtists: defineTable({
    userId: v.id("users"),
    bandId: v.id("bands"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_band", ["bandId"])
    .index("by_user_band", ["userId", "bandId"]),

  // ==================== SAVED VENUES ====================
  savedVenues: defineTable({
    userId: v.id("users"),
    venueId: v.id("venues"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_venue", ["venueId"])
    .index("by_user_venue", ["userId", "venueId"]),

  // ==================== CONVERSATIONS ====================
  conversations: defineTable({
    bandId: v.id("bands"),
    venueId: v.id("venues"),
    lastMessageAt: v.number(),
    lastMessagePreview: v.optional(v.string()),
  })
    .index("by_band", ["bandId"])
    .index("by_venue", ["venueId"])
    .index("by_band_venue", ["bandId", "venueId"])
    .index("by_last_message", ["lastMessageAt"]),

  // ==================== MESSAGES ====================
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    timestamp: v.number(),
    read: v.boolean(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_sender", ["senderId"])
    .index("by_timestamp", ["timestamp"]),

  // ==================== NOTIFICATIONS ====================
  notifications: defineTable({
    userId: v.id("users"),
    type: notificationTypeValidator,
    title: v.string(),
    content: v.string(),
    timestamp: v.number(),
    read: v.boolean(),
    eventId: v.optional(v.id("events")),
    bandId: v.optional(v.id("bands")),
    venueId: v.optional(v.id("venues")),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"])
    .index("by_timestamp", ["timestamp"]),

  // ==================== OPEN DATES ====================
  openDates: defineTable({
    venueId: v.id("venues"),
    date: v.number(), // Unix timestamp for the date
    offeredPay: v.optional(v.number()), // In cents
    genre: v.optional(genreValidator),
    status: openDateStatusValidator,
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_venue", ["venueId"])
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_genre", ["genre"]),

  // ==================== APPLICATIONS ====================
  applications: defineTable({
    bandId: v.id("bands"),
    openDateId: v.id("openDates"),
    status: applicationStatusValidator,
    message: v.optional(v.string()),
    appliedAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_band", ["bandId"])
    .index("by_open_date", ["openDateId"])
    .index("by_band_open_date", ["bandId", "openDateId"])
    .index("by_status", ["status"]),
});
