/**
 * @fileoverview Convex queries and mutations for user management.
 * Handles user authentication, profile updates, and role management.
 * @module convex/users
 */

import { v } from "convex/values";
import {
  action,
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { normalizeInvitePhone } from "./utils/phone";
import {
  getAuthenticatedUserOrNull,
  requireAuthenticatedUser,
} from "./utils/permissions";

const GENRE_VALUES = [
  "indie",
  "rock",
  "jazz",
  "electronic",
  "folk",
  "pop",
  "alternative",
] as const;
type GenreValue = (typeof GENRE_VALUES)[number];

const GIG_DNA_NOUN_BY_GENRE: Record<GenreValue, string> = {
  indie: "Explorer",
  rock: "Amplifier",
  jazz: "Night Owl",
  electronic: "Pulse Chaser",
  folk: "Campfire Soul",
  pop: "Hook Hunter",
  alternative: "Scene Diver",
};

const MOST_VIEWED_SAVED_ARTISTS_LIMIT = 12;
const SAVED_ARTISTS_LIMIT = 24;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const CLERK_USERS_API_BASE = "https://api.clerk.com/v1/users";

function isGenreValue(value: string): value is GenreValue {
  return (GENRE_VALUES as readonly string[]).includes(value);
}

function getEventGenres(
  event: Pick<Doc<"events">, "genres" | "genre">
): GenreValue[] {
  if (event.genres && event.genres.length > 0) {
    return event.genres.filter((genre): genre is GenreValue => isGenreValue(genre));
  }
  if (event.genre && isGenreValue(event.genre)) {
    return [event.genre];
  }
  return [];
}

function capitalizeGenre(genre: GenreValue): string {
  return genre.charAt(0).toUpperCase() + genre.slice(1);
}

function getGigDnaTier(attendedShows: number): "Headliner" | "Regular" | "Rising" | "Rookie" {
  if (attendedShows >= 20) return "Headliner";
  if (attendedShows >= 10) return "Regular";
  if (attendedShows >= 3) return "Rising";
  return "Rookie";
}

function normalizeStoredEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function getClerkErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as
      | { errors?: Array<{ message?: string }> }
      | { message?: string };

    if ("errors" in payload && Array.isArray(payload.errors)) {
      const firstMessage = payload.errors.find(
        (error) => typeof error.message === "string" && error.message.length > 0
      )?.message;
      if (firstMessage) {
        return firstMessage;
      }
    }

    if ("message" in payload && typeof payload.message === "string") {
      return payload.message;
    }
  } catch {
    // Ignore non-JSON error responses.
  }

  return `Clerk request failed with status ${response.status}.`;
}

/**
 * Gets the currently authenticated user from the database.
 * Uses Clerk authentication identity to look up the user by their Clerk ID.
 *
 * @returns The user document if authenticated and found, null otherwise
 *
 * @example
 * // In a React component
 * const user = useQuery(api.users.getCurrentUser);
 * if (user) {
 *   console.log(`Welcome, ${user.name}!`);
 * }
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthenticatedUserOrNull(ctx);
  },
});

/**
 * Gets a user by their Convex document ID.
 *
 * @param userId - The Convex ID of the user to retrieve
 * @returns The user document if found, null otherwise
 *
 * @example
 * const user = useQuery(api.users.getById, { userId: "k9x..." });
 */
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    // Strip PII — return only public fields
    const { email, phoneNumber, clerkId, ...publicFields } = user;
    return publicFields;
  },
});

/**
 * Gets a user by their Clerk authentication ID.
 * Useful for looking up users from Clerk webhook events.
 *
 * @param clerkId - The Clerk user ID (subject from JWT)
 * @returns The user document if found, null otherwise
 *
 * @example
 * const user = useQuery(api.users.getByClerkId, { clerkId: "user_abc123" });
 */
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return null;
    // Strip PII — return only public fields
    const { email, phoneNumber, clerkId: _clerkId, ...publicFields } = user;
    return publicFields;
  },
});

/**
 * Returns a fan's public profile payload for authenticated viewers.
 * The response excludes private identity fields (email/phone/clerkId).
 */
export const getPublicFanProfile = query({
  args: { fanId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const fan = await ctx.db.get(args.fanId);
    if (!fan || fan.role !== "fan") {
      return null;
    }

    const now = Date.now();
    const [rsvps, savedArtists, engagements] = await Promise.all([
      ctx.db
        .query("rsvps")
        .withIndex("by_user", (q) => q.eq("userId", fan._id))
        .collect(),
      ctx.db
        .query("savedArtists")
        .withIndex("by_user", (q) => q.eq("userId", fan._id))
        .collect(),
      ctx.db
        .query("bandProfileEngagements")
        .withIndex("by_user", (q) => q.eq("userId", fan._id))
        .collect(),
    ]);

    const attendedRsvps = rsvps.filter(
      (rsvp) => rsvp.attendanceStatus === "attended"
    );

    const attendedEventRecords = await Promise.all(
      attendedRsvps.map(async (rsvp) => {
        const event = await ctx.db.get(rsvp.eventId);
        if (!event) return null;

        const eventDateTime = event.dateTime;
        if (typeof eventDateTime !== "number" || !Number.isFinite(eventDateTime)) {
          return null;
        }

        return {
          rsvp,
          event,
          eventDateTime,
        };
      })
    );

    const validAttendedEvents = attendedEventRecords.filter(
      (
        record
      ): record is NonNullable<typeof record> => record !== null
    );

    const genreCounts = new Map<GenreValue, number>();
    for (const { event } of validAttendedEvents) {
      const genres = getEventGenres(event);
      for (const genre of genres) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
      }
    }

    const topGenres = Array.from(genreCounts.entries())
      .map(([genre, attendedCount]) => ({
        genre,
        label: capitalizeGenre(genre),
        attendedCount,
      }))
      .sort((a, b) => b.attendedCount - a.attendedCount);

    const savedArtistsWithBand = (
      await Promise.all(
        savedArtists.map(async (entry) => {
          const band = await ctx.db.get(entry.bandId);
          if (!band) return null;
          return {
            bandId: band._id,
            name: band.name,
            image: band.image,
            location: band.location,
            genres: band.genres && band.genres.length > 0
              ? band.genres
              : band.genre
                ? [band.genre]
                : [],
            savedAt: entry.createdAt,
          };
        })
      )
    )
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(0, SAVED_ARTISTS_LIMIT);

    const engagementByBandId = new Map<Id<"bands">, { viewCount: number }>();
    for (const engagement of engagements) {
      engagementByBandId.set(engagement.bandId, {
        viewCount: engagement.viewCount,
      });
    }

    const savedArtistsByBandId = new Map<
      Id<"bands">,
      {
        savedAt: number;
      }
    >();
    for (const savedArtist of savedArtists) {
      savedArtistsByBandId.set(savedArtist.bandId, {
        savedAt: savedArtist.createdAt,
      });
    }

    const rankedBandIds = new Set<Id<"bands">>([
      ...engagementByBandId.keys(),
      ...savedArtistsByBandId.keys(),
    ]);

    const mostViewedSavedArtists = (
      await Promise.all(
        Array.from(rankedBandIds).map(async (bandId) => {
          const band = await ctx.db.get(bandId);
          if (!band) return null;

          const viewCount = engagementByBandId.get(bandId)?.viewCount ?? 0;
          const isSaved = savedArtistsByBandId.has(bandId);
          const score = viewCount + (isSaved ? 3 : 0);

          return {
            bandId,
            name: band.name,
            image: band.image,
            location: band.location,
            genres: band.genres && band.genres.length > 0
              ? band.genres
              : band.genre
                ? [band.genre]
                : [],
            isSaved,
            viewCount,
            score,
          };
        })
      )
    )
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
        return a.name.localeCompare(b.name);
      })
      .slice(0, MOST_VIEWED_SAVED_ARTISTS_LIMIT);

    const pastShowBaseRows = validAttendedEvents.filter(
      (record) => record.eventDateTime < now
    );
    const pastShows = (
      await Promise.all(
        pastShowBaseRows.map(async ({ rsvp, event, eventDateTime }) => {
          const venue = event.venueId ? await ctx.db.get(event.venueId) : null;
          const band = await ctx.db.get(event.bandId);

          return {
            eventId: event._id,
            title: event.title ?? "Untitled Gig",
            image: event.image,
            dateTime: eventDateTime,
            attendedAt: rsvp.attendedAt,
            venue: {
              venueId: venue?._id ?? null,
              name: venue?.name ?? "Unknown Venue",
              city: venue?.city ?? "Unknown City",
              address: venue?.address,
            },
            band: band
              ? {
                  bandId: band._id,
                  name: band.name,
                }
              : null,
          };
        })
      )
    )
      .sort((a, b) => b.dateTime - a.dateTime);

    const attendedShowsCount = pastShowBaseRows.length;
    const distinctVenueCount = new Set(
      pastShowBaseRows
        .map(({ event }) => event.venueId)
        .filter((venueId): venueId is Id<"venues"> => venueId !== undefined)
    ).size;
    const dominantGenre = topGenres[0]?.genre ?? null;
    const tier = getGigDnaTier(attendedShowsCount);
    const archetype = dominantGenre
      ? GIG_DNA_NOUN_BY_GENRE[dominantGenre]
      : "Listener";

    return {
      fan: {
        userId: fan._id,
        name: fan.name,
        avatar: fan.avatar,
        location: fan.location,
        memberSince: fan.memberSince,
        showsAttended: fan.showsAttended ?? 0,
      },
      topGenres,
      savedArtists: savedArtistsWithBand,
      mostViewedSavedArtists,
      pastShows,
      gigDna: {
        label: `${tier} ${archetype}`,
        tier,
        archetype,
        dominantGenre,
        attendedShows: attendedShowsCount,
        distinctVenues: distinctVenueCount,
      },
    };
  },
});

/**
 * Creates a new user or updates an existing user's basic info.
 * Called during sign-in to sync Clerk user data with Convex.
 * If the user doesn't exist, creates them with default "fan" role.
 *
 * @param clerkId - The Clerk user ID
 * @param email - User's email address
 * @param name - User's display name
 * @param avatar - Optional URL to user's avatar image
 * @returns The user's Convex document ID
 *
 * @example
 * await upsertUser({
 *   clerkId: "user_abc123",
 *   email: "user@example.com",
 *   name: "John Doe",
 *   avatar: "https://example.com/avatar.jpg"
 * });
 */
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    phoneNumber: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    if (identity.subject !== args.clerkId) {
      throw new Error("Not authorized to modify this user");
    }
    const normalizedEmail = normalizeStoredEmail(args.email);

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      const updates: {
        name: string;
        avatar?: string;
      } = {
        name: args.name,
      };

      if (args.avatar !== undefined) {
        updates.avatar = args.avatar;
      }

      await ctx.db.patch(existingUser._id, {
        ...updates,
      });
      return existingUser._id;
    }

    // Create new user with default role (will be updated during onboarding)
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: normalizedEmail,
      name: args.name,
      avatar: args.avatar,
      role: "fan", // Default role
      memberSince: Date.now(),
      showsAttended: 0,
    });

    return userId;
  },
});

/**
 * Updates the current user's role during onboarding.
 * Requires authentication. Used when user selects "fan" or "musician".
 *
 * @param role - The new role ("fan" or "musician")
 * @returns The user's Convex document ID
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const updateRole = useMutation(api.users.updateRole);
 * await updateRole({ role: "musician" });
 */
export const updateRole = mutation({
  args: {
    role: v.union(v.literal("fan"), v.literal("musician")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    // Web is fan-first. Keep this mutation for backward compatibility, but
    // clamp to "fan" so legacy clients cannot switch auth mode.
    void args;
    await ctx.db.patch(user._id, { role: "fan" });

    return user._id;
  },
});

/**
 * Updates the current user's profile information.
 * Requires authentication. All fields are optional for partial updates.
 *
 * @param name - Optional new display name
 * @param location - Optional location (city/area)
 * @param avatar - Optional avatar image URL
 * @param topGenres - Optional array of preferred genres (max 5)
 * @returns The user's Convex document ID
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const updateProfile = useMutation(api.users.updateProfile);
 * await updateProfile({
 *   name: "Jane Doe",
 *   location: "Oakland, CA",
 *   topGenres: ["rock", "indie"]
 * });
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    avatar: v.optional(v.string()),
    topGenres: v.optional(
      v.array(
        v.union(
          v.literal("indie"),
          v.literal("rock"),
          v.literal("jazz"),
          v.literal("electronic"),
          v.literal("folk"),
          v.literal("pop"),
          v.literal("alternative")
        )
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const updates: Partial<typeof args> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.location !== undefined) updates.location = args.location;
    if (args.avatar !== undefined) updates.avatar = args.avatar;
    if (args.topGenres !== undefined) updates.topGenres = args.topGenres;

    await ctx.db.patch(user._id, updates);

    return user._id;
  },
});

/**
 * Updates the authenticated user's personal name in Clerk through the Backend API.
 * This bypasses Frontend API restrictions that depend on enabled dashboard fields.
 */
export const updateClerkPersonalName = action({
  args: {
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const secret = process.env.CLERK_SECRET_KEY;
    if (!secret) {
      throw new Error(
        "CLERK_SECRET_KEY is required in Convex environment to update Clerk names."
      );
    }

    const response = await fetch(
      `${CLERK_USERS_API_BASE}/${encodeURIComponent(identity.subject)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: args.firstName,
          last_name: args.lastName,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(await getClerkErrorMessage(response));
    }

    return { clerkId: identity.subject };
  },
});

/**
 * Generates a short-lived Convex upload URL for user avatar uploads.
 */
export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return { uploadUrl };
  },
});

/**
 * Commits a previously uploaded storage object as the current user's avatar.
 * Enforces image MIME/type limits and replaces any prior avatar storage object.
 */
export const setAvatarFromStorage = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const metadata = await ctx.storage.getMetadata(args.storageId);
    if (!metadata) {
      throw new Error("Uploaded avatar file not found.");
    }

    const mimeType = metadata.contentType ?? "";
    if (!IMAGE_MIME_TYPES.has(mimeType)) {
      throw new Error("Unsupported image format. Use JPEG, PNG, or WEBP.");
    }
    if (metadata.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error("Image file exceeds the 10 MB size limit.");
    }

    const avatarUrl = await ctx.storage.getUrl(args.storageId);
    if (!avatarUrl) {
      throw new Error("Unable to resolve avatar URL from storage.");
    }

    const previousStorageId = user.avatarStorageId;
    await ctx.db.patch(user._id, {
      avatar: avatarUrl,
      avatarStorageId: args.storageId,
    });

    if (previousStorageId && previousStorageId !== args.storageId) {
      try {
        await ctx.storage.delete(previousStorageId);
      } catch {
        // Storage object may already be missing.
      }
    }

    return user._id;
  },
});

/**
 * Clears the current user's avatar and deletes the linked storage object if present.
 */
export const clearAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthenticatedUser(ctx);
    const previousStorageId = user.avatarStorageId;

    await ctx.db.patch(user._id, {
      avatar: undefined,
      avatarStorageId: undefined,
    });

    if (previousStorageId) {
      try {
        await ctx.storage.delete(previousStorageId);
      } catch {
        // Storage object may already be missing.
      }
    }

    return user._id;
  },
});

/**
 * Increments the current user's shows attended counter.
 * Called when a user attends an event they RSVP'd to.
 * Requires authentication.
 *
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const incrementShows = useMutation(api.users.incrementShowsAttended);
 * await incrementShows();
 */
export const incrementShowsAttended = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      showsAttended: (user.showsAttended || 0) + 1,
    });
  },
});

/**
 * Internal mutation to create a user from Clerk webhook.
 * Not callable from client - only from other Convex functions.
 * Creates user if they don't exist, returns existing ID if they do.
 *
 * @param clerkId - The Clerk user ID
 * @param email - User's email address
 * @param name - User's display name
 * @param avatar - Optional avatar image URL
 * @returns The user's Convex document ID
 *
 * @internal
 */
export const createUserFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    phoneNumber: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeStoredEmail(args.email);
    const normalizedPhone =
      args.phoneNumber && args.phoneNumber.trim().length > 0
        ? normalizeInvitePhone(args.phoneNumber)
        : null;

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      const updates: {
        email?: string;
        name: string;
        avatar?: string;
        phoneNumber?: string;
      } = {
        name: args.name,
      };

      if (args.email.trim().length > 0) {
        updates.email = normalizedEmail;
      }
      if (args.avatar !== undefined) {
        updates.avatar = args.avatar;
      }
      if (normalizedPhone?.ok) {
        updates.phoneNumber = normalizedPhone.e164;
      }

      await ctx.db.patch(existingUser._id, updates);
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: normalizedEmail,
      phoneNumber: normalizedPhone?.ok ? normalizedPhone.e164 : undefined,
      name: args.name,
      avatar: args.avatar,
      role: "fan",
      memberSince: Date.now(),
      showsAttended: 0,
    });
  },
});

export const setUserPhoneNumber = internalMutation({
  args: {
    userId: v.id("users"),
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      phoneNumber: args.phoneNumber,
    });
    return args.userId;
  },
});

export const getUsersForPhoneBackfillPage = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const page = await ctx.db.query("users").order("asc").paginate({
      cursor: args.cursor ?? null,
      numItems: limit,
    });

    return {
      users: page.page.map((user) => ({
        _id: user._id,
        clerkId: user.clerkId,
        phoneNumber: user.phoneNumber,
      })),
      nextCursor: page.continueCursor ?? undefined,
      done: page.isDone,
    };
  },
});
