import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

const genreValidator = v.union(
  v.literal("indie"),
  v.literal("rock"),
  v.literal("jazz"),
  v.literal("electronic"),
  v.literal("folk"),
  v.literal("pop"),
  v.literal("alternative")
);

// Get all upcoming events
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

// Get events by genre
export const listByGenre = query({
  args: {
    genre: genreValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit || 50;

    const events = await ctx.db
      .query("events")
      .withIndex("by_genre", (q) => q.eq("genre", args.genre))
      .filter((q) => q.gte(q.field("dateTime"), now))
      .take(limit);

    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);
        return { ...event, band, venue };
      })
    );

    return eventsWithDetails;
  },
});

// Get event by ID with full details
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

// Get events by band
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

// Get events by venue
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

// Search events by title or band name
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

// RSVP to an event
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

// Like/unlike an event
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

// Get user's RSVP'd events
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

    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const eventsWithDetails = await Promise.all(
      rsvps.map(async (rsvp) => {
        const event = await ctx.db.get(rsvp.eventId);
        if (!event) return null;

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

// Get user's liked events
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

// Check if user has RSVP'd or liked an event
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

// Get nearby events (filter by distance from coordinates)
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
    let events;
    if (args.genre) {
      events = await ctx.db
        .query("events")
        .withIndex("by_genre", (q) => q.eq("genre", args.genre!))
        .filter((q) => q.gte(q.field("dateTime"), now))
        .take(100);
    } else {
      events = await ctx.db
        .query("events")
        .withIndex("by_date")
        .filter((q) => q.gte(q.field("dateTime"), now))
        .take(100);
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

// Haversine distance formula (returns miles)
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Create a new event (for bands)
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
    genre: genreValidator,
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

    const eventId = await ctx.db.insert("events", {
      ...args,
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
