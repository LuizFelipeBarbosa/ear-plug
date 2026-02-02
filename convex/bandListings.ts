/**
 * @fileoverview Convex queries and mutations for band marketplace listings.
 * Handles listing creation, updates, and search for fans discovering bands.
 * @module convex/bandListings
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/** Validator for marketplace event types */
const marketplaceEventTypeValidator = v.union(
  v.literal("wedding"),
  v.literal("corporate"),
  v.literal("private_party"),
  v.literal("public_gig"),
  v.literal("festival"),
  v.literal("other")
);

/** Validator for listing status */
const listingStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("archived")
);

/**
 * Creates a new band listing for the marketplace.
 * Only musicians who own a band can create listings.
 * Each band can only have one active listing at a time.
 *
 * @param bandId - The ID of the band to create a listing for
 * @param title - Listing headline
 * @param description - Detailed description of services
 * @param eventTypes - Array of supported event types
 * @param baseHourlyRate - Base rate in cents per hour
 * @param minimumHours - Minimum booking duration
 * @param depositPercentage - Required deposit percentage (0-100)
 * @param addOns - Optional array of add-on services
 * @param maxTravelDistance - Maximum travel distance in miles
 * @param bookingNotes - Additional booking requirements
 * @param cancellationPolicy - Cancellation policy text
 * @param status - Listing status (default: draft)
 * @returns The new listing's Convex document ID
 * @throws Error if not authenticated, band not found, or user doesn't own the band
 */
export const create = mutation({
  args: {
    bandId: v.id("bands"),
    title: v.string(),
    description: v.optional(v.string()),
    eventTypes: v.array(marketplaceEventTypeValidator),
    baseHourlyRate: v.number(),
    minimumHours: v.number(),
    depositPercentage: v.number(),
    addOns: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.optional(v.string()),
          priceInCents: v.number(),
        })
      )
    ),
    maxTravelDistance: v.optional(v.number()),
    bookingNotes: v.optional(v.string()),
    cancellationPolicy: v.optional(v.string()),
    status: v.optional(listingStatusValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the band and verify ownership
    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    if (band.userId !== user._id) {
      throw new Error("You don't own this band");
    }

    // Check if band already has an active/paused listing
    const existingListing = await ctx.db
      .query("bandListings")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "paused"),
          q.eq(q.field("status"), "draft")
        )
      )
      .first();

    if (existingListing) {
      throw new Error("Band already has an active listing. Please update or archive it first.");
    }

    const now = Date.now();

    return await ctx.db.insert("bandListings", {
      bandId: args.bandId,
      title: args.title,
      description: args.description,
      eventTypes: args.eventTypes,
      baseHourlyRate: args.baseHourlyRate,
      minimumHours: args.minimumHours,
      depositPercentage: args.depositPercentage,
      addOns: args.addOns,
      maxTravelDistance: args.maxTravelDistance,
      bookingNotes: args.bookingNotes,
      cancellationPolicy: args.cancellationPolicy,
      status: args.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Updates an existing band listing.
 * Only the band owner can update their listing.
 *
 * @param listingId - The ID of the listing to update
 * @param title - New listing headline
 * @param description - New description
 * @param eventTypes - New array of supported event types
 * @param baseHourlyRate - New base rate in cents
 * @param minimumHours - New minimum booking duration
 * @param depositPercentage - New deposit percentage
 * @param addOns - New add-on services
 * @param maxTravelDistance - New max travel distance
 * @param bookingNotes - New booking notes
 * @param cancellationPolicy - New cancellation policy
 * @param status - New listing status
 * @throws Error if not authenticated, listing not found, or user doesn't own the band
 */
export const update = mutation({
  args: {
    listingId: v.id("bandListings"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    eventTypes: v.optional(v.array(marketplaceEventTypeValidator)),
    baseHourlyRate: v.optional(v.number()),
    minimumHours: v.optional(v.number()),
    depositPercentage: v.optional(v.number()),
    addOns: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.optional(v.string()),
          priceInCents: v.number(),
        })
      )
    ),
    maxTravelDistance: v.optional(v.number()),
    bookingNotes: v.optional(v.string()),
    cancellationPolicy: v.optional(v.string()),
    status: v.optional(listingStatusValidator),
  },
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

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    const band = await ctx.db.get(listing.bandId);
    if (!band || band.userId !== user._id) {
      throw new Error("You don't own this listing");
    }

    const { listingId, ...updates } = args;

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(cleanUpdates).length === 0) {
      return;
    }

    await ctx.db.patch(listingId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Gets the current user's band listing.
 * Returns the listing for the band owned by the authenticated user.
 *
 * @returns The listing document with band data, or null if none exists
 */
export const getByCurrentUser = query({
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

    // Get the user's band
    const band = await ctx.db
      .query("bands")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!band) {
      return null;
    }

    // Get the band's listing (excluding archived)
    const listing = await ctx.db
      .query("bandListings")
      .withIndex("by_band", (q) => q.eq("bandId", band._id))
      .filter((q) => q.neq(q.field("status"), "archived"))
      .first();

    if (!listing) {
      return null;
    }

    return {
      ...listing,
      band,
    };
  },
});

/**
 * Gets a band listing by band ID.
 * Only returns active listings for public viewing.
 *
 * @param bandId - The ID of the band
 * @returns The listing document with band data, or null if not found/not active
 */
export const getByBand = query({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const band = await ctx.db.get(args.bandId);
    if (!band) {
      return null;
    }

    // Get active listing only for public viewing
    const listing = await ctx.db
      .query("bandListings")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!listing) {
      return null;
    }

    return {
      ...listing,
      band,
    };
  },
});

/**
 * Gets a listing by its ID.
 * Returns full listing details with band info.
 *
 * @param listingId - The ID of the listing
 * @returns The listing document with band data, or null if not found
 */
export const getById = query({
  args: {
    listingId: v.id("bandListings"),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      return null;
    }

    const band = await ctx.db.get(listing.bandId);
    if (!band) {
      return null;
    }

    return {
      ...listing,
      band,
    };
  },
});

/**
 * Searches for active band listings.
 * Supports filtering by event type, genre, location, and price range.
 *
 * @param eventType - Filter by event type
 * @param genre - Filter by band genre
 * @param location - Filter by band location (partial match)
 * @param minPrice - Minimum hourly rate in cents
 * @param maxPrice - Maximum hourly rate in cents
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of listings with band data
 */
export const search = query({
  args: {
    eventType: v.optional(marketplaceEventTypeValidator),
    genre: v.optional(
      v.union(
        v.literal("indie"),
        v.literal("rock"),
        v.literal("jazz"),
        v.literal("electronic"),
        v.literal("folk"),
        v.literal("pop"),
        v.literal("alternative")
      )
    ),
    location: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get all active listings
    let listings = await ctx.db
      .query("bandListings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(100); // Get more than we need for filtering

    // Filter by event type
    if (args.eventType) {
      listings = listings.filter((listing) =>
        listing.eventTypes.includes(args.eventType!)
      );
    }

    // Filter by price range
    if (args.minPrice !== undefined) {
      listings = listings.filter(
        (listing) => listing.baseHourlyRate >= args.minPrice!
      );
    }
    if (args.maxPrice !== undefined) {
      listings = listings.filter(
        (listing) => listing.baseHourlyRate <= args.maxPrice!
      );
    }

    // Fetch band data and apply genre/location filters
    const listingsWithBands = await Promise.all(
      listings.map(async (listing) => {
        const band = await ctx.db.get(listing.bandId);
        if (!band) return null;

        // Filter by genre
        if (args.genre) {
          const bandGenres = band.genres ?? (band.genre ? [band.genre] : []);
          if (!bandGenres.includes(args.genre)) {
            return null;
          }
        }

        // Filter by location (partial match)
        if (args.location) {
          const searchLocation = args.location.toLowerCase();
          if (!band.location.toLowerCase().includes(searchLocation)) {
            return null;
          }
        }

        return {
          ...listing,
          band,
        };
      })
    );

    // Remove nulls and limit results
    return listingsWithBands
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, limit);
  },
});

/**
 * Archives a band listing.
 * Archived listings are hidden from search and cannot be booked.
 *
 * @param listingId - The ID of the listing to archive
 * @throws Error if not authenticated, listing not found, or user doesn't own the band
 */
export const archive = mutation({
  args: {
    listingId: v.id("bandListings"),
  },
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

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    const band = await ctx.db.get(listing.bandId);
    if (!band || band.userId !== user._id) {
      throw new Error("You don't own this listing");
    }

    await ctx.db.patch(args.listingId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to update listing status.
 * Used by system processes like pausing listings with conflicts.
 *
 * @param listingId - The ID of the listing
 * @param status - The new status
 * @internal
 */
export const updateStatus = internalMutation({
  args: {
    listingId: v.id("bandListings"),
    status: listingStatusValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.listingId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});
