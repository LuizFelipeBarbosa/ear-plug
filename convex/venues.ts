/**
 * @fileoverview Convex queries and mutations for venue management.
 * Handles venue listings, nearby search, open dates, and booking applications.
 * @module convex/venues
 */

import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { haversineDistance, coordinatesMatch, COORDINATE_TOLERANCE } from "./utils/geo";
import { requireBandMember, requireBandRole } from "./utils/permissions";

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

const OPEN_DATE_PENDING_APPLICATION_CAP = 25;

function toPublicVenue(venue: Doc<"venues">) {
  const { address, coordinates, ...publicVenue } = venue;
  return publicVenue;
}

/**
 * Gets a venue by its Convex document ID.
 *
 * @param venueId - The Convex ID of the venue
 * @returns The venue document if found, null otherwise
 *
 * @example
 * const venue = useQuery(api.venues.getById, { venueId: "k9x..." });
 */
export const getById = query({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    const venue = await ctx.db.get(args.venueId);
    if (!venue) {
      return null;
    }

    return toPublicVenue(venue);
  },
});

export const getByIdInternal = internalQuery({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.venueId);
  },
});

/**
 * Lists venues with optional city filtering.
 *
 * @param city - Optional city name to filter by
 * @param limit - Optional maximum number of results (default: 50)
 * @returns Array of venue documents
 *
 * @example
 * // Get all venues
 * const venues = useQuery(api.venues.list, {});
 *
 * // Get Oakland venues only
 * const oaklandVenues = useQuery(api.venues.list, { city: "Oakland" });
 */
export const list = query({
  args: {
    city: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.city) {
      const venues = await ctx.db
        .query("venues")
        .withIndex("by_city", (q) => q.eq("city", args.city!))
        .take(limit);
      return venues.map((venue) => toPublicVenue(venue));
    }

    const venues = await ctx.db.query("venues").take(limit);
    return venues.map((venue) => toPublicVenue(venue));
  },
});

/**
 * Gets suggested venues for a band, optionally prioritized by genre match.
 * Venues that host the specified genre are returned first.
 *
 * @param genre - Optional genre to prioritize matching venues
 * @param limit - Optional maximum number of results (default: 10)
 * @returns Array of venue documents, genre-matched first
 *
 * @example
 * const venues = useQuery(api.venues.getSuggested, { genre: "rock" });
 */
export const getSuggested = query({
  args: {
    genre: v.optional(genreValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const venues = await ctx.db.query("venues").take(50);

    if (args.genre) {
      // Prioritize venues that host this genre
      const genreMatches = venues.filter((v) => v.genres?.includes(args.genre!));
      const others = venues.filter((v) => !v.genres?.includes(args.genre!));
      return [...genreMatches, ...others]
        .slice(0, limit)
        .map((venue) => toPublicVenue(venue));
    }

    return venues.slice(0, limit).map((venue) => toPublicVenue(venue));
  },
});

/**
 * Searches venues by name, city, or address.
 * Case-insensitive partial matching.
 *
 * @param query - Search text to match
 * @param limit - Optional maximum number of results (default: 20)
 * @returns Array of matching venue documents
 *
 * @example
 * const results = useQuery(api.venues.search, { query: "berkeley" });
 */
export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase();
    const limit = args.limit || 20;

    const venues = await ctx.db.query("venues").take(100);

    return venues
      .filter(
        (venue) =>
          venue.name.toLowerCase().includes(searchQuery) ||
          venue.city.toLowerCase().includes(searchQuery) ||
          venue.address.toLowerCase().includes(searchQuery)
      )
      .slice(0, limit)
      .map((venue) => toPublicVenue(venue));
  },
});

/**
 * Gets venues within a specified radius of coordinates.
 * Uses Haversine formula for accurate distance calculation.
 * Returns venues sorted by distance from the specified point.
 *
 * @param lat - Latitude of the center point
 * @param lng - Longitude of the center point
 * @param radiusMiles - Optional search radius in miles (default: 25)
 * @returns Array of venue documents with distance property added
 *
 * @example
 * const nearbyVenues = useQuery(api.venues.getNearby, {
 *   lat: 37.8044,
 *   lng: -122.2712,
 *   radiusMiles: 10
 * });
 */
export const getNearby = query({
  args: {
    lat: v.number(),
    lng: v.number(),
    radiusMiles: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const radiusMiles = args.radiusMiles || 25;

    const venues = await ctx.db.query("venues").collect();

    // Calculate distance and filter
    const venuesWithDistance = venues.map((venue) => {
      const distance = haversineDistance(
        args.lat,
        args.lng,
        venue.coordinates.lat,
        venue.coordinates.lng
      );
      return { ...venue, distance };
    });

    return venuesWithDistance
      .filter((v) => v.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance)
      .map((venue) => ({
        ...toPublicVenue(venue),
        distance: venue.distance,
      }));
  },
});


/**
 * Toggles the saved/followed status of a venue for the current user.
 * If already saved, removes the save. If not saved, adds it.
 * Requires authentication.
 *
 * @param venueId - The Convex ID of the venue to save/unsave
 * @returns Object indicating the action taken ("saved" or "unsaved")
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const toggleSave = useMutation(api.venues.toggleSave);
 * const { action } = await toggleSave({ venueId: "k9x..." });
 */
export const toggleSave = mutation({
  args: { venueId: v.id("venues") },
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
      .query("savedVenues")
      .withIndex("by_user_venue", (q) =>
        q.eq("userId", user._id).eq("venueId", args.venueId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { action: "unsaved" };
    }

    await ctx.db.insert("savedVenues", {
      userId: user._id,
      venueId: args.venueId,
      createdAt: Date.now(),
    });

    return { action: "saved" };
  },
});

/**
 * Gets all venues saved by the current user.
 * Returns empty array if not authenticated or user not found.
 *
 * @returns Array of saved venue documents
 *
 * @example
 * const savedVenues = useQuery(api.venues.getSavedVenues);
 */
export const getSavedVenues = query({
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
      .query("savedVenues")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const venues = await Promise.all(
      saved.map(async (s) => {
        const venue = await ctx.db.get(s.venueId);
        return venue;
      })
    );

    return venues
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .map((venue) => toPublicVenue(venue));
  },
});

/**
 * Gets open booking dates with optional venue and genre filtering.
 * Only returns future dates with "open" status.
 * Includes venue data for each open date.
 *
 * @param venueId - Optional venue ID to filter by
 * @param genre - Optional genre to filter by
 * @param limit - Optional maximum number of results (default: 20)
 * @returns Array of open date documents with venue property added
 *
 * @example
 * // Get all open dates
 * const openDates = useQuery(api.venues.getOpenDates, {});
 *
 * // Get rock open dates at a specific venue
 * const rockDates = useQuery(api.venues.getOpenDates, {
 *   venueId: "k9x...",
 *   genre: "rock"
 * });
 */
export const getOpenDates = query({
  args: {
    venueId: v.optional(v.id("venues")),
    genre: v.optional(genreValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const now = Date.now();

    let openDates;

    if (args.venueId) {
      openDates = await ctx.db
        .query("openDates")
        .withIndex("by_venue", (q) => q.eq("venueId", args.venueId!))
        .filter((q) =>
          q.and(
            q.gte(q.field("date"), now),
            q.eq(q.field("status"), "open")
          )
        )
        .take(limit);
    } else {
      openDates = await ctx.db
        .query("openDates")
        .withIndex("by_status", (q) => q.eq("status", "open"))
        .filter((q) => q.gte(q.field("date"), now))
        .take(limit);
    }

    // Filter by genre if specified
    if (args.genre) {
      openDates = openDates.filter(
        (od) => !od.genre || od.genre === args.genre
      );
    }

    // Fetch venue data
    const openDatesWithVenue = await Promise.all(
      openDates.map(async (od) => {
        const venue = await ctx.db.get(od.venueId);
        return { ...od, venue: venue ? toPublicVenue(venue) : null };
      })
    );

    return openDatesWithVenue;
  },
});

/**
 * Submits a band's application to an open date.
 * Verifies band ownership and checks for duplicate applications.
 * Keeps the open date in "open" state while applications queue.
 * Requires band owner/admin authorization.
 *
 * @param openDateId - The Convex ID of the open date
 * @param bandId - The Convex ID of the applying band
 * @param message - Optional message to the venue
 * @returns The new application's Convex document ID
 * @throws Error if not authenticated, not authorized, already applied, or date unavailable
 *
 * @example
 * const apply = useMutation(api.venues.applyToOpenDate);
 * const applicationId = await apply({
 *   openDateId: "k9x...",
 *   bandId: "abc...",
 *   message: "We'd love to play at your venue!"
 * });
 */
export const applyToOpenDate = mutation({
  args: {
    openDateId: v.id("openDates"),
    bandId: v.id("bands"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    // Check if already applied
    const existing = await ctx.db
      .query("applications")
      .withIndex("by_band_open_date", (q) =>
        q.eq("bandId", args.bandId).eq("openDateId", args.openDateId)
      )
      .unique();

    if (existing) {
      throw new Error("Already applied to this open date");
    }

    // Check if open date is still open
    const openDate = await ctx.db.get(args.openDateId);
    if (!openDate || openDate.status !== "open") {
      throw new Error("This date is no longer available");
    }

    const openDateApplications = await ctx.db
      .query("applications")
      .withIndex("by_open_date", (q) => q.eq("openDateId", args.openDateId))
      .collect();
    const pendingApplications = openDateApplications.filter(
      (application) => application.status === "pending"
    );
    if (pendingApplications.length >= OPEN_DATE_PENDING_APPLICATION_CAP) {
      throw new Error("This date has reached the pending application limit");
    }

    // Create application
    const applicationId = await ctx.db.insert("applications", {
      bandId: args.bandId,
      openDateId: args.openDateId,
      status: "pending",
      message: args.message,
      appliedAt: Date.now(),
    });

    return applicationId;
  },
});

/**
 * Gets all applications submitted by a band with related open date and venue data.
 *
 * @param bandId - The Convex ID of the band
 * @returns Array of application documents with openDate and venue properties
 *
 * @example
 * const applications = useQuery(api.venues.getBandApplications, { bandId: "k9x..." });
 */
export const getBandApplications = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    await requireBandMember(ctx, args.bandId);

    const applications = await ctx.db
      .query("applications")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();

    const applicationsWithDetails = await Promise.all(
      applications.map(async (app) => {
        const openDate = await ctx.db.get(app.openDateId);
        const venue = openDate ? await ctx.db.get(openDate.venueId) : null;
        return { ...app, openDate, venue };
      })
    );

    return applicationsWithDetails;
  },
});

/**
 * Creates a venue from Google Places data or returns existing venue ID.
 * Deduplicates by checking coordinates within a small tolerance.
 * Requires band owner/admin authorization.
 *
 * @param bandId - The Convex ID of the band creating/selecting the venue
 * @param name - Venue name
 * @param address - Street address
 * @param city - City name
 * @param coordinates - Geographic coordinates {lat, lng}
 * @param placeId - Optional Google Places ID
 * @param capacity - Optional capacity (default: 100)
 * @param description - Optional description
 * @param genres - Optional array of genres
 * @returns The venue's Convex document ID (new or existing)
 * @throws Error if not authorized for the provided band
 *
 * @example
 * const createVenue = useMutation(api.venues.createFromPlace);
 * const venueId = await createVenue({
 *   name: "The Starry Plough",
 *   address: "3101 Shattuck Ave",
 *   city: "Berkeley",
 *   coordinates: { lat: 37.8497, lng: -122.2661 }
 * });
 */
export const createFromPlace = mutation({
  args: {
    bandId: v.id("bands"),
    name: v.string(),
    address: v.string(),
    city: v.string(),
    coordinates: v.object({
      lat: v.number(),
      lng: v.number(),
    }),
    placeId: v.optional(v.string()),
    capacity: v.optional(v.number()),
    description: v.optional(v.string()),
    genres: v.optional(v.array(genreValidator)),
  },
  handler: async (ctx, args): Promise<Id<"venues">> => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    // Check if venue already exists by coordinates (within small tolerance)
    // or by placeId if provided - use indexed query by city to avoid full table scan
    const existingVenues = await ctx.db
      .query("venues")
      .withIndex("by_city", (q) => q.eq("city", args.city))
      .collect();

    // Try to find by placeId first
    if (args.placeId) {
      const byPlaceId = existingVenues.find(v =>
        v.name === args.name && v.address === args.address
      );
      if (byPlaceId) {
        return byPlaceId._id;
      }
    }

    // Try to find by coordinates (within ~10 meters tolerance)
    const byCoordinates = existingVenues.find(v =>
      coordinatesMatch(
        v.coordinates.lat,
        v.coordinates.lng,
        args.coordinates.lat,
        args.coordinates.lng
      )
    );

    if (byCoordinates) {
      return byCoordinates._id;
    }

    // Create new venue
    const venueId = await ctx.db.insert("venues", {
      name: args.name,
      address: args.address,
      city: args.city,
      coordinates: args.coordinates,
      capacity: args.capacity || 100,
      description: args.description,
      genres: args.genres,
    });

    return venueId;
  },
});

/**
 * Finds a venue by coordinates within a tolerance.
 * Used for deduplication when creating venues.
 *
 * @param lat - Latitude to search for
 * @param lng - Longitude to search for
 * @param tolerance - Optional coordinate tolerance (default: COORDINATE_TOLERANCE)
 * @returns The matching venue document if found, null otherwise
 *
 * @example
 * const venue = useQuery(api.venues.findByCoordinates, {
 *   lat: 37.8497,
 *   lng: -122.2661
 * });
 */
export const findByCoordinates = query({
  args: {
    lat: v.number(),
    lng: v.number(),
    tolerance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tolerance = args.tolerance || COORDINATE_TOLERANCE;
    const venues = await ctx.db.query("venues").collect();

    const match = venues.find(v =>
      coordinatesMatch(
        v.coordinates.lat,
        v.coordinates.lng,
        args.lat,
        args.lng,
        tolerance
      )
    );

    return match ? toPublicVenue(match) : null;
  },
});
