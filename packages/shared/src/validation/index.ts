/**
 * @fileoverview Zod validation schemas for the Ear-Plug platform.
 * Provides runtime type validation and input sanitization for API inputs.
 * @module @ear-plug/shared/validation
 */

import { z } from "zod";

/**
 * Schema for validating music genre values.
 * Ensures the genre is one of the supported platform genres.
 *
 * @example
 * genreSchema.parse("rock"); // "rock"
 * genreSchema.parse("country"); // throws ZodError
 */
export const genreSchema = z.enum([
  "indie",
  "rock",
  "jazz",
  "electronic",
  "folk",
  "pop",
  "alternative",
]);

/**
 * Schema for validating user role values.
 * Used during onboarding and role updates.
 *
 * @example
 * userRoleSchema.parse("fan"); // "fan"
 * userRoleSchema.parse("admin"); // throws ZodError
 */
export const userRoleSchema = z.enum(["fan", "musician"]);

/**
 * Schema for validating event status values.
 * Used for band calendar event management.
 *
 * @example
 * eventStatusSchema.parse("confirmed"); // "confirmed"
 */
export const eventStatusSchema = z.enum(["confirmed", "hold", "available"]);

/**
 * Schema for validating open date status values.
 * Used for venue booking slot management.
 *
 * @example
 * openDateStatusSchema.parse("open"); // "open"
 */
export const openDateStatusSchema = z.enum(["open", "pending", "filled"]);

/**
 * Schema for validating application status values.
 * Used for band applications to open dates.
 *
 * @example
 * applicationStatusSchema.parse("pending"); // "pending"
 */
export const applicationStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
]);

/**
 * Schema for validating notification type values.
 * Ensures notifications have valid type for proper handling.
 *
 * @example
 * notificationTypeSchema.parse("event_reminder"); // "event_reminder"
 */
export const notificationTypeSchema = z.enum([
  "event_reminder",
  "lineup_change",
  "new_event_followed_artist",
  "new_event_nearby",
  "application_update",
  "message",
  // Booking marketplace notification types
  "booking_request",
  "booking_accepted",
  "booking_rejected",
  "booking_cancelled",
  "deposit_received",
  "payment_received",
  "booking_reminder",
  "booking_message",
]);

// ============================================================================
// MARKETPLACE VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for validating marketplace event type values.
 *
 * @example
 * marketplaceEventTypeSchema.parse("wedding"); // "wedding"
 */
export const marketplaceEventTypeSchema = z.enum([
  "wedding",
  "corporate",
  "private_party",
  "public_gig",
  "festival",
  "other",
]);

/**
 * Schema for validating booking status values.
 *
 * @example
 * bookingStatusSchema.parse("pending"); // "pending"
 */
export const bookingStatusSchema = z.enum([
  "pending",
  "negotiating",
  "accepted",
  "deposit_paid",
  "confirmed",
  "completed",
  "cancelled",
  "rejected",
  "expired",
]);

/**
 * Schema for validating listing status values.
 *
 * @example
 * listingStatusSchema.parse("active"); // "active"
 */
export const listingStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "archived",
]);

/**
 * Schema for validating availability status values.
 *
 * @example
 * availabilityStatusSchema.parse("available"); // "available"
 */
export const availabilityStatusSchema = z.enum([
  "available",
  "booked",
  "blocked",
]);

/**
 * Schema for validating booking message type values.
 *
 * @example
 * bookingMessageTypeSchema.parse("text"); // "text"
 */
export const bookingMessageTypeSchema = z.enum([
  "text",
  "quote_update",
  "system",
]);

/**
 * Schema for validating transaction type values.
 *
 * @example
 * transactionTypeSchema.parse("deposit"); // "deposit"
 */
export const transactionTypeSchema = z.enum([
  "deposit",
  "final_payment",
  "refund",
]);

/**
 * Schema for validating transaction status values.
 *
 * @example
 * transactionStatusSchema.parse("succeeded"); // "succeeded"
 */
export const transactionStatusSchema = z.enum([
  "pending",
  "succeeded",
  "failed",
  "refunded",
]);

/**
 * Schema for validating geographic coordinates.
 * Enforces valid latitude (-90 to 90) and longitude (-180 to 180) ranges.
 *
 * @example
 * coordinatesSchema.parse({ lat: 37.8044, lng: -122.2712 }); // valid
 * coordinatesSchema.parse({ lat: 100, lng: -122 }); // throws ZodError (lat out of range)
 */
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Schema for validating social media links.
 * All fields are optional but must be valid URLs if provided.
 *
 * @example
 * socialLinksSchema.parse({ spotify: "https://spotify.com/artist/123" }); // valid
 * socialLinksSchema.parse({ instagram: "not-a-url" }); // throws ZodError
 */
export const socialLinksSchema = z.object({
  spotify: z.string().url().optional(),
  appleMusic: z.string().url().optional(),
  instagram: z.string().url().optional(),
  tiktok: z.string().url().optional(),
  youtube: z.string().url().optional(),
  website: z.string().url().optional(),
});

/**
 * Schema for validating user profile update inputs.
 * All fields are optional for partial updates.
 * Enforces reasonable limits on string lengths and genre array size.
 *
 * @example
 * userProfileUpdateSchema.parse({ name: "John Doe", topGenres: ["rock", "indie"] });
 */
export const userProfileUpdateSchema = z.object({
  /** User's display name (1-100 characters) */
  name: z.string().min(1).max(100).optional(),
  /** User's location (max 200 characters) */
  location: z.string().max(200).optional(),
  /** Avatar image URL */
  avatar: z.string().url().optional(),
  /** User's preferred genres (max 5) */
  topGenres: z.array(genreSchema).max(5).optional(),
});

/**
 * Schema for validating band creation inputs.
 * Requires essential fields: name, genres, and location.
 *
 * @example
 * bandCreateSchema.parse({
 *   name: "The Local Heroes",
 *   genres: ["rock", "alternative"],
 *   location: "Oakland, CA"
 * });
 */
export const bandCreateSchema = z.object({
  /** Band name (1-100 characters, required) */
  name: z.string().min(1).max(100),
  /** Music genres (1-5 genres, at least one required) */
  genres: z.array(genreSchema).min(1).max(5),
  /** Band's home location (1-200 characters, required) */
  location: z.string().min(1).max(200),
  /** Profile/promo image URL */
  image: z.string().url().optional(),
  /** Band biography (max 1000 characters) */
  bio: z.string().max(1000).optional(),
  /** Number of band members (1-50) */
  memberCount: z.number().int().min(1).max(50).optional(),
  /** Social media and website links */
  socialLinks: socialLinksSchema.optional(),
});

/**
 * Schema for validating band profile update inputs.
 * All fields from bandCreateSchema but optional for partial updates.
 *
 * @example
 * bandUpdateSchema.parse({ bio: "We play indie rock in the Bay Area" });
 */
export const bandUpdateSchema = bandCreateSchema.partial();

/**
 * Schema for validating event creation inputs.
 * Requires all essential event details.
 *
 * @example
 * eventCreateSchema.parse({
 *   title: "Friday Night Live",
 *   bandId: "band123",
 *   venueId: "venue456",
 *   dateTime: 1704067200000,
 *   capacity: 200,
 *   genre: "rock"
 * });
 */
export const eventCreateSchema = z.object({
  /** Event title (1-200 characters, required) */
  title: z.string().min(1).max(200),
  /** ID of the performing band (required) */
  bandId: z.string(),
  /** ID of the hosting venue (required) */
  venueId: z.string(),
  /** Event start time as Unix timestamp in milliseconds (required) */
  dateTime: z.number().positive(),
  /** Event promotional image URL */
  image: z.string().url().optional(),
  /** Maximum attendance capacity (required, positive integer) */
  capacity: z.number().int().positive(),
  /** Ticket price in cents (0 or positive for free events) */
  price: z.number().int().nonnegative().optional(),
  /** Event description (max 2000 characters) */
  description: z.string().max(2000).optional(),
  /** Event genre (required) */
  genre: genreSchema,
});

/**
 * Schema for validating message sending inputs.
 * Enforces message length limits.
 *
 * @example
 * messageSendSchema.parse({
 *   conversationId: "conv123",
 *   content: "Thanks for reaching out!"
 * });
 */
export const messageSendSchema = z.object({
  /** ID of the conversation to send message in (required) */
  conversationId: z.string(),
  /** Message text content (1-5000 characters, required) */
  content: z.string().min(1).max(5000),
});

/**
 * Schema for validating search query inputs.
 * Enforces reasonable query length and optional result limit.
 *
 * @example
 * searchSchema.parse({ query: "rock concert", limit: 20 });
 */
export const searchSchema = z.object({
  /** Search query text (1-200 characters, required) */
  query: z.string().min(1).max(200),
  /** Maximum number of results to return (1-100) */
  limit: z.number().int().min(1).max(100).optional(),
});

/**
 * Schema for validating map filter inputs.
 * All fields optional for flexible filtering.
 *
 * @example
 * mapFilterSchema.parse({ genre: "jazz", radiusMiles: 10 });
 */
export const mapFilterSchema = z.object({
  /** Filter by music genre */
  genre: genreSchema.optional(),
  /** Filter radius in miles from user location (1-50 miles) */
  radiusMiles: z.number().min(1).max(50).optional(),
  /** Text search query (max 200 characters) */
  searchQuery: z.string().max(200).optional(),
});

/**
 * Schema for validating band application inputs.
 * Used when a band applies to perform on an open date.
 *
 * @example
 * applicationCreateSchema.parse({
 *   openDateId: "date123",
 *   bandId: "band456",
 *   message: "We'd love to play at your venue!"
 * });
 */
export const applicationCreateSchema = z.object({
  /** ID of the open date to apply for (required) */
  openDateId: z.string(),
  /** ID of the applying band (required) */
  bandId: z.string(),
  /** Optional message to the venue (max 1000 characters) */
  message: z.string().max(1000).optional(),
});

// ============================================================================
// Inferred TypeScript Types
// ============================================================================

/**
 * Inferred type for valid genre values.
 * Use this when you need the type but not the runtime validation.
 */
export type GenreInput = z.infer<typeof genreSchema>;

/**
 * Inferred type for valid user role values.
 */
export type UserRoleInput = z.infer<typeof userRoleSchema>;

/**
 * Inferred type for user profile update payloads.
 */
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;

/**
 * Inferred type for band creation payloads.
 */
export type BandCreateInput = z.infer<typeof bandCreateSchema>;

/**
 * Inferred type for band update payloads.
 */
export type BandUpdateInput = z.infer<typeof bandUpdateSchema>;

/**
 * Inferred type for event creation payloads.
 */
export type EventCreateInput = z.infer<typeof eventCreateSchema>;

/**
 * Inferred type for message sending payloads.
 */
export type MessageSendInput = z.infer<typeof messageSendSchema>;

/**
 * Inferred type for search query payloads.
 */
export type SearchInput = z.infer<typeof searchSchema>;

/**
 * Inferred type for map filter payloads.
 */
export type MapFilterInput = z.infer<typeof mapFilterSchema>;

/**
 * Inferred type for application creation payloads.
 */
export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;

// ============================================================================
// MARKETPLACE SCHEMAS
// ============================================================================

/**
 * Schema for add-on service in listings.
 */
export const listingAddOnSchema = z.object({
  /** Add-on name (1-100 characters) */
  name: z.string().min(1).max(100),
  /** Description (max 500 characters) */
  description: z.string().max(500).optional(),
  /** Price in cents (positive integer) */
  priceInCents: z.number().int().positive(),
});

/**
 * Schema for creating a band listing.
 *
 * @example
 * listingCreateSchema.parse({
 *   bandId: "band123",
 *   title: "Book us for your event!",
 *   eventTypes: ["wedding", "corporate"],
 *   baseHourlyRate: 50000, // $500/hour
 *   minimumHours: 2,
 *   depositPercentage: 25,
 * });
 */
export const listingCreateSchema = z.object({
  /** ID of the band (required) */
  bandId: z.string(),
  /** Listing title (1-200 characters, required) */
  title: z.string().min(1).max(200),
  /** Description (max 2000 characters) */
  description: z.string().max(2000).optional(),
  /** Event types supported (at least one required) */
  eventTypes: z.array(marketplaceEventTypeSchema).min(1).max(6),
  /** Base hourly rate in cents (required, min $10/hour) */
  baseHourlyRate: z.number().int().min(1000),
  /** Minimum booking hours (required, 1-24) */
  minimumHours: z.number().int().min(1).max(24),
  /** Deposit percentage (required, 0-100) */
  depositPercentage: z.number().int().min(0).max(100),
  /** Add-on services (max 10) */
  addOns: z.array(listingAddOnSchema).max(10).optional(),
  /** Maximum travel distance in miles (0-500) */
  maxTravelDistance: z.number().int().min(0).max(500).optional(),
  /** Booking notes (max 1000 characters) */
  bookingNotes: z.string().max(1000).optional(),
  /** Cancellation policy (max 2000 characters) */
  cancellationPolicy: z.string().max(2000).optional(),
  /** Listing status */
  status: listingStatusSchema.optional(),
});

/**
 * Schema for updating a band listing.
 * All fields are optional for partial updates.
 */
export const listingUpdateSchema = listingCreateSchema.partial().omit({
  bandId: true,
});

/**
 * Schema for creating a booking request.
 *
 * @example
 * bookingRequestSchema.parse({
 *   listingId: "listing123",
 *   eventType: "wedding",
 *   eventName: "Smith Wedding Reception",
 *   eventDateTime: 1704067200000,
 *   durationHours: 4,
 *   eventLocation: "123 Main St, Oakland, CA",
 * });
 */
export const bookingRequestSchema = z.object({
  /** ID of the listing (required) */
  listingId: z.string(),
  /** Event type (required) */
  eventType: marketplaceEventTypeSchema,
  /** Event name (1-200 characters, required) */
  eventName: z.string().min(1).max(200),
  /** Event description (max 2000 characters) */
  eventDescription: z.string().max(2000).optional(),
  /** Event date/time as Unix timestamp in milliseconds (required, must be in future) */
  eventDateTime: z.number().positive(),
  /** Duration in hours (required, 1-24) */
  durationHours: z.number().min(1).max(24),
  /** Event location (1-500 characters, required) */
  eventLocation: z.string().min(1).max(500),
  /** Event city (max 100 characters) */
  eventCity: z.string().max(100).optional(),
  /** Expected number of guests (1-10000) */
  guestCount: z.number().int().min(1).max(10000).optional(),
  /** Selected add-on names */
  selectedAddOns: z.array(z.string()).optional(),
  /** Special requests (max 2000 characters) */
  specialRequests: z.string().max(2000).optional(),
});

/**
 * Schema for booking message sending.
 */
export const bookingMessageSchema = z.object({
  /** ID of the conversation (required) */
  conversationId: z.string(),
  /** Message content (1-5000 characters, required) */
  content: z.string().min(1).max(5000),
});

/**
 * Schema for availability slot creation.
 */
export const availabilitySlotSchema = z.object({
  /** Start date/time as Unix timestamp in milliseconds (required) */
  startDateTime: z.number().positive(),
  /** End date/time as Unix timestamp in milliseconds (required) */
  endDateTime: z.number().positive(),
  /** Notes (max 500 characters) */
  notes: z.string().max(500).optional(),
});

/**
 * Schema for marketplace search filters.
 */
export const marketplaceSearchSchema = z.object({
  /** Filter by event type */
  eventType: marketplaceEventTypeSchema.optional(),
  /** Filter by band genre */
  genre: genreSchema.optional(),
  /** Filter by location (partial match) */
  location: z.string().max(100).optional(),
  /** Minimum hourly rate in cents */
  minPrice: z.number().int().min(0).optional(),
  /** Maximum hourly rate in cents */
  maxPrice: z.number().int().positive().optional(),
  /** Maximum results */
  limit: z.number().int().min(1).max(100).optional(),
});

// ============================================================================
// MARKETPLACE INFERRED TYPES
// ============================================================================

/**
 * Inferred type for valid marketplace event type values.
 */
export type MarketplaceEventTypeInput = z.infer<typeof marketplaceEventTypeSchema>;

/**
 * Inferred type for valid booking status values.
 */
export type BookingStatusInput = z.infer<typeof bookingStatusSchema>;

/**
 * Inferred type for valid listing status values.
 */
export type ListingStatusInput = z.infer<typeof listingStatusSchema>;

/**
 * Inferred type for listing creation payloads.
 */
export type ListingCreateInput = z.infer<typeof listingCreateSchema>;

/**
 * Inferred type for listing update payloads.
 */
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;

/**
 * Inferred type for booking request payloads.
 */
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

/**
 * Inferred type for booking message payloads.
 */
export type BookingMessageInput = z.infer<typeof bookingMessageSchema>;

/**
 * Inferred type for availability slot payloads.
 */
export type AvailabilitySlotInput = z.infer<typeof availabilitySlotSchema>;

/**
 * Inferred type for marketplace search payloads.
 */
export type MarketplaceSearchInput = z.infer<typeof marketplaceSearchSchema>;
