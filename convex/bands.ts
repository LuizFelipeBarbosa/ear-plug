import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const genreValidator = v.union(
  v.literal("indie"),
  v.literal("rock"),
  v.literal("jazz"),
  v.literal("electronic"),
  v.literal("folk"),
  v.literal("pop"),
  v.literal("alternative")
);

const socialLinksValidator = v.object({
  spotify: v.optional(v.string()),
  appleMusic: v.optional(v.string()),
  instagram: v.optional(v.string()),
  tiktok: v.optional(v.string()),
  youtube: v.optional(v.string()),
  website: v.optional(v.string()),
});

// Get band by ID
export const getById = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.bandId);
  },
});

// Get current user's band
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

    if (!user || user.role !== "musician") {
      return null;
    }

    const band = await ctx.db
      .query("bands")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return band;
  },
});

// Get band with stats (for dashboard)
export const getBandWithStats = query({
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

    if (!user || user.role !== "musician") {
      return null;
    }

    const band = await ctx.db
      .query("bands")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

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

// Create a band (for new musicians)
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

    // Check if user already has a band
    const existingBand = await ctx.db
      .query("bands")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingBand) {
      throw new Error("User already has a band");
    }

    const bandId = await ctx.db.insert("bands", {
      userId: user._id,
      ...args,
      createdAt: Date.now(),
    });

    return bandId;
  },
});

// Update band profile
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

    const band = await ctx.db.get(args.bandId);
    if (!band || band.userId !== user._id) {
      throw new Error("Not authorized to update this band");
    }

    const { bandId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(args.bandId, filteredUpdates);

    return args.bandId;
  },
});

// List all bands (for discovery)
export const list = query({
  args: {
    genre: v.optional(genreValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.genre) {
      // Filter bands that include the requested genre in their genres array
      const allBands = await ctx.db.query("bands").take(limit * 2);
      return allBands
        .filter((band) => band.genres.includes(args.genre!))
        .slice(0, limit);
    }

    return await ctx.db.query("bands").take(limit);
  },
});

// Search bands by name
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

// Save/unsave a band (for fans)
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

// Get user's saved bands
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

// Get analytics for a band
export const getAnalytics = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

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
