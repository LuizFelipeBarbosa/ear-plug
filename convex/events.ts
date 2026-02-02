/**
 * @fileoverview Convex queries and mutations for event management.
 * Handles event CRUD operations, user interactions (RSVP, likes),
 * search functionality, and geospatial queries.
 * @module convex/events
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { haversineDistance, coordinatesMatch } from "./utils/geo";

/**
 * Validator for music genre values.
 * Supports: indie, rock, jazz, electronic, folk, pop, alternative
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
 * Lists all upcoming events sorted by date.
 * Includes related band and venue data for each event.
 *
 * @param args.limit - Maximum number of events to return (default: 50)
 * @returns Array of event documents with band and venue details
 *
 * @example
 * // Get next 20 upcoming events
 * const events = await ctx.runQuery(api.events.listUpcoming, { limit: 20 });
 */
export const listUpcoming = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit || 50;

    const events = await ctx.db
      .query("events")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("dateTime"), now))
      .order("asc")
      .take(limit);

    // Fetch related band and venue data
    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);
        return {
          ...event,
          band,
          venue,
        };
      })
    );

    return eventsWithDetails;
  },
});

/**
 * Lists upcoming events filtered by a specific genre.
 * Supports both the current genres array and legacy single genre field.
 *
 * @param args.genre - The music genre to filter by
 * @param args.limit - Maximum number of events to return (default: 50)
 * @returns Array of matching event documents with band and venue details
 *
 * @example
 * // Get jazz events
 * const jazzEvents = await ctx.runQuery(api.events.listByGenre, {
 *   genre: "jazz",
 *   limit: 10
 * });
 */
export const listByGenre = query({
  args: {
    genre: genreValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit || 50;

    // Get all upcoming events and filter by genre
    const events = await ctx.db
      .query("events")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("dateTime"), now))
      .take(200);

    // Filter events that include the selected genre (check both genres array and legacy genre field)
    const filteredEvents = events.filter((event) => {
      // Check genres array first
      if (event.genres && event.genres.length > 0) {
        return event.genres.includes(args.genre);
      }
      // Fall back to legacy genre field
      return event.genre === args.genre;
    }).slice(0, limit);

    const eventsWithDetails = await Promise.all(
      filteredEvents.map(async (event) => {
        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);
        return { ...event, band, venue };
      })
    );

    return eventsWithDetails;
  },
});

/**
 * Retrieves a single event by its ID with full details.
 * Includes the associated band and venue documents.
 *
 * @param args.eventId - The Convex ID of the event
 * @returns Event document with band and venue, or null if not found
 *
 * @example
 * const event = await ctx.runQuery(api.events.getById, {
 *   eventId: "j57..."
 * });
 * if (event) {
 *   console.log(event.title, event.venue?.name);
 * }
 */
export const getById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const band = await ctx.db.get(event.bandId);
    const venue = await ctx.db.get(event.venueId);

    return {
      ...event,
      band,
      venue,
    };
  },
});

/**
 * Lists events for a specific band.
 * Optionally includes past events. Returns events sorted by date ascending.
 *
 * @param args.bandId - The Convex ID of the band
 * @param args.includesPast - If true, includes past events (default: false)
 * @returns Array of event documents with venue details
 *
 * @example
 * // Get all upcoming events for a band
 * const upcomingEvents = await ctx.runQuery(api.events.listByBand, {
 *   bandId: band._id
 * });
 *
 * @example
 * // Get all events including past ones
 * const allEvents = await ctx.runQuery(api.events.listByBand, {
 *   bandId: band._id,
 *   includesPast: true
 * });
 */
export const listByBand = query({
  args: {
    bandId: v.id("bands"),
    includesPast: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    let events = await ctx.db
      .query("events")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();

    if (!args.includesPast) {
      events = events.filter((e) => e.dateTime >= now);
    }

    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const venue = await ctx.db.get(event.venueId);
        return { ...event, venue };
      })
    );

    return eventsWithDetails.sort((a, b) => a.dateTime - b.dateTime);
  },
});

/**
 * Lists upcoming events at a specific venue.
 * Returns events sorted by date ascending.
 *
 * @param args.venueId - The Convex ID of the venue
 * @returns Array of upcoming event documents with band details
 *
 * @example
 * const venueEvents = await ctx.runQuery(api.events.listByVenue, {
 *   venueId: venue._id
 * });
 */
export const listByVenue = query({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const events = await ctx.db
      .query("events")
      .withIndex("by_venue", (q) => q.eq("venueId", args.venueId))
      .filter((q) => q.gte(q.field("dateTime"), now))
      .collect();

    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const band = await ctx.db.get(event.bandId);
        return { ...event, band };
      })
    );

    return eventsWithDetails.sort((a, b) => a.dateTime - b.dateTime);
  },
});

/**
 * Searches events by title, band name, or venue name.
 * Performs case-insensitive partial matching on all three fields.
 *
 * @param args.query - The search string to match
 * @param args.limit - Maximum number of results to return (default: 20)
 * @returns Array of matching event documents with band and venue details
 *
 * @example
 * // Search for events with "jazz" in title, band, or venue name
 * const results = await ctx.runQuery(api.events.search, {
 *   query: "jazz",
 *   limit: 10
 * });
 */
export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase();
    const limit = args.limit || 20;
    const now = Date.now();

    // Get all upcoming events
    const events = await ctx.db
      .query("events")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("dateTime"), now))
      .take(100);

    // Fetch band and venue data and filter
    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);
        return { ...event, band, venue };
      })
    );

    // Filter by search query
    const filtered = eventsWithDetails.filter((event) => {
      const titleMatch = event.title.toLowerCase().includes(searchQuery);
      const bandMatch = event.band?.name.toLowerCase().includes(searchQuery);
      const venueMatch = event.venue?.name.toLowerCase().includes(searchQuery);
      return titleMatch || bandMatch || venueMatch;
    });

    return filtered.slice(0, limit);
  },
});

/**
 * Toggles RSVP status for the current user on an event.
 * If already RSVP'd, removes the RSVP. Otherwise, adds one.
 * Updates the event's rsvpCount accordingly.
 *
 * @param args.eventId - The Convex ID of the event to RSVP to
 * @returns Object with action: "added" or "removed"
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const result = await ctx.runMutation(api.events.rsvp, {
 *   eventId: event._id
 * });
 * if (result.action === "added") {
 *   toast.success("RSVP confirmed!");
 * }
 */
export const rsvp = mutation({
  args: { eventId: v.id("events") },
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

    // Check if already RSVP'd
    const existingRsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (existingRsvp) {
      // Remove RSVP
      await ctx.db.delete(existingRsvp._id);

      // Decrement RSVP count
      const event = await ctx.db.get(args.eventId);
      if (event) {
        await ctx.db.patch(args.eventId, {
          rsvpCount: Math.max(0, event.rsvpCount - 1),
        });
      }

      return { action: "removed" };
    }

    // Add RSVP
    await ctx.db.insert("rsvps", {
      userId: user._id,
      eventId: args.eventId,
      createdAt: Date.now(),
    });

    // Increment RSVP count
    const event = await ctx.db.get(args.eventId);
    if (event) {
      await ctx.db.patch(args.eventId, {
        rsvpCount: event.rsvpCount + 1,
      });
    }

    return { action: "added" };
  },
});

/**
 * Toggles like status for the current user on an event.
 * If already liked, removes the like. Otherwise, adds one.
 *
 * @param args.eventId - The Convex ID of the event to like/unlike
 * @returns Object with action: "liked" or "unliked"
 * @throws Error if not authenticated or user not found
 *
 * @example
 * const result = await ctx.runMutation(api.events.toggleLike, {
 *   eventId: event._id
 * });
 * // Update UI based on result.action
 */
export const toggleLike = mutation({
  args: { eventId: v.id("events") },
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

    // Check if already liked
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (existingLike) {
      await ctx.db.delete(existingLike._id);
      return { action: "unliked" };
    }

    await ctx.db.insert("likes", {
      userId: user._id,
      eventId: args.eventId,
      createdAt: Date.now(),
    });

    return { action: "liked" };
  },
});

/**
 * Gets the current user's upcoming RSVP'd events.
 * Excludes past events. Returns events sorted by date ascending.
 *
 * @returns Array of upcoming event documents with band, venue, and rsvpedAt timestamp
 *
 * @example
 * const myUpcomingEvents = await ctx.runQuery(api.events.getUserRsvps);
 * // Display in user's "My Events" section
 */
export const getUserRsvps = query({
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

    const now = Date.now();
    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const eventsWithDetails = await Promise.all(
      rsvps.map(async (rsvp) => {
        const event = await ctx.db.get(rsvp.eventId);
        if (!event) return null;
        // Only include upcoming events
        if (event.dateTime < now) return null;

        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);
        return { ...event, band, venue, rsvpedAt: rsvp.createdAt };
      })
    );

    return eventsWithDetails
      .filter((e) => e !== null)
      .sort((a, b) => a!.dateTime - b!.dateTime);
  },
});

/**
 * Gets the current user's past RSVP'd events.
 * Only includes events that have already occurred.
 * Returns events sorted by date descending (most recent first).
 *
 * @returns Array of past event documents with band, venue, and rsvpedAt timestamp
 *
 * @example
 * const pastEvents = await ctx.runQuery(api.events.getUserPastRsvps);
 * // Display in user's "Past Events" or "History" section
 */
export const getUserPastRsvps = query({
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

    const now = Date.now();
    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const eventsWithDetails = await Promise.all(
      rsvps.map(async (rsvp) => {
        const event = await ctx.db.get(rsvp.eventId);
        if (!event) return null;
        // Only include past events
        if (event.dateTime >= now) return null;

        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);
        return { ...event, band, venue, rsvpedAt: rsvp.createdAt };
      })
    );

    return eventsWithDetails
      .filter((e) => e !== null)
      .sort((a, b) => b!.dateTime - a!.dateTime); // Most recent first
  },
});

/**
 * Gets the current user's liked events.
 * Excludes events that the user has also RSVP'd to.
 * Returns events sorted by date ascending.
 *
 * @returns Array of liked event documents with band, venue, and likedAt timestamp
 *
 * @example
 * const likedEvents = await ctx.runQuery(api.events.getUserLikes);
 * // Display in "Saved Events" or "Interested" section
 */
export const getUserLikes = query({
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

    const likes = await ctx.db
      .query("likes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get user's RSVPs to exclude from liked events
    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const rsvpEventIds = new Set(rsvps.map((r) => r.eventId));

    const eventsWithDetails = await Promise.all(
      likes.map(async (like) => {
        if (rsvpEventIds.has(like.eventId)) return null; // Exclude RSVP'd events

        const event = await ctx.db.get(like.eventId);
        if (!event) return null;

        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);
        return { ...event, band, venue, likedAt: like.createdAt };
      })
    );

    return eventsWithDetails
      .filter((e) => e !== null)
      .sort((a, b) => a!.dateTime - b!.dateTime);
  },
});

/**
 * Checks the current user's RSVP and like status for a specific event.
 * Returns false for both if not authenticated.
 *
 * @param args.eventId - The Convex ID of the event to check
 * @returns Object with hasRsvp and hasLiked boolean flags
 *
 * @example
 * const status = await ctx.runQuery(api.events.getUserEventStatus, {
 *   eventId: event._id
 * });
 * // Use to render RSVP/Like button states
 * <button>{status.hasRsvp ? "Cancel RSVP" : "RSVP"}</button>
 */
export const getUserEventStatus = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { hasRsvp: false, hasLiked: false };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return { hasRsvp: false, hasLiked: false };
    }

    const rsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    const like = await ctx.db
      .query("likes")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    return {
      hasRsvp: !!rsvp,
      hasLiked: !!like,
    };
  },
});

/**
 * Lists nearby events within a specified radius of given coordinates.
 * Uses the Haversine formula for accurate distance calculations.
 * Optionally filters by genre.
 *
 * @param args.latitude - User's latitude in decimal degrees
 * @param args.longitude - User's longitude in decimal degrees
 * @param args.radiusMiles - Maximum distance from user in miles
 * @param args.genre - Optional genre filter
 * @param args.limit - Maximum number of events to return (default: 50)
 * @returns Array of nearby events sorted by distance, with distance in miles included
 *
 * @example
 * // Find rock events within 5 miles
 * const nearbyRockEvents = await ctx.runQuery(api.events.listNearby, {
 *   latitude: 37.7749,
 *   longitude: -122.4194,
 *   radiusMiles: 5,
 *   genre: "rock"
 * });
 * // Each event includes a distance field (e.g., 2.3 miles)
 */
export const listNearby = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    radiusMiles: v.number(),
    genre: v.optional(genreValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit || 50;

    // Get all upcoming events
    let events = await ctx.db
      .query("events")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("dateTime"), now))
      .take(200);

    // Filter by genre if specified (check both genres array and legacy genre field)
    if (args.genre) {
      events = events.filter((event) => {
        if (event.genres && event.genres.length > 0) {
          return event.genres.includes(args.genre!);
        }
        return event.genre === args.genre;
      });
    }

    // Fetch venue data and calculate distances
    const eventsWithDistance = await Promise.all(
      events.map(async (event) => {
        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);

        if (!venue?.coordinates) {
          return null;
        }

        // Calculate distance using Haversine formula
        const distance = haversineDistance(
          args.latitude,
          args.longitude,
          venue.coordinates.lat,
          venue.coordinates.lng
        );

        // Filter by radius
        if (distance > args.radiusMiles) {
          return null;
        }

        return {
          ...event,
          band,
          venue,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        };
      })
    );

    // Filter out nulls and sort by distance
    const filtered = eventsWithDistance
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return filtered;
  },
});

/**
 * Creates a new event for a band at an existing venue.
 * Only the band owner can create events for their band.
 * Schedules notifications for fans who follow the band or venue.
 *
 * @param args.title - Event title/name
 * @param args.bandId - Convex ID of the performing band
 * @param args.venueId - Convex ID of the venue
 * @param args.dateTime - Event start time as Unix timestamp (milliseconds)
 * @param args.image - Optional event image URL
 * @param args.capacity - Venue capacity for this event
 * @param args.price - Optional ticket price in dollars
 * @param args.description - Optional event description
 * @param args.genres - Array of music genres for the event
 * @param args.genre - Optional legacy single genre field
 * @returns The Convex ID of the newly created event
 * @throws Error if not authenticated, band not found, or user is not the band owner
 *
 * @example
 * const eventId = await ctx.runMutation(api.events.create, {
 *   title: "Friday Night Live",
 *   bandId: myBand._id,
 *   venueId: selectedVenue._id,
 *   dateTime: new Date("2024-06-15T20:00").getTime(),
 *   capacity: 150,
 *   genres: ["rock", "indie"]
 * });
 */
export const create = mutation({
  args: {
    title: v.string(),
    bandId: v.id("bands"),
    venueId: v.id("venues"),
    dateTime: v.number(),
    image: v.optional(v.string()),
    capacity: v.number(),
    price: v.optional(v.number()),
    description: v.optional(v.string()),
    genres: v.array(genreValidator), // Multiple genres
    genre: v.optional(genreValidator), // Legacy field for backward compatibility
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify the band belongs to this user
    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || band.userId !== user._id) {
      throw new Error("Not authorized to create events for this band");
    }

    const { genre, ...restArgs } = args;
    const eventId = await ctx.db.insert("events", {
      ...restArgs,
      rsvpCount: 0,
      status: "confirmed",
    });

    // Schedule notifications for fans who saved this venue or band
    await ctx.scheduler.runAfter(0, internal.notifications.createNearbyEventNotifications, {
      eventId,
      venueId: args.venueId,
      bandId: args.bandId,
    });

    return eventId;
  },
});

/**
 * Creates a new event with automatic venue creation from Google Places data.
 * If a venue with matching coordinates already exists, reuses it.
 * Only the band owner can create events for their band.
 * Schedules notifications for fans who follow the band or venue.
 *
 * @param args.title - Event title/name
 * @param args.bandId - Convex ID of the performing band
 * @param args.dateTime - Event start time as Unix timestamp (milliseconds)
 * @param args.genres - Array of music genres for the event
 * @param args.genre - Optional legacy single genre field
 * @param args.venueName - Name of the venue from Google Places
 * @param args.venueAddress - Street address of the venue
 * @param args.venueCity - City where the venue is located
 * @param args.venueCoordinates - Object with lat and lng properties
 * @param args.venuePlaceId - Optional Google Places ID for deduplication
 * @param args.image - Optional event image URL
 * @param args.capacity - Optional venue capacity (default: 100)
 * @param args.price - Optional ticket price in dollars
 * @param args.description - Optional event description
 * @returns Object with eventId and venueId (new or existing)
 * @throws Error if not authenticated, band not found, or user is not the band owner
 *
 * @example
 * const { eventId, venueId } = await ctx.runMutation(api.events.createWithVenue, {
 *   title: "Album Release Party",
 *   bandId: myBand._id,
 *   dateTime: new Date("2024-07-20T21:00").getTime(),
 *   genres: ["indie", "rock"],
 *   venueName: "The Starry Plough",
 *   venueAddress: "3101 Shattuck Ave",
 *   venueCity: "Berkeley",
 *   venueCoordinates: { lat: 37.8497, lng: -122.2661 }
 * });
 */
export const createWithVenue = mutation({
  args: {
    title: v.string(),
    bandId: v.id("bands"),
    dateTime: v.number(),
    genres: v.array(genreValidator), // Multiple genres
    genre: v.optional(genreValidator), // Legacy field for backward compatibility
    venueName: v.string(),
    venueAddress: v.string(),
    venueCity: v.string(),
    venueCoordinates: v.object({
      lat: v.number(),
      lng: v.number(),
    }),
    venuePlaceId: v.optional(v.string()),
    image: v.optional(v.string()),
    capacity: v.optional(v.number()),
    price: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify the band belongs to this user
    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || band.userId !== user._id) {
      throw new Error("Not authorized to create events for this band");
    }

    // Check if venue already exists by coordinates (use indexed query by city)
    const existingVenues = await ctx.db
      .query("venues")
      .withIndex("by_city", (q) => q.eq("city", args.venueCity))
      .collect();
    const existingVenue = existingVenues.find((v) =>
      coordinatesMatch(
        v.coordinates.lat,
        v.coordinates.lng,
        args.venueCoordinates.lat,
        args.venueCoordinates.lng
      )
    );

    let venueId;
    if (existingVenue) {
      venueId = existingVenue._id;
    } else {
      // Create new venue
      venueId = await ctx.db.insert("venues", {
        name: args.venueName,
        address: args.venueAddress,
        city: args.venueCity,
        coordinates: args.venueCoordinates,
        capacity: args.capacity || 100,
      });
    }

    // Create the event
    const eventId = await ctx.db.insert("events", {
      title: args.title,
      bandId: args.bandId,
      venueId,
      dateTime: args.dateTime,
      image: args.image,
      capacity: args.capacity || 100,
      price: args.price,
      description: args.description,
      genres: args.genres,
      rsvpCount: 0,
      status: "confirmed",
    });

    // Schedule notifications for fans who saved this venue or band
    await ctx.scheduler.runAfter(0, internal.notifications.createNearbyEventNotifications, {
      eventId,
      venueId,
      bandId: args.bandId,
    });

    return { eventId, venueId };
  },
});
