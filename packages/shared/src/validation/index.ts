import { z } from "zod";

// Genre schema
export const genreSchema = z.enum([
  "indie",
  "rock",
  "jazz",
  "electronic",
  "folk",
  "pop",
  "alternative",
]);

// User role schema
export const userRoleSchema = z.enum(["fan", "musician"]);

// Event status schema
export const eventStatusSchema = z.enum(["confirmed", "hold", "available"]);

// Open date status schema
export const openDateStatusSchema = z.enum(["open", "pending", "filled"]);

// Application status schema
export const applicationStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
]);

// Notification type schema
export const notificationTypeSchema = z.enum([
  "event_reminder",
  "lineup_change",
  "new_event_followed_artist",
  "new_event_nearby",
  "application_update",
  "message",
]);

// Coordinates schema
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Social links schema
export const socialLinksSchema = z.object({
  spotify: z.string().url().optional(),
  appleMusic: z.string().url().optional(),
  instagram: z.string().url().optional(),
  tiktok: z.string().url().optional(),
  youtube: z.string().url().optional(),
  website: z.string().url().optional(),
});

// User profile update schema
export const userProfileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  location: z.string().max(200).optional(),
  avatar: z.string().url().optional(),
  topGenres: z.array(genreSchema).max(5).optional(),
});

// Band creation schema
export const bandCreateSchema = z.object({
  name: z.string().min(1).max(100),
  genres: z.array(genreSchema).min(1).max(5),
  location: z.string().min(1).max(200),
  image: z.string().url().optional(),
  bio: z.string().max(1000).optional(),
  memberCount: z.number().int().min(1).max(50).optional(),
  socialLinks: socialLinksSchema.optional(),
});

// Band update schema
export const bandUpdateSchema = bandCreateSchema.partial();

// Event creation schema
export const eventCreateSchema = z.object({
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

// Message send schema
export const messageSendSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1).max(5000),
});

// Search schema
export const searchSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(100).optional(),
});

// Map filter schema
export const mapFilterSchema = z.object({
  genre: genreSchema.optional(),
  radiusMiles: z.number().min(1).max(50).optional(),
  searchQuery: z.string().max(200).optional(),
});

// Application schema
export const applicationCreateSchema = z.object({
  openDateId: z.string(),
  bandId: z.string(),
  message: z.string().max(1000).optional(),
});

// Infer types from schemas
export type GenreInput = z.infer<typeof genreSchema>;
export type UserRoleInput = z.infer<typeof userRoleSchema>;
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;
export type BandCreateInput = z.infer<typeof bandCreateSchema>;
export type BandUpdateInput = z.infer<typeof bandUpdateSchema>;
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type MessageSendInput = z.infer<typeof messageSendSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type MapFilterInput = z.infer<typeof mapFilterSchema>;
export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;
