import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { haversineDistance, coordinatesMatch, COORDINATE_TOLERANCE } from "./utils/geo";

const genreValidator = v.union(
  v.literal("indie"),
  v.literal("rock"),
  v.literal("jazz"),
  v.literal("electronic"),
  v.literal("folk"),
  v.literal("pop"),
  v.literal("alternative")
);

// Get venue by ID
export const getById = query({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.venueId);
  },
});

// List all venues
export const list = query({
  args: {
    city: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.city) {
      return await ctx.db
        .query("venues")
        .withIndex("by_city", (q) => q.eq("city", args.city!))
        .take(limit);
    }

    return await ctx.db.query("venues").take(limit);
  },
});

// Get suggested venues for a band (based on genre match)
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
      return [...genreMatches, ...others].slice(0, limit);
    }

    return venues.slice(0, limit);
  },
});

// Search venues by name or city
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
      .slice(0, limit);
  },
});

// Get venues near a location (simplified - returns all and lets client filter)
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
      .sort((a, b) => a.distance - b.distance);
  },
});


// Save/unsave a venue
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

// Get user's saved venues
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

    return venues.filter((v) => v !== null);
  },
});

// Get open dates for a venue
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
        return { ...od, venue };
      })
    );

    return openDatesWithVenue;
  },
});

// Apply to an open date
export const applyToOpenDate = mutation({
  args: {
    openDateId: v.id("openDates"),
    bandId: v.id("bands"),
    message: v.optional(v.string()),
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

    // Verify band ownership
    const band = await ctx.db.get(args.bandId);
    if (!band || band.userId !== user._id) {
      throw new Error("Not authorized to apply for this band");
    }

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

    // Create application
    const applicationId = await ctx.db.insert("applications", {
      bandId: args.bandId,
      openDateId: args.openDateId,
      status: "pending",
      message: args.message,
      appliedAt: Date.now(),
    });

    // Update open date status to pending
    await ctx.db.patch(args.openDateId, { status: "pending" });

    return applicationId;
  },
});

// Get applications for a band
export const getBandApplications = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
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

// Create or find a venue from Google Places data
export const createFromPlace = mutation({
  args: {
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

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

// Find venue by coordinates (for deduplication)
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

    return match || null;
  },
});
