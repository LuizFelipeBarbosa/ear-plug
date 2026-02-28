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
import {
  requireAuthenticatedUser,
  requireBandMember,
  requireBandRole,
} from "./utils/permissions";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

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

const eventStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("hold"),
  v.literal("available")
);

const eventAddressVisibilityValidator = v.union(
  v.literal("public"),
  v.literal("rsvp_only")
);

type EventAddressVisibility = "public" | "rsvp_only";
type GuestRsvpType = "on_list" | "attended";

const guestFilterTypeValidator = v.union(
  v.literal("all"),
  v.literal("on_list"),
  v.literal("attended")
);

const MASKED_VENUE_ADDRESS = "Address revealed after RSVP";
const GUEST_LIST_PREVIEW_LIMIT = 6;
const GUEST_LIST_CAP = 500;

interface ViewerContext {
  userId: Id<"users"> | null;
  memberBandIds: Set<Id<"bands">>;
  rsvpEventIds: Set<Id<"events">>;
}

interface EventBandAccess {
  event: Doc<"events">;
  membership: Doc<"bandMemberships">;
  canViewGuestList: boolean;
  canManageGuestList: boolean;
}

interface VenueResolutionInput {
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueCoordinates: {
    lat: number;
    lng: number;
  };
  capacity?: number;
}

interface EventVenueInput {
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
  venueCoordinates?: {
    lat: number;
    lng: number;
  };
}

interface ConfirmedEventValidationInput extends EventVenueInput {
  title?: string;
  dateTime?: number;
  capacity?: number;
  genres?: readonly string[];
  venueId?: Id<"venues">;
}

type PublicEvent = Doc<"events"> & {
  status: "confirmed";
  title: string;
  venueId: Id<"venues">;
  dateTime: number;
  capacity: number;
};

function isTentative(status: Doc<"events">["status"] | undefined): boolean {
  return status === "hold";
}

function isPublic(status: Doc<"events">["status"] | undefined): boolean {
  return status === "confirmed";
}

function hasCompleteVenueInput(input: EventVenueInput): input is Required<EventVenueInput> {
  return (
    typeof input.venueName === "string" &&
    input.venueName.trim().length > 0 &&
    typeof input.venueAddress === "string" &&
    input.venueAddress.trim().length > 0 &&
    typeof input.venueCity === "string" &&
    input.venueCoordinates !== undefined
  );
}

function validateConfirmedEventPayload(
  input: ConfirmedEventValidationInput
): void {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error("Confirmed gigs require an event title.");
  }

  if (typeof input.dateTime !== "number" || !Number.isFinite(input.dateTime)) {
    throw new Error("Confirmed gigs require a valid date.");
  }

  if (typeof input.capacity !== "number" || !Number.isFinite(input.capacity) || input.capacity <= 0) {
    throw new Error("Confirmed gigs require a positive capacity.");
  }

  if (!input.genres || input.genres.length === 0) {
    throw new Error("Confirmed gigs require at least one genre.");
  }

  if (!input.venueId && !hasCompleteVenueInput(input)) {
    throw new Error("Confirmed gigs require a complete venue selection.");
  }
}

function hasPublicCoreFields(
  event: Pick<Doc<"events">, "title" | "venueId" | "dateTime" | "capacity">
): event is Pick<PublicEvent, "title" | "venueId" | "dateTime" | "capacity"> {
  return (
    typeof event.title === "string" &&
    event.title.trim().length > 0 &&
    event.venueId !== undefined &&
    typeof event.dateTime === "number" &&
    Number.isFinite(event.dateTime) &&
    typeof event.capacity === "number" &&
    Number.isFinite(event.capacity)
  );
}

function isPublicEvent(event: Doc<"events">): event is PublicEvent {
  return isPublic(event.status) && hasPublicCoreFields(event);
}

function getAttendanceStatus(
  rsvp: Pick<Doc<"rsvps">, "attendanceStatus">
): GuestRsvpType {
  return rsvp.attendanceStatus ?? "on_list";
}

async function decrementShowsAttended(
  ctx: MutationCtx,
  userId: Id<"users">
) {
  const user = await ctx.db.get(userId);
  if (!user) return;

  // Legacy seeded/manual values may not match historical attended RSVP count.
  await ctx.db.patch(userId, {
    showsAttended: Math.max(0, (user.showsAttended ?? 0) - 1),
  });
}

async function incrementShowsAttended(
  ctx: MutationCtx,
  userId: Id<"users">
) {
  const user = await ctx.db.get(userId);
  if (!user) return;

  // Legacy seeded/manual values may not match historical attended RSVP count.
  await ctx.db.patch(userId, {
    showsAttended: (user.showsAttended ?? 0) + 1,
  });
}

async function buildViewerContext(ctx: QueryCtx): Promise<ViewerContext> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return {
      userId: null,
      memberBandIds: new Set<Id<"bands">>(),
      rsvpEventIds: new Set<Id<"events">>(),
    };
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    return {
      userId: null,
      memberBandIds: new Set<Id<"bands">>(),
      rsvpEventIds: new Set<Id<"events">>(),
    };
  }

  const [memberships, rsvps] = await Promise.all([
    ctx.db
      .query("bandMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect(),
    ctx.db
      .query("rsvps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect(),
  ]);

  return {
    userId: user._id,
    memberBandIds: new Set(memberships.map((membership) => membership.bandId)),
    rsvpEventIds: new Set(rsvps.map((rsvp) => rsvp.eventId)),
  };
}

function canViewAddress(
  event: Pick<Doc<"events">, "_id" | "bandId" | "addressVisibility">,
  viewerContext: ViewerContext
): boolean {
  const visibility = event.addressVisibility ?? "public";

  if (visibility === "public") {
    return true;
  }

  if (viewerContext.memberBandIds.has(event.bandId)) {
    return true;
  }

  return viewerContext.rsvpEventIds.has(event._id);
}

function applyAddressMask<
  T extends {
    _id: Id<"events">;
    bandId: Id<"bands">;
    addressVisibility?: EventAddressVisibility;
    venue?: { address: string } | null;
  },
>(event: T, viewerContext: ViewerContext): T & { isVenueAddressHidden: boolean } {
  if (!event.venue || canViewAddress(event, viewerContext)) {
    return {
      ...event,
      isVenueAddressHidden: false,
    };
  }

  return {
    ...event,
    venue: {
      ...event.venue,
      address: MASKED_VENUE_ADDRESS,
    },
    isVenueAddressHidden: true,
  };
}

async function resolveEventBandAccess(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">
): Promise<EventBandAccess> {
  // Event-specific authorization helper; can be generalized in utils/permissions if reused.
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  const user = await requireAuthenticatedUser(ctx);
  const membership = await ctx.db
    .query("bandMemberships")
    .withIndex("by_band_user", (q) =>
      q.eq("bandId", event.bandId).eq("userId", user._id)
    )
    .unique();

  if (!membership) {
    throw new Error("Not authorized for this band");
  }

  return {
    event,
    membership,
    canViewGuestList: true,
    canManageGuestList:
      membership.role === "owner" || membership.role === "admin",
  };
}

async function findOrCreateVenueByLocation(
  ctx: MutationCtx,
  input: VenueResolutionInput
): Promise<Id<"venues">> {
  const existingVenues = await ctx.db
    .query("venues")
    .withIndex("by_city", (q) => q.eq("city", input.venueCity))
    .collect();

  const existingVenue = existingVenues.find((venue) =>
    coordinatesMatch(
      venue.coordinates.lat,
      venue.coordinates.lng,
      input.venueCoordinates.lat,
      input.venueCoordinates.lng
    )
  );

  if (existingVenue) {
    return existingVenue._id;
  }

  return await ctx.db.insert("venues", {
    name: input.venueName,
    address: input.venueAddress,
    city: input.venueCity,
    coordinates: input.venueCoordinates,
    capacity: input.capacity || 100,
  });
}

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
    const viewerContext = await buildViewerContext(ctx);

    const rawEvents = await ctx.db
      .query("events")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("dateTime"), now))
      .order("asc")
      .take(limit * 4);

    const events = rawEvents
      .filter((event): event is PublicEvent => isPublicEvent(event))
      .slice(0, limit);

    // Fetch related band and venue data
    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);
        return applyAddressMask(
          {
            ...event,
            band,
            venue,
          },
          viewerContext
        );
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
    const viewerContext = await buildViewerContext(ctx);

    // Get all upcoming events and filter by genre
    const events = await ctx.db
      .query("events")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("dateTime"), now))
      .take(200);

    // Filter events that include the selected genre (check both genres array and legacy genre field)
    const filteredEvents = events
      .filter((event): event is PublicEvent => isPublicEvent(event))
      .filter((event) => {
        // Check genres array first
        if (event.genres && event.genres.length > 0) {
          return event.genres.includes(args.genre);
        }
        // Fall back to legacy genre field
        return event.genre === args.genre;
      })
      .slice(0, limit);

    const eventsWithDetails = await Promise.all(
      filteredEvents.map(async (event) => {
        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);
        return applyAddressMask(
          { ...event, band, venue },
          viewerContext
        );
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
    if (!event || !isPublicEvent(event)) return null;
    const viewerContext = await buildViewerContext(ctx);

    const band = await ctx.db.get(event.bandId);
    const venue = await ctx.db.get(event.venueId);

    return applyAddressMask(
      {
        ...event,
        band,
        venue,
      },
      viewerContext
    );
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
    await requireBandMember(ctx, args.bandId);

    let events = await ctx.db
      .query("events")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();

    if (!args.includesPast) {
      events = events.filter((e) => e.dateTime === undefined || e.dateTime >= now);
    }

    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const venue = event.venueId ? await ctx.db.get(event.venueId) : null;
        return { ...event, venue };
      })
    );

    return eventsWithDetails.sort((a, b) => {
      const aTime = a.dateTime ?? Number.POSITIVE_INFINITY;
      const bTime = b.dateTime ?? Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  },
});

/**
 * Lists public past events for a specific band for fan-facing surfaces.
 * Returns confirmed events only, sorted by most recent first.
 *
 * @param args.bandId - The Convex ID of the band
 * @param args.limit - Maximum number of past gigs to return (default: 6, max: 24)
 */
export const listPublicPastByBand = query({
  args: {
    bandId: v.id("bands"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const now = Date.now();
    const limit = Math.max(1, Math.min(args.limit ?? 6, 24));

    const events = await ctx.db
      .query("events")
      .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
      .collect();

    const pastEvents = events
      .filter((event): event is PublicEvent => isPublicEvent(event))
      .filter((event) => event.dateTime < now)
      .sort((a, b) => b.dateTime - a.dateTime)
      .slice(0, limit);

    return Promise.all(
      pastEvents.map(async (event) => {
        const venue = await ctx.db.get(event.venueId);
        return {
          ...event,
          venue: {
            name: venue?.name ?? "Unknown Venue",
            city: venue?.city ?? "Unknown City",
          },
        };
      })
    );
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
      .collect();

    const upcomingPublicEvents = events.filter(
      (event): event is PublicEvent =>
        isPublicEvent(event) && event.dateTime >= now
    );

    const eventsWithDetails = await Promise.all(
      upcomingPublicEvents.map(async (event) => {
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
    const viewerContext = await buildViewerContext(ctx);

    // Get all upcoming events
    const events = await ctx.db
      .query("events")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("dateTime"), now))
      .take(100);

    // Fetch band and venue data and filter
    const eventsWithDetails = await Promise.all(
      events
        .filter((event): event is PublicEvent => isPublicEvent(event))
        .map(async (event) => {
          const band = await ctx.db.get(event.bandId);
          const venue = await ctx.db.get(event.venueId);
          return applyAddressMask(
            { ...event, band, venue },
            viewerContext
          );
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

    const event = await ctx.db.get(args.eventId);
    if (!event || !isPublicEvent(event)) {
      throw new Error("This gig is not available for RSVP.");
    }

    // Check if already RSVP'd
    const existingRsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (existingRsvp) {
      if (getAttendanceStatus(existingRsvp) === "attended") {
        await decrementShowsAttended(ctx, user._id);
      }

      // Remove RSVP
      await ctx.db.delete(existingRsvp._id);

      // Decrement RSVP count
      await ctx.db.patch(args.eventId, {
        rsvpCount: Math.max(0, event.rsvpCount - 1),
      });

      return { action: "removed" };
    }

    // Add RSVP
    await ctx.db.insert("rsvps", {
      userId: user._id,
      eventId: args.eventId,
      createdAt: Date.now(),
      attendanceStatus: "on_list",
    });

    // Increment RSVP count
    await ctx.db.patch(args.eventId, {
      rsvpCount: event.rsvpCount + 1,
    });

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

    const event = await ctx.db.get(args.eventId);
    if (!event || !isPublicEvent(event)) {
      throw new Error("This gig is not available to save.");
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
        if (!isPublicEvent(event)) return null;
        // Only include upcoming events
        if (event.dateTime < now) return null;

        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);
        // No address masking needed here: this list only contains RSVP'd events.
        return {
          ...event,
          band,
          venue,
          rsvpedAt: rsvp.createdAt,
        };
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
 * @returns Array of past event documents with band, venue, rsvpedAt, and attendance status
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
        if (!isPublicEvent(event)) return null;
        // Only include past events
        if (event.dateTime >= now) return null;

        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);
        // No address masking needed here: this list only contains RSVP'd events.
        return {
          ...event,
          band,
          venue,
          rsvpedAt: rsvp.createdAt,
          attendanceStatus: getAttendanceStatus(rsvp),
          attendedAt: rsvp.attendedAt,
        };
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
    const viewerContext = await buildViewerContext(ctx);
    const userId = viewerContext.userId;
    if (!userId) {
      return [];
    }

    const likes = await ctx.db
      .query("likes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const eventsWithDetails = await Promise.all(
      likes.map(async (like) => {
        if (viewerContext.rsvpEventIds.has(like.eventId)) return null; // Exclude RSVP'd events

        const event = await ctx.db.get(like.eventId);
        if (!event) return null;
        if (!isPublicEvent(event)) return null;

        const band = await ctx.db.get(event.bandId);
        const venue = await ctx.db.get(event.venueId);
        return applyAddressMask(
          { ...event, band, venue, likedAt: like.createdAt },
          viewerContext
        );
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
    const event = await ctx.db.get(args.eventId);
    if (!event || !isPublicEvent(event)) {
      return { hasRsvp: false, hasLiked: false };
    }

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
 * Guest list summary for band workspace event management.
 * Returns preview guests for card rendering and capability flags.
 */
export const getEventGuestListSummary = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId);

    if (!access.canViewGuestList) {
      throw new Error("Not authorized for this band");
    }

    const previewRsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(GUEST_LIST_PREVIEW_LIMIT);

    const previewGuests = (
      await Promise.all(
        previewRsvps.map(async (rsvp) => {
          const user = await ctx.db.get(rsvp.userId);
          if (!user) return null;

          return {
            rsvpId: rsvp._id,
            userId: user._id,
            name: user.name,
            avatar: user.avatar,
            rsvpType: getAttendanceStatus(rsvp),
          };
        })
      )
    ).filter((guest): guest is NonNullable<typeof guest> => guest !== null);

    return {
      totalCount: access.event.rsvpCount,
      previewGuests,
      canManage: access.canManageGuestList,
    };
  },
});

/**
 * Lists guests for an event guest-management panel.
 * Filters and search are applied within a capped RSVP set for safety.
 * Uses latest 501 RSVP rows to detect truncation and returns at most 500 rows.
 */
export const listEventGuests = query({
  args: {
    eventId: v.id("events"),
    rsvpType: v.optional(guestFilterTypeValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId);
    if (!access.canViewGuestList) {
      throw new Error("Not authorized for this band");
    }

    const filterType = args.rsvpType ?? "all";
    const searchQuery = args.search?.trim().toLowerCase() ?? "";
    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(GUEST_LIST_CAP + 1);

    const capReached = rsvps.length > GUEST_LIST_CAP;
    const cappedRsvps = capReached ? rsvps.slice(0, GUEST_LIST_CAP) : rsvps;

    const guestsWithUsers = await Promise.all(
      cappedRsvps.map(async (rsvp) => {
        const user = await ctx.db.get(rsvp.userId);
        if (!user) return null;

        const rsvpType = getAttendanceStatus(rsvp);

        return {
          rsvpId: rsvp._id,
          userId: user._id,
          name: user.name,
          avatar: user.avatar,
          rsvpType,
          rsvpedAt: rsvp.createdAt,
          attendedAt: rsvp.attendedAt,
        };
      })
    );

    const guests = guestsWithUsers
      .filter((guest): guest is NonNullable<typeof guest> => guest !== null)
      .filter((guest) => {
        if (filterType !== "all" && guest.rsvpType !== filterType) {
          return false;
        }

        if (!searchQuery) {
          return true;
        }

        return guest.name.toLowerCase().includes(searchQuery);
      })
      .sort((a, b) => b.rsvpedAt - a.rsvpedAt);

    return {
      guests,
      capReached,
      cap: GUEST_LIST_CAP,
      totalCount: access.event.rsvpCount,
      canManage: access.canManageGuestList,
    };
  },
});

/**
 * Sets attendance status for an RSVP'd guest.
 * Only band owners/admins can modify attendance.
 */
export const setEventGuestAttendance = mutation({
  args: {
    eventId: v.id("events"),
    rsvpId: v.id("rsvps"),
    attended: v.boolean(),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId);
    if (!access.canManageGuestList) {
      throw new Error("Not authorized for this band");
    }

    const rsvp = await ctx.db.get(args.rsvpId);
    if (!rsvp) {
      throw new Error("RSVP not found");
    }

    if (rsvp.eventId !== args.eventId) {
      throw new Error("RSVP does not belong to this event");
    }

    const currentStatus = getAttendanceStatus(rsvp);
    const nextStatus: GuestRsvpType = args.attended ? "attended" : "on_list";

    if (currentStatus === nextStatus) {
      return { changed: false, rsvpType: currentStatus };
    }

    if (nextStatus === "attended") {
      await ctx.db.patch(args.rsvpId, {
        attendanceStatus: "attended",
        attendedAt: Date.now(),
      });
      await incrementShowsAttended(ctx, rsvp.userId);
    } else {
      await ctx.db.patch(args.rsvpId, {
        attendanceStatus: "on_list",
        attendedAt: undefined,
      });
      await decrementShowsAttended(ctx, rsvp.userId);
    }

    return {
      changed: true,
      rsvpType: nextStatus,
    };
  },
});

/**
 * Removes a guest RSVP from an event.
 * Only band owners/admins can remove guests.
 */
export const removeEventGuestRsvp = mutation({
  args: {
    eventId: v.id("events"),
    rsvpId: v.id("rsvps"),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId);
    if (!access.canManageGuestList) {
      throw new Error("Not authorized for this band");
    }

    const rsvp = await ctx.db.get(args.rsvpId);
    if (!rsvp) {
      throw new Error("RSVP not found");
    }

    if (rsvp.eventId !== args.eventId) {
      throw new Error("RSVP does not belong to this event");
    }

    if (getAttendanceStatus(rsvp) === "attended") {
      await decrementShowsAttended(ctx, rsvp.userId);
    }

    await ctx.db.delete(args.rsvpId);

    await ctx.db.patch(access.event._id, {
      rsvpCount: Math.max(0, access.event.rsvpCount - 1),
    });

    return {
      action: "removed",
      eventId: args.eventId,
      rsvpId: args.rsvpId,
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
    const viewerContext = await buildViewerContext(ctx);

    // Get all upcoming events
    let events = await ctx.db
      .query("events")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("dateTime"), now))
      .take(200);

    events = events.filter((event): event is PublicEvent => isPublicEvent(event));

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
        if (!event.venueId) {
          return null;
        }

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

        const maskedEvent = applyAddressMask(
          {
            ...event,
            band,
            venue,
          },
          viewerContext
        );

        return {
          ...maskedEvent,
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
    title: v.optional(v.string()),
    bandId: v.id("bands"),
    venueId: v.optional(v.id("venues")),
    dateTime: v.optional(v.number()),
    image: v.optional(v.string()),
    capacity: v.optional(v.number()),
    price: v.optional(v.number()),
    description: v.optional(v.string()),
    genres: v.optional(v.array(genreValidator)), // Multiple genres
    genre: v.optional(genreValidator), // Legacy field for backward compatibility
    status: v.optional(eventStatusValidator),
    addressVisibility: v.optional(eventAddressVisibilityValidator),
  },
  handler: async (ctx, args) => {
    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const status = args.status ?? "confirmed";
    const genres = args.genres ?? (args.genre ? [args.genre] : undefined);

    if (isPublic(status)) {
      validateConfirmedEventPayload({
        title: args.title,
        dateTime: args.dateTime,
        capacity: args.capacity,
        genres,
        venueId: args.venueId,
      });
    }

    const eventId = await ctx.db.insert("events", {
      title: args.title,
      bandId: args.bandId,
      venueId: args.venueId,
      dateTime: args.dateTime,
      image: args.image,
      capacity: args.capacity,
      price: args.price,
      description: args.description,
      genres,
      genre: args.genre ?? genres?.[0],
      rsvpCount: 0,
      status,
      addressVisibility: args.addressVisibility ?? "public",
    });

    // Notify fans only when a gig is publicly confirmed.
    if (isPublic(status) && args.venueId) {
      await ctx.scheduler.runAfter(0, internal.notifications.createNearbyEventNotifications, {
        eventId,
        venueId: args.venueId,
        bandId: args.bandId,
      });
    }

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
    title: v.optional(v.string()),
    bandId: v.id("bands"),
    dateTime: v.optional(v.number()),
    genres: v.optional(v.array(genreValidator)), // Multiple genres
    genre: v.optional(genreValidator), // Legacy field for backward compatibility
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    venueCity: v.optional(v.string()),
    venueCoordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    venuePlaceId: v.optional(v.string()),
    image: v.optional(v.string()),
    capacity: v.optional(v.number()),
    price: v.optional(v.number()),
    description: v.optional(v.string()),
    status: v.optional(eventStatusValidator),
    addressVisibility: v.optional(eventAddressVisibilityValidator),
  },
  handler: async (ctx, args) => {
    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const status = args.status ?? "confirmed";
    const genres = args.genres ?? (args.genre ? [args.genre] : undefined);
    const hasVenueInput = hasCompleteVenueInput(args);

    if (isPublic(status)) {
      validateConfirmedEventPayload({
        title: args.title,
        dateTime: args.dateTime,
        capacity: args.capacity,
        genres,
        venueName: args.venueName,
        venueAddress: args.venueAddress,
        venueCity: args.venueCity,
        venueCoordinates: args.venueCoordinates,
      });
    }

    let venueId: Id<"venues"> | undefined;
    if (hasVenueInput) {
      venueId = await findOrCreateVenueByLocation(ctx, {
        venueName: args.venueName,
        venueAddress: args.venueAddress,
        venueCity: args.venueCity,
        venueCoordinates: args.venueCoordinates,
        capacity: args.capacity,
      });
    }

    // Create the event
    const eventId = await ctx.db.insert("events", {
      title: args.title,
      bandId: args.bandId,
      venueId,
      dateTime: args.dateTime,
      image: args.image,
      capacity: args.capacity,
      price: args.price,
      description: args.description,
      genres,
      genre: args.genre ?? genres?.[0],
      rsvpCount: 0,
      status,
      addressVisibility: args.addressVisibility ?? "public",
    });

    // Notify fans only when a gig is publicly confirmed.
    if (isPublic(status) && venueId) {
      await ctx.scheduler.runAfter(0, internal.notifications.createNearbyEventNotifications, {
        eventId,
        venueId,
        bandId: args.bandId,
      });
    }

    return { eventId, venueId };
  },
});

/**
 * Updates an existing event and optionally reassigns/creates its venue.
 * Only band owners/admins can update events for their band.
 *
 * Venue updates are optional as a group:
 * - If no venue fields are provided, keep existing venueId.
 * - If any venue field is provided, all required venue fields must be provided.
 */
export const updateWithVenue = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    dateTime: v.optional(v.number()),
    image: v.optional(v.string()),
    capacity: v.optional(v.number()),
    price: v.optional(v.number()),
    description: v.optional(v.string()),
    genres: v.optional(v.array(genreValidator)),
    genre: v.optional(genreValidator),
    status: v.optional(eventStatusValidator),
    addressVisibility: v.optional(eventAddressVisibilityValidator),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    venueCity: v.optional(v.string()),
    venueCoordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    venuePlaceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await requireBandRole(ctx, event.bandId, ["owner", "admin"]);

    if (args.capacity !== undefined && args.capacity < event.rsvpCount) {
      throw new Error(
        `Cannot reduce capacity below current RSVP count (${event.rsvpCount}).`
      );
    }

    const nextStatus = args.status ?? event.status;
    const hasAnyVenueUpdate =
      args.venueName !== undefined ||
      args.venueAddress !== undefined ||
      args.venueCity !== undefined ||
      args.venueCoordinates !== undefined ||
      args.venuePlaceId !== undefined;
    const hasCompleteVenueUpdate = hasCompleteVenueInput(args);

    let venueId = event.venueId;

    if (hasAnyVenueUpdate) {
      if (hasCompleteVenueUpdate) {
        venueId = await findOrCreateVenueByLocation(ctx, {
          venueName: args.venueName,
          venueAddress: args.venueAddress,
          venueCity: args.venueCity,
          venueCoordinates: args.venueCoordinates,
          capacity: args.capacity ?? event.capacity,
        });
      } else if (isPublic(nextStatus)) {
        throw new Error("Confirmed gigs require a complete venue selection.");
      }
      // Tentative saves accept partial venue input, but only complete venue
      // payloads can be persisted as a concrete venue reference.
    }

    const nextGenres = (() => {
      if (args.genres !== undefined) {
        return args.genres;
      }
      if (args.genre !== undefined) {
        return [args.genre];
      }
      if (event.genres && event.genres.length > 0) {
        return event.genres;
      }
      if (event.genre) {
        return [event.genre];
      }
      return undefined;
    })();

    const nextTitle = args.title !== undefined ? args.title : event.title;
    const nextDateTime = args.dateTime !== undefined ? args.dateTime : event.dateTime;
    const nextCapacity = args.capacity !== undefined ? args.capacity : event.capacity;

    if (isPublic(nextStatus)) {
      validateConfirmedEventPayload({
        title: nextTitle,
        dateTime: nextDateTime,
        capacity: nextCapacity,
        genres: nextGenres,
        venueId,
      });
    }

    const updates: Partial<Doc<"events">> = {};
    if (venueId !== event.venueId) {
      updates.venueId = venueId;
    }

    if (args.title !== undefined) updates.title = args.title;
    if (args.dateTime !== undefined) updates.dateTime = args.dateTime;
    if (args.image !== undefined) updates.image = args.image;
    if (args.capacity !== undefined) updates.capacity = args.capacity;
    if (args.price !== undefined) updates.price = args.price;
    if (args.description !== undefined) updates.description = args.description;
    if (args.genres !== undefined) {
      updates.genres = args.genres;
      if (args.genre === undefined && args.genres.length > 0) {
        updates.genre = args.genres[0];
      }
    }
    if (args.genre !== undefined) updates.genre = args.genre;
    if (args.status !== undefined) updates.status = args.status;
    if (args.addressVisibility !== undefined) {
      updates.addressVisibility = args.addressVisibility;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.eventId, updates);
    }

    if (isTentative(event.status) && isPublic(nextStatus) && venueId) {
      await ctx.scheduler.runAfter(0, internal.notifications.createNearbyEventNotifications, {
        eventId: args.eventId,
        venueId,
        bandId: event.bandId,
      });
    }

    return { eventId: args.eventId, venueId };
  },
});

/**
 * Deletes a tentative gig owned by the current band's owner/admin.
 * This is intentionally restricted to tentative gigs only.
 */
export const deleteTentative = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await requireBandRole(ctx, event.bandId, ["owner", "admin"]);

    if (!isTentative(event.status)) {
      throw new Error("Only tentative gigs can be deleted.");
    }

    // Defensive cleanup in case legacy data exists.
    const [likes, rsvps] = await Promise.all([
      ctx.db
        .query("likes")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect(),
      ctx.db
        .query("rsvps")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect(),
    ]);

    await Promise.all([
      ...likes.map((like) => ctx.db.delete(like._id)),
      ...rsvps.map((rsvp) => ctx.db.delete(rsvp._id)),
    ]);

    await ctx.db.delete(args.eventId);

    return { eventId: args.eventId };
  },
});
