/**
 * @fileoverview Convex queries and mutations for band management.
 * Handles band profiles, statistics, and fan following functionality.
 * @module convex/bands
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  requireAuthenticatedUser,
  requireBandMember,
  requireBandRole,
} from "./utils/permissions";

/** Validator for music genre field */
const genreValidator = v.union(
  v.literal("indie"),
  v.literal("rock"),
  v.literal("jazz"),
  v.literal("electronic"),
  v.literal("folk"),
  v.literal("pop"),
  v.literal("alternative")
);

/** Validator for social media links */
const socialLinksValidator = v.object({
  spotify: v.optional(v.string()),
  appleMusic: v.optional(v.string()),
  instagram: v.optional(v.string()),
  tiktok: v.optional(v.string()),
  youtube: v.optional(v.string()),
  website: v.optional(v.string()),
});

/**
 * Gets a band by its Convex document ID.
 *
 * @param bandId - The Convex ID of the band
 * @returns The band document if found, null otherwise
 *
 * @example
 * const band = useQuery(api.bands.getById, { bandId: "k9x..." });
 */
export const getById = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.bandId);
  },
});

/**
 * Returns public band header data plus viewer-specific follow/membership state.
 * Requires authentication (route is app-scoped).
 */
export const getPublicBandProfile = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const band = await ctx.db.get(args.bandId);
    if (!band) {
      return null;
    }

    const [followers, savedEntry, membership] = await Promise.all([
      ctx.db
        .query("savedArtists")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .collect(),
      ctx.db
        .query("savedArtists")
        .withIndex("by_user_band", (q) =>
          q.eq("userId", user._id).eq("bandId", args.bandId)
        )
        .unique(),
      ctx.db
        .query("bandMemberships")
        .withIndex("by_band_user", (q) =>
          q.eq("bandId", args.bandId).eq("userId", user._id)
        )
        .unique(),
    ]);

    return {
      band,
      followerCount: followers.length,
      isFollowing: Boolean(savedEntry),
      viewerMembershipRole: membership?.role,
    };
  },
});

/**
 * Legacy compatibility query returning the first band found for the user.
 * Prefer `listMyBands` in new web flows.
 *
 * @returns The band document if found, null otherwise
 *
 * @example
 * const band = useQuery(api.bands.getCurrentUserBand);
 * if (band) {
 *   console.log(`Your band: ${band.name}`);
 * }
 */
export const getCurrentUserBand = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // Legacy fallback + compatibility helper:
    // prefer membership-based access, then fall back to legacy single-owner link.
    const membership = await ctx.db
      .query("bandMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (membership) {
      return await ctx.db.get(membership.bandId);
    }

    return await ctx.db
      .query("bands")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

/**
 * Lists all bands the current user belongs to with membership metadata.
 * This is the primary source for profile context switcher options.
 */
export const listMyBands = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const memberships = await ctx.db
      .query("bandMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const membershipsWithBand = await Promise.all(
      memberships.map(async (membership) => {
        const band = await ctx.db.get(membership.bandId);
        if (!band) {
          return null;
        }
        return {
          membership,
          band,
        };
      })
    );

    return membershipsWithBand
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => a.band.name.localeCompare(b.band.name));
  },
});

/**
 * Gets the specified band with aggregated statistics for the dashboard.
 * Includes shows this month, total RSVPs, and follower count.
 * Returns null if user is not authenticated, not a musician, or has no band.
 *
 * @returns Band document with stats property, or null
 *
 * @example
 * const bandWithStats = useQuery(api.bands.getBandWithStats, { bandId: "k9x..." });
 * if (bandWithStats) {
 *   console.log(`Total RSVPs: ${bandWithStats.stats.totalRsvps}`);
 * }
 */
export const getBandWithStats = query({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    await requireBandMember(ctx, args.bandId);

    const band = await ctx.db.get(args.bandId);

    if (!band) {
      return null;
    }

    // Get events for this band
    const events = await ctx.db
      .query("events")
      .withIndex("by_band", (q) => q.eq("bandId", band._id))
      .collect();

    // Calculate stats
    const now = Date.now();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();

    const showsThisMonth = events.filter(
      (e) => e.dateTime >= monthStartMs && e.dateTime <= now
    ).length;

    const totalRsvps = events.reduce((sum, e) => sum + e.rsvpCount, 0);

    // Get followers (fans who saved this band)
    const followers = await ctx.db
      .query("savedArtists")
      .withIndex("by_band", (q) => q.eq("bandId", band._id))
      .collect();

    return {
      ...band,
      stats: {
        showsThisMonth,
        totalRsvps,
        newFans: followers.length,
      },
    };
  },
});

/**
 * Creates a new band profile for the authenticated user.
 * User may create multiple bands; ownership is represented through memberships.
 * Requires authentication.
 *
 * @param name - Band name (1-100 characters)
 * @param genres - Array of music genres (1-5)
 * @param location - Band's home location
 * @param image - Optional profile image URL
 * @param bio - Optional biography (max 1000 characters)
 * @param memberCount - Optional number of members (1-50)
 * @param socialLinks - Optional social media links
 * @returns The new band's Convex document ID
 * @throws Error if not authenticated, user not found, or user already has a band
 *
 * @example
 * const createBand = useMutation(api.bands.create);
 * const bandId = await createBand({
 *   name: "The Local Heroes",
 *   genres: ["rock", "indie"],
 *   location: "Oakland, CA"
 * });
 */
export const create = mutation({
  args: {
    name: v.string(),
    genres: v.array(genreValidator),
    location: v.string(),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
    memberCount: v.optional(v.number()),
    socialLinks: v.optional(socialLinksValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const now = Date.now();

    const bandId = await ctx.db.insert("bands", {
      userId: user._id,
      ...args,
      createdAt: now,
    });

    await ctx.db.insert("bandMemberships", {
      bandId,
      userId: user._id,
      role: "owner",
      joinedAt: now,
    });

    return bandId;
  },
});

/**
 * Updates an existing band's profile information.
 * Owners and admins can update. All fields are optional for partial updates.
 * Requires authentication.
 *
 * @param bandId - The Convex ID of the band to update
 * @param name - Optional new band name
 * @param genres - Optional new genres array
 * @param location - Optional new location
 * @param image - Optional new profile image URL
 * @param bio - Optional new biography
 * @param memberCount - Optional new member count
 * @param socialLinks - Optional new social links
 * @returns The band's Convex document ID
 * @throws Error if not authenticated, user not found, or not authorized
 *
 * @example
 * const updateBand = useMutation(api.bands.update);
 * await updateBand({
 *   bandId: "k9x...",
 *   bio: "We play indie rock in the Bay Area"
 * });
 */
export const update = mutation({
  args: {
    bandId: v.id("bands"),
    name: v.optional(v.string()),
    genres: v.optional(v.array(genreValidator)),
    location: v.optional(v.string()),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
    memberCount: v.optional(v.number()),
    socialLinks: v.optional(socialLinksValidator),
  },
  handler: async (ctx, args) => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const { bandId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(args.bandId, filteredUpdates);

    return args.bandId;
  },
});

/**
 * Lists bands with optional genre filtering.
 * Used for band discovery features.
 *
 * @param genre - Optional genre to filter by
 * @param limit - Optional maximum number of results (default: 50)
 * @returns Array of band documents
 *
 * @example
 * // Get all bands
 * const bands = useQuery(api.bands.list, {});
 *
 * // Get rock bands only
 * const rockBands = useQuery(api.bands.list, { genre: "rock" });
 */
export const list = query({
  args: {
    genre: v.optional(genreValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.genre) {
      // Filter bands that include the requested genre in their genres array
      // Note: We need to filter in memory because genres is an array
      const allBands = await ctx.db.query("bands").collect();
      return allBands
        .filter((band) => band.genres && band.genres.includes(args.genre!))
        .slice(0, limit);
    }

    return await ctx.db.query("bands").take(limit);
  },
});

/**
 * Searches bands by name or location.
 * Case-insensitive partial matching.
 *
 * @param query - Search text to match against name or location
 * @param limit - Optional maximum number of results (default: 20)
 * @returns Array of matching band documents
 *
 * @example
 * const results = useQuery(api.bands.search, { query: "oakland" });
 */
export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase();
    const limit = args.limit || 20;

    const bands = await ctx.db.query("bands").take(100);

    return bands
      .filter(
        (band) =>
          band.name.toLowerCase().includes(searchQuery) ||
          band.location.toLowerCase().includes(searchQuery)
      )
      .slice(0, limit);
  },
});

/**
 * Toggles the saved/followed status of a band for the current user.
 * If already saved, removes the save. If not saved, adds it.
 * Requires authentication.
 *
 * @param bandId - The Convex ID of the band to save/unsave
 * @returns Object indicating the action taken ("saved" or "unsaved")
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const toggleSave = useMutation(api.bands.toggleSave);
 * const { action } = await toggleSave({ bandId: "k9x..." });
 * console.log(`Band ${action}`); // "Band saved" or "Band unsaved"
 */
export const toggleSave = mutation({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const existing = await ctx.db
      .query("savedArtists")
      .withIndex("by_user_band", (q) =>
        q.eq("userId", user._id).eq("bandId", args.bandId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { action: "unsaved" };
    }

    await ctx.db.insert("savedArtists", {
      userId: user._id,
      bandId: args.bandId,
      createdAt: Date.now(),
    });

    return { action: "saved" };
  },
});

/**
 * Gets all bands saved by the current user.
 * Returns empty array if not authenticated or user not found.
 *
 * @returns Array of saved band documents
 *
 * @example
 * const savedBands = useQuery(api.bands.getSavedBands);
 * console.log(`Following ${savedBands.length} bands`);
 */
export const getSavedBands = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const saved = await ctx.db
      .query("savedArtists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const bands = await Promise.all(
      saved.map(async (s) => {
        const band = await ctx.db.get(s.bandId);
        return band;
      })
    );

    return bands.filter((b) => b !== null);
  },
});

/**
 * Gets analytics data for a band's dashboard charts.
 * Includes total RSVPs, event count, event comparison data, and traffic breakdown.
 * Requires authentication.
 *
 * @param bandId - The Convex ID of the band
 * @returns Analytics data object with chart-ready data
 * @throws Error if not authenticated or band not found
 *
 * @example
 * const analytics = useQuery(api.bands.getAnalytics, { bandId: "k9x..." });
 * if (analytics) {
 *   // Use analytics.eventComparison for bar chart
 *   // Use analytics.trafficData for pie chart
 * }
 */
export const getAnalytics = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    await requireBandMember(ctx, args.bandId);

    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    // Get all events for this band
    const events = await ctx.db
      .query("events")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();

    // Get past events sorted by date (most recent first)
    const now = Date.now();
    const pastEvents = events
      .filter((e) => e.dateTime < now)
      .sort((a, b) => b.dateTime - a.dateTime)
      .slice(0, 8);

    // Prepare chart data
    const eventComparison = await Promise.all(
      pastEvents.reverse().map(async (event) => {
        const venue = await ctx.db.get(event.venueId);
        return {
          name: new Date(event.dateTime).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          rsvps: event.rsvpCount,
          venueName: venue?.name || "Unknown Venue",
        };
      })
    );

    // Calculate traffic rate (simplified)
    const totalRsvps = events.reduce((sum, e) => sum + e.rsvpCount, 0);
    const avgCapacity =
      events.length > 0
        ? events.reduce((sum, e) => sum + e.capacity, 0) / events.length
        : 0;

    const newTrafficRate = avgCapacity > 0 ? (totalRsvps / avgCapacity) * 100 : 0;

    return {
      totalRsvps,
      eventCount: events.length,
      eventComparison,
      trafficData: [
        { name: "Returning", value: Math.round(newTrafficRate * 0.6) },
        { name: "New", value: Math.round(newTrafficRate * 0.4) },
      ],
    };
  },
});
