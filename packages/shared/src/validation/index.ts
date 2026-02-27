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
 * Schema for profile context mode in web app.
 */
export const profileModeSchema = z.enum(["personal", "band"]);

/**
 * Schema for band workspace membership role.
 */
export const bandMemberRoleSchema = z.enum(["owner", "admin", "member"]);

/**
 * Schema for band invite status lifecycle.
 */
export const bandInviteStatusSchema = z.enum([
  "pending",
  "accepted",
  "declined",
  "revoked",
  "expired",
]);

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
  "booking_cancelled",
  "booking_message",
  "booking_accepted",
  "booking_request",
]);

/**
 * Schema for client-side profile context payload.
 */
export const profileContextSchema = z
  .object({
    mode: profileModeSchema,
    bandId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "band" && !value.bandId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "bandId is required when mode is 'band'",
        path: ["bandId"],
      });
    }
  });

/**
 * Schema for creating/updating an invite by phone number.
 */
export const bandInviteCreateSchema = z.object({
  bandId: z.string(),
  phoneNumber: z.string().min(7).max(30),
  role: z.enum(["admin", "member"]),
});

/**
 * Schema for invite response actions.
 */
export const bandInviteResponseSchema = z.object({
  inviteId: z.string(),
});

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
 * Schema for validating band post media type values.
 */
export const bandPostMediaTypeSchema = z.enum(["image", "video"]);

/**
 * Schema for fixed profile media slot index [0..5].
 */
export const bandMediaSlotIndexSchema = z.number().int().min(0).max(5);

/**
 * Schema for tiny optional slot caption.
 */
export const bandMediaSlotCaptionSchema = z.string().trim().max(120).optional();

/**
 * Schema for optional city-level slot location.
 */
export const bandMediaSlotLocationSchema = z.string().trim().max(200).optional();

/**
 * Schema for create/update profile media slot payloads.
 */
export const bandMediaSlotUpsertSchema = z.object({
  bandId: z.string(),
  slotIndex: bandMediaSlotIndexSchema,
  storageId: z.string(),
  mediaType: bandPostMediaTypeSchema,
  caption: bandMediaSlotCaptionSchema,
  location: bandMediaSlotLocationSchema,
  durationSeconds: z.number().positive().max(90).optional(),
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
 * Inferred type for profile mode.
 */
export type ProfileModeInput = z.infer<typeof profileModeSchema>;

/**
 * Inferred type for band membership role.
 */
export type BandMemberRoleInput = z.infer<typeof bandMemberRoleSchema>;

/**
 * Inferred type for band invite status.
 */
export type BandInviteStatusInput = z.infer<typeof bandInviteStatusSchema>;

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
 * Inferred type for band post media type.
 */
export type BandPostMediaTypeInput = z.infer<typeof bandPostMediaTypeSchema>;

/**
 * Inferred type for profile media slot upsert payloads.
 */
export type BandMediaSlotUpsertInput = z.infer<typeof bandMediaSlotUpsertSchema>;

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

/**
 * Inferred type for client profile context.
 */
export type ProfileContextInput = z.infer<typeof profileContextSchema>;

/**
 * Inferred type for invite create payload.
 */
export type BandInviteCreateInput = z.infer<typeof bandInviteCreateSchema>;

/**
 * Inferred type for invite response payload.
 */
export type BandInviteResponseInput = z.infer<typeof bandInviteResponseSchema>;
