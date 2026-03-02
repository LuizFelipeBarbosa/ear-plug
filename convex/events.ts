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
  getAuthenticatedUserOrNull,
  requireAuthenticatedUser,
  requireBandMember,
  requireBandRole,
} from "./utils/permissions";
import {
  createCohostInvitesForEvent,
  getAcceptedCohostBandIds,
  getParticipatingBandIdsForEvent,
} from "./eventCohosts";
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
type EventTicketStatus = "active" | "used" | "revoked";
type EventCheckinRole = "manager" | "staff";
type EventTicketScanStatus = "checked_in" | "already_used" | "revoked" | "invalid";

const guestFilterTypeValidator = v.union(
  v.literal("all"),
  v.literal("on_list"),
  v.literal("attended")
);

const MASKED_VENUE_ADDRESS = "Address revealed after RSVP";
const GUEST_LIST_PREVIEW_LIMIT = 6;
const GUEST_LIST_CAP = 500;
const TICKET_QR_PREFIX = "EPT1";
const CHECKIN_STAFF_REVOKE_REASON = "event_staff_revoked";
const RSVP_CANCEL_REVOKE_REASON = "rsvp_cancelled";
const GUEST_REMOVED_REVOKE_REASON = "guest_removed";

interface ViewerContext {
  userId: Id<"users"> | null;
  memberBandIds: Set<Id<"bands">>;
  rsvpEventIds: Set<Id<"events">>;
  cohostEventIds: Set<Id<"events">>;
}

interface EventBandAccess {
  event: Doc<"events">;
  membership: Doc<"bandMemberships">;
  canViewGuestList: boolean;
  canManageGuestList: boolean;
}

interface EventCheckinAccess {
  event: Doc<"events">;
  user: Doc<"users">;
  role: EventCheckinRole | null;
  canScan: boolean;
  canManageStaff: boolean;
  managerBandIds: Id<"bands">[];
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

type EventHydrationCtx = QueryCtx | MutationCtx;
type EventWithBandVenue = PublicEvent & {
  band: Doc<"bands"> | null;
  venue: Doc<"venues"> | null;
};

interface EventHydrationCache {
  bands: Map<Id<"bands">, Doc<"bands"> | null>;
  venues: Map<Id<"venues">, Doc<"venues"> | null>;
}

function createEventHydrationCache(): EventHydrationCache {
  return {
    bands: new Map(),
    venues: new Map(),
  };
}

async function getBandFromCache(
  ctx: EventHydrationCtx,
  cache: EventHydrationCache,
  bandId: Id<"bands">
) {
  if (!cache.bands.has(bandId)) {
    const band = await ctx.db.get(bandId);
    cache.bands.set(bandId, band);
  }
  return cache.bands.get(bandId) ?? null;
}

async function getVenueFromCache(
  ctx: EventHydrationCtx,
  cache: EventHydrationCache,
  venueId: Id<"venues">
) {
  if (!cache.venues.has(venueId)) {
    const venue = await ctx.db.get(venueId);
    cache.venues.set(venueId, venue);
  }
  return cache.venues.get(venueId) ?? null;
}

async function hydratePublicEvent(
  ctx: EventHydrationCtx,
  event: PublicEvent,
  cache: EventHydrationCache
): Promise<EventWithBandVenue> {
  const [band, venue] = await Promise.all([
    getBandFromCache(ctx, cache, event.bandId),
    getVenueFromCache(ctx, cache, event.venueId),
  ]);

  return {
    ...event,
    band,
    venue,
  };
}

async function listUpcomingPublicEvents(
  ctx: QueryCtx,
  options: { limit: number; scanLimit?: number }
) {
  const scanLimit = Math.max(
    options.limit,
    Math.min(options.scanLimit ?? options.limit * 4, 500)
  );
  const now = Date.now();

  const events = await ctx.db
    .query("events")
    .withIndex("by_status_date", (q) =>
      q.eq("status", "confirmed").gte("dateTime", now)
    )
    .take(scanLimit);

  return events.filter((event): event is PublicEvent => isPublicEvent(event));
}

function eventMatchesGenre(
  event: Pick<Doc<"events">, "genres" | "genre">,
  genre: NonNullable<Doc<"events">["genre"]>
) {
  if (event.genres && event.genres.length > 0) {
    return event.genres.includes(genre);
  }
  return event.genre === genre;
}

function sortEventsByDate<T extends { dateTime: number }>(
  events: T[],
  direction: "asc" | "desc"
) {
  return events.sort((a, b) =>
    direction === "asc" ? a.dateTime - b.dateTime : b.dateTime - a.dateTime
  );
}

function buildTicketQrValue(token: string): string {
  return `${TICKET_QR_PREFIX}:${token}`;
}

function parseTicketQrValue(value: string): string | null {
  const trimmed = value.trim();
  const prefix = `${TICKET_QR_PREFIX}:`;
  if (!trimmed.startsWith(prefix)) {
    return null;
  }

  const token = trimmed.slice(prefix.length).trim();
  if (!token || token.length < 16) {
    return null;
  }

  return token;
}

function formatTicketCode(token: string): string {
  return token.slice(0, 8).toUpperCase();
}

function generateTicketTokenCandidate(): string {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

async function generateUniqueTicketToken(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = generateTicketTokenCandidate();
    const existing = await ctx.db
      .query("eventTickets")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!existing) {
      return token;
    }
  }

  throw new Error("Unable to generate ticket token");
}

async function findTicketByRsvpId(
  ctx: QueryCtx | MutationCtx,
  rsvpId: Id<"rsvps">
) {
  return await ctx.db
    .query("eventTickets")
    .withIndex("by_rsvp", (q) => q.eq("rsvpId", rsvpId))
    .unique();
}

async function createTicketForRsvp(
  ctx: MutationCtx,
  rsvp: Pick<Doc<"rsvps">, "_id" | "eventId" | "userId">,
  status: EventTicketStatus = "active",
  issuedAt: number = Date.now(),
  usedByUserId?: Id<"users">
): Promise<Id<"eventTickets">> {
  const token = await generateUniqueTicketToken(ctx);
  return await ctx.db.insert("eventTickets", {
    eventId: rsvp.eventId,
    rsvpId: rsvp._id,
    userId: rsvp.userId,
    token,
    status,
    issuedAt,
    usedAt: status === "used" ? issuedAt : undefined,
    usedByUserId: status === "used" ? usedByUserId : undefined,
  });
}

async function ensureTicketForRsvp(
  ctx: MutationCtx,
  rsvp: Pick<Doc<"rsvps">, "_id" | "eventId" | "userId">
) {
  const existingTicket = await findTicketByRsvpId(ctx, rsvp._id);
  if (existingTicket) {
    return existingTicket;
  }

  const ticketId = await createTicketForRsvp(ctx, rsvp);
  const ticket = await ctx.db.get(ticketId);
  if (!ticket) {
    throw new Error("Ticket not found after creation");
  }
  return ticket;
}

async function revokeActiveTicketForRsvp(
  ctx: MutationCtx,
  rsvpId: Id<"rsvps">,
  reason: string
): Promise<void> {
  const ticket = await findTicketByRsvpId(ctx, rsvpId);
  if (!ticket || ticket.status !== "active") {
    return;
  }

  await ctx.db.patch(ticket._id, {
    status: "revoked",
    revokedAt: Date.now(),
    revokedReason: reason,
  });
}

async function markTicketUsedForRsvp(
  ctx: MutationCtx,
  rsvp: Pick<Doc<"rsvps">, "_id" | "eventId" | "userId">,
  usedByUserId: Id<"users">
): Promise<EventTicketStatus> {
  const ticket = await findTicketByRsvpId(ctx, rsvp._id);
  const usedAt = Date.now();

  if (!ticket) {
    await createTicketForRsvp(ctx, rsvp, "used", usedAt, usedByUserId);
    return "used";
  }

  if (ticket.status === "active") {
    await ctx.db.patch(ticket._id, {
      status: "used",
      usedAt,
      usedByUserId,
    });
    return "used";
  }

  return ticket.status;
}

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
  const user = await getAuthenticatedUserOrNull(ctx);
  if (!user) {
    return {
      userId: null,
      memberBandIds: new Set<Id<"bands">>(),
      rsvpEventIds: new Set<Id<"events">>(),
      cohostEventIds: new Set<Id<"events">>(),
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

  const memberBandIds = new Set(memberships.map((membership) => membership.bandId));
  const acceptedCohostInvites = await Promise.all(
    [...memberBandIds].map((bandId) =>
      ctx.db
        .query("eventCohostInvites")
        .withIndex("by_invited_band_status", (q) =>
          q.eq("invitedBandId", bandId).eq("status", "accepted")
        )
        .collect()
    )
  );
  const cohostEventIds = new Set(
    acceptedCohostInvites
      .flat()
      .map((invite) => invite.eventId)
  );

  return {
    userId: user._id,
    memberBandIds,
    rsvpEventIds: new Set(rsvps.map((rsvp) => rsvp.eventId)),
    cohostEventIds,
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

  if (viewerContext.cohostEventIds.has(event._id)) {
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
  eventId: Id<"events">,
  bandId: Id<"bands">
): Promise<EventBandAccess> {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  const user = await requireAuthenticatedUser(ctx);
  const membership = await ctx.db
    .query("bandMemberships")
    .withIndex("by_band_user", (q) =>
      q.eq("bandId", bandId).eq("userId", user._id)
    )
    .unique();

  if (!membership) {
    throw new Error("Not authorized for this active band workspace");
  }

  const participatingBandIds = await getParticipatingBandIdsForEvent(ctx, event);
  if (!participatingBandIds.includes(bandId)) {
    throw new Error("Not authorized for this event");
  }

  return {
    event,
    membership,
    canViewGuestList: true,
    canManageGuestList:
      membership.role === "owner" || membership.role === "admin",
  };
}

async function resolveEventCheckinAccess(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">
): Promise<EventCheckinAccess> {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  const user = await requireAuthenticatedUser(ctx);
  const participatingBandIds = await getParticipatingBandIdsForEvent(ctx, event);
  const memberships = await ctx.db
    .query("bandMemberships")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();

  const managerBandIds = memberships
    .filter(
      (membership) =>
        participatingBandIds.includes(membership.bandId) &&
        (membership.role === "owner" || membership.role === "admin")
    )
    .map((membership) => membership.bandId);

  if (managerBandIds.length > 0) {
    return {
      event,
      user,
      role: "manager",
      canScan: true,
      canManageStaff: true,
      managerBandIds,
    };
  }

  const staffAssignment = await ctx.db
    .query("eventCheckinStaff")
    .withIndex("by_event_user", (q) =>
      q.eq("eventId", eventId).eq("userId", user._id)
    )
    .unique();

  if (staffAssignment?.status === "active") {
    return {
      event,
      user,
      role: "staff",
      canScan: true,
      canManageStaff: false,
      managerBandIds: [],
    };
  }

  return {
    event,
    user,
    role: null,
    canScan: false,
    canManageStaff: false,
    managerBandIds: [],
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
    const limit = args.limit || 50;
    const viewerContext = await buildViewerContext(ctx);
    const cache = createEventHydrationCache();
    const events = (await listUpcomingPublicEvents(ctx, { limit, scanLimit: limit * 4 })).slice(
      0,
      limit
    );

    return await Promise.all(
      events.map(async (event) =>
        applyAddressMask(await hydratePublicEvent(ctx, event, cache), viewerContext)
      )
    );
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
    const limit = args.limit || 50;
    const viewerContext = await buildViewerContext(ctx);
    const cache = createEventHydrationCache();
    const filteredEvents = (
      await listUpcomingPublicEvents(ctx, {
        limit,
        scanLimit: Math.max(limit * 8, 250),
      })
    )
      .filter((event) => eventMatchesGenre(event, args.genre))
      .slice(0, limit);

    return await Promise.all(
      filteredEvents.map(async (event) =>
        applyAddressMask(await hydratePublicEvent(ctx, event, cache), viewerContext)
      )
    );
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

    const [band, acceptedCohostBandIds] = await Promise.all([
      ctx.db.get(event.bandId),
      getAcceptedCohostBandIds(ctx, event._id),
    ]);
    const cohostBands = (
      await Promise.all(acceptedCohostBandIds.map((bandId) => ctx.db.get(bandId)))
    ).filter((cohostBand): cohostBand is NonNullable<typeof cohostBand> => cohostBand !== null);
    const lineupBands = band ? [band, ...cohostBands] : cohostBands;
    const venue = await ctx.db.get(event.venueId);

    return applyAddressMask(
      {
        ...event,
        band,
        cohostBands,
        lineupBands,
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

    const [hostedEvents, acceptedCohostInvites] = await Promise.all([
      ctx.db
        .query("events")
        .withIndex("by_band", (q) => q.eq("bandId", args.bandId))
        .collect(),
      ctx.db
        .query("eventCohostInvites")
        .withIndex("by_invited_band_status", (q) =>
          q.eq("invitedBandId", args.bandId).eq("status", "accepted")
        )
        .collect(),
    ]);

    const hostedById = new Map(hostedEvents.map((event) => [event._id, event]));
    const cohostedEventIds = Array.from(
      new Set(acceptedCohostInvites.map((invite) => invite.eventId))
    );
    const cohostedEvents = (
      await Promise.all(cohostedEventIds.map((eventId) => ctx.db.get(eventId)))
    ).filter((event): event is NonNullable<typeof event> => event !== null);

    const mergedEvents = [
      ...hostedEvents,
      ...cohostedEvents.filter((event) => !hostedById.has(event._id)),
    ];

    let events = mergedEvents;
    if (!args.includesPast) {
      events = mergedEvents.filter((e) => e.dateTime === undefined || e.dateTime >= now);
    }

    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const venue = event.venueId ? await ctx.db.get(event.venueId) : null;
        return {
          ...event,
          venue,
          participationRole: event.bandId === args.bandId ? "host" : "cohost",
        };
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
    const viewerContext = await buildViewerContext(ctx);
    const cache = createEventHydrationCache();
    const events = await listUpcomingPublicEvents(ctx, {
      limit,
      scanLimit: Math.max(limit * 10, 250),
    });

    const hydrated = await Promise.all(
      events.map((event) => hydratePublicEvent(ctx, event, cache))
    );

    const filtered = hydrated
      .filter((event) => {
        const titleMatch = event.title.toLowerCase().includes(searchQuery);
        const bandMatch = event.band?.name.toLowerCase().includes(searchQuery);
        const venueMatch = event.venue?.name.toLowerCase().includes(searchQuery);
        return titleMatch || bandMatch || venueMatch;
      })
      .slice(0, limit);

    return filtered.map((event) => applyAddressMask(event, viewerContext));
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
    const user = await requireAuthenticatedUser(ctx);

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

      await revokeActiveTicketForRsvp(ctx, existingRsvp._id, RSVP_CANCEL_REVOKE_REASON);

      // Remove RSVP
      await ctx.db.delete(existingRsvp._id);

      // Decrement RSVP count
      await ctx.db.patch(args.eventId, {
        rsvpCount: Math.max(0, event.rsvpCount - 1),
      });

      return { action: "removed" };
    }

    // Check capacity before adding RSVP
    if (event.capacity && event.rsvpCount >= event.capacity) {
      throw new Error("This event is at capacity.");
    }

    // Add RSVP
    const rsvpId = await ctx.db.insert("rsvps", {
      userId: user._id,
      eventId: args.eventId,
      createdAt: Date.now(),
      attendanceStatus: "on_list",
    });

    await createTicketForRsvp(ctx, {
      _id: rsvpId,
      eventId: args.eventId,
      userId: user._id,
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
    const user = await requireAuthenticatedUser(ctx);

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

async function listUserRsvpEventsWithDetails(
  ctx: QueryCtx,
  userId: Id<"users">,
  options: { pastOnly: boolean }
) {
  const now = Date.now();
  const rsvps = await ctx.db
    .query("rsvps")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const cache = createEventHydrationCache();

  const eventsWithDetails = await Promise.all(
    rsvps.map(async (rsvp) => {
      const event = await ctx.db.get(rsvp.eventId);
      if (!event || !isPublicEvent(event)) {
        return null;
      }

      if (options.pastOnly ? event.dateTime >= now : event.dateTime < now) {
        return null;
      }

      const hydrated = await hydratePublicEvent(ctx, event, cache);
      if (options.pastOnly) {
        return {
          ...hydrated,
          rsvpedAt: rsvp.createdAt,
          attendanceStatus: getAttendanceStatus(rsvp),
          attendedAt: rsvp.attendedAt,
        };
      }

      return {
        ...hydrated,
        rsvpedAt: rsvp.createdAt,
      };
    })
  );

  const filtered = eventsWithDetails.filter(
    (event): event is NonNullable<typeof event> => event !== null
  );
  return sortEventsByDate(filtered, options.pastOnly ? "desc" : "asc");
}

async function listUserLikedEventsWithDetails(
  ctx: QueryCtx,
  userId: Id<"users">,
  viewerContext: ViewerContext
) {
  const likes = await ctx.db
    .query("likes")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const cache = createEventHydrationCache();

  const eventsWithDetails = await Promise.all(
    likes.map(async (like) => {
      if (viewerContext.rsvpEventIds.has(like.eventId)) {
        return null;
      }

      const event = await ctx.db.get(like.eventId);
      if (!event || !isPublicEvent(event)) {
        return null;
      }

      const hydrated = await hydratePublicEvent(ctx, event, cache);
      return applyAddressMask(
        {
          ...hydrated,
          likedAt: like.createdAt,
        },
        viewerContext
      );
    })
  );

  const filtered = eventsWithDetails.filter(
    (event): event is NonNullable<typeof event> => event !== null
  );
  return sortEventsByDate(filtered, "asc");
}

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
    const user = await getAuthenticatedUserOrNull(ctx);
    if (!user) {
      return [];
    }
    return await listUserRsvpEventsWithDetails(ctx, user._id, { pastOnly: false });
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
    const user = await getAuthenticatedUserOrNull(ctx);
    if (!user) {
      return [];
    }
    return await listUserRsvpEventsWithDetails(ctx, user._id, { pastOnly: true });
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
    return await listUserLikedEventsWithDetails(ctx, userId, viewerContext);
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

    const user = await getAuthenticatedUserOrNull(ctx);
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
 * Returns ticket payload for the current RSVP'd user.
 * Includes QR payload for active tickets and lifecycle metadata.
 */
export const getMyEventTicket = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUserOrNull(ctx);
    if (!user) {
      return null;
    }

    const event = await ctx.db.get(args.eventId);
    if (!event || !isPublicEvent(event)) {
      return null;
    }

    const rsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (!rsvp) {
      return null;
    }

    const [ticket, venue] = await Promise.all([
      findTicketByRsvpId(ctx, rsvp._id),
      ctx.db.get(event.venueId),
    ]);

    return {
      eventId: event._id,
      eventTitle: event.title,
      eventDateTime: event.dateTime,
      attendeeName: user.name,
      venue: venue
        ? {
            name: venue.name,
            address: venue.address,
            city: venue.city,
          }
        : null,
      requiresTicketBootstrap: !ticket,
      ticket: ticket
        ? {
            ticketId: ticket._id,
            status: ticket.status,
            issuedAt: ticket.issuedAt,
            usedAt: ticket.usedAt,
            revokedAt: ticket.revokedAt,
            ticketCode: formatTicketCode(ticket.token),
            qrValue:
              ticket.status === "active"
                ? buildTicketQrValue(ticket.token)
                : undefined,
          }
        : null,
    };
  },
});

/**
 * Creates a missing ticket for legacy RSVP rows.
 * Safe to call repeatedly: creates at most one ticket per RSVP.
 */
export const ensureMyEventTicket = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event || !isPublicEvent(event)) {
      throw new Error("This gig is not available.");
    }

    const rsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (!rsvp) {
      throw new Error("RSVP not found");
    }

    const ticket = await ensureTicketForRsvp(ctx, rsvp);
    return {
      action: ticket.status === "active" ? "ready" : "restored",
      ticketId: ticket._id,
      status: ticket.status,
    };
  },
});

/**
 * Check-in access for scanner surfaces.
 */
export const getEventCheckinAccess = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const access = await resolveEventCheckinAccess(ctx, args.eventId);
    return {
      canScan: access.canScan,
      canManageStaff: access.canManageStaff,
      role: access.role,
      managerBandIds: access.managerBandIds,
    };
  },
});

/**
 * Lists active event check-in staff assignments.
 * Manager-only endpoint.
 */
export const listEventCheckinStaff = query({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
    if (!access.canManageGuestList) {
      throw new Error("Not authorized for this band");
    }

    const staffRows = await ctx.db
      .query("eventCheckinStaff")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", args.eventId).eq("status", "active")
      )
      .collect();

    const staff = (
      await Promise.all(
        staffRows.map(async (row) => {
          const user = await ctx.db.get(row.userId);
          if (!user) return null;

          return {
            userId: user._id,
            name: user.name,
            avatar: user.avatar,
            assignedAt: row.createdAt,
            assignedByBandId: row.assignedByBandId,
          };
        })
      )
    )
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.assignedAt - a.assignedAt);

    return { staff };
  },
});

/**
 * Searches platform users assignable as event check-in staff.
 * Manager-only endpoint.
 */
export const searchAssignableEventCheckinUsers = query({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
    if (!access.canManageGuestList) {
      throw new Error("Not authorized for this band");
    }

    const normalizedQuery = args.query.trim().toLowerCase();
    if (normalizedQuery.length < 2) {
      return { users: [] };
    }

    const limit = Math.min(Math.max(Math.floor(args.limit ?? 8), 1), 20);
    const [users, activeStaffRows] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db
        .query("eventCheckinStaff")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", args.eventId).eq("status", "active")
        )
        .collect(),
    ]);

    const activeStaffUserIds = new Set(activeStaffRows.map((row) => row.userId));

    const matched = users
      .filter((user) =>
        user.name.trim().toLowerCase().includes(normalizedQuery)
      )
      .sort((a, b) => {
        const aName = a.name.trim();
        const bName = b.name.trim();
        const aLower = aName.toLowerCase();
        const bLower = bName.toLowerCase();
        const aStarts = aLower.startsWith(normalizedQuery);
        const bStarts = bLower.startsWith(normalizedQuery);

        if (aStarts !== bStarts) {
          return aStarts ? -1 : 1;
        }

        const byName = aName.localeCompare(bName, "en-US", {
          sensitivity: "base",
        });
        if (byName !== 0) {
          return byName;
        }

        return a.email.localeCompare(b.email, "en-US", {
          sensitivity: "base",
        });
      })
      .slice(0, limit)
      .map((user) => ({
        userId: user._id,
        name: user.name,
        avatar: user.avatar,
        alreadyAssigned: activeStaffUserIds.has(user._id),
      }));

    return { users: matched };
  },
});

/**
 * Assigns an existing user as event check-in staff by user ID.
 * Manager-only endpoint.
 */
export const assignEventCheckinStaff = mutation({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
    staffUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
    if (!access.canManageGuestList) {
      throw new Error("Not authorized for this band");
    }

    const targetUser = await ctx.db.get(args.staffUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    const existing = await ctx.db
      .query("eventCheckinStaff")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.staffUserId)
      )
      .unique();

    if (existing?.status === "active") {
      return {
        action: "already_active",
        staffUserId: args.staffUserId,
      };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "active",
        assignedByUserId: access.membership.userId,
        assignedByBandId: args.bandId,
        revokedAt: undefined,
      });
      return {
        action: "reassigned",
        staffUserId: args.staffUserId,
      };
    }

    await ctx.db.insert("eventCheckinStaff", {
      eventId: args.eventId,
      userId: args.staffUserId,
      status: "active",
      assignedByUserId: access.membership.userId,
      assignedByBandId: args.bandId,
      createdAt: Date.now(),
    });

    return {
      action: "assigned",
      staffUserId: args.staffUserId,
    };
  },
});

/**
 * Assigns an existing user as event check-in staff.
 * Manager-only endpoint.
 */
export const assignEventCheckinStaffByEmail = mutation({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
    email: v.string(),
  },
  handler: async () => {
    throw new Error(
      "Assigning check-in staff by email is disabled. Search and select a user instead."
    );
  },
});

/**
 * Revokes event check-in staff assignment.
 * Manager-only endpoint.
 */
export const removeEventCheckinStaff = mutation({
  args: {
    eventId: v.id("events"),
    bandId: v.id("bands"),
    staffUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
    if (!access.canManageGuestList) {
      throw new Error("Not authorized for this band");
    }

    const assignment = await ctx.db
      .query("eventCheckinStaff")
      .withIndex("by_event_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.staffUserId)
      )
      .unique();

    if (!assignment) {
      return { action: "not_found" };
    }

    if (assignment.status === "revoked") {
      return { action: "already_revoked" };
    }

    await ctx.db.patch(assignment._id, {
      status: "revoked",
      revokedAt: Date.now(),
    });

    return {
      action: "revoked",
      staffUserId: args.staffUserId,
      reason: CHECKIN_STAFF_REVOKE_REASON,
    };
  },
});

/**
 * Scans and consumes an event ticket QR code.
 * Enforces one-time validation and attendance write-back.
 */
export const scanEventTicket = mutation({
  args: {
    eventId: v.id("events"),
    qrValue: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventCheckinAccess(ctx, args.eventId);
    if (!access.canScan) {
      throw new Error("Not authorized to scan tickets for this event");
    }

    const token = parseTicketQrValue(args.qrValue);
    if (!token) {
      return {
        status: "invalid" as EventTicketScanStatus,
      };
    }

    const ticket = await ctx.db
      .query("eventTickets")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!ticket || ticket.eventId !== args.eventId) {
      return {
        status: "invalid" as EventTicketScanStatus,
      };
    }

    const attendee = await ctx.db.get(ticket.userId);

    if (ticket.status === "revoked") {
      return {
        status: "revoked" as EventTicketScanStatus,
        attendeeName: attendee?.name,
        ticketCode: formatTicketCode(ticket.token),
      };
    }

    if (ticket.status === "used") {
      return {
        status: "already_used" as EventTicketScanStatus,
        attendeeName: attendee?.name,
        usedAt: ticket.usedAt,
        ticketCode: formatTicketCode(ticket.token),
      };
    }

    const rsvp = await ctx.db.get(ticket.rsvpId);
    if (!rsvp || rsvp.eventId !== args.eventId) {
      return {
        status: "invalid" as EventTicketScanStatus,
      };
    }

    const usedAt = Date.now();
    await ctx.db.patch(ticket._id, {
      status: "used",
      usedAt,
      usedByUserId: access.user._id,
    });

    if (getAttendanceStatus(rsvp) !== "attended") {
      await ctx.db.patch(rsvp._id, {
        attendanceStatus: "attended",
        attendedAt: usedAt,
      });
      await incrementShowsAttended(ctx, rsvp.userId);
    }

    return {
      status: "checked_in" as EventTicketScanStatus,
      attendeeName: attendee?.name,
      usedAt,
      ticketCode: formatTicketCode(ticket.token),
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
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);

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
    bandId: v.id("bands"),
    rsvpType: v.optional(guestFilterTypeValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
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
    bandId: v.id("bands"),
    rsvpId: v.id("rsvps"),
    attended: v.boolean(),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
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
      await markTicketUsedForRsvp(ctx, rsvp, access.membership.userId);
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
    bandId: v.id("bands"),
    rsvpId: v.id("rsvps"),
  },
  handler: async (ctx, args) => {
    const access = await resolveEventBandAccess(ctx, args.eventId, args.bandId);
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

    await revokeActiveTicketForRsvp(
      ctx,
      args.rsvpId,
      GUEST_REMOVED_REVOKE_REASON
    );

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
    const limit = args.limit || 50;
    const viewerContext = await buildViewerContext(ctx);
    const cache = createEventHydrationCache();
    let events = await listUpcomingPublicEvents(ctx, {
      limit,
      scanLimit: Math.max(limit * 10, 300),
    });

    const requestedGenre = args.genre;
    if (requestedGenre !== undefined) {
      events = events.filter((event) => eventMatchesGenre(event, requestedGenre));
    }

    const eventsWithDistance = await Promise.all(
      events.map(async (event) => {
        const hydrated = await hydratePublicEvent(ctx, event, cache);
        if (!hydrated.venue?.coordinates) {
          return null;
        }

        const distance = haversineDistance(
          args.latitude,
          args.longitude,
          hydrated.venue.coordinates.lat,
          hydrated.venue.coordinates.lng
        );

        if (distance > args.radiusMiles) {
          return null;
        }

        return {
          ...applyAddressMask(hydrated, viewerContext),
          distance: Math.round(distance * 10) / 10,
        };
      })
    );

    return eventsWithDistance
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
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
    cohostBandIds: v.optional(v.array(v.id("bands"))),
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

    const { user } = await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

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

    if (args.cohostBandIds && args.cohostBandIds.length > 0) {
      await createCohostInvitesForEvent(ctx, {
        eventId,
        hostBandId: args.bandId,
        invitedByBandId: args.bandId,
        invitedByUserId: user._id,
        invitedBandIds: args.cohostBandIds,
      });
    }

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
    cohostBandIds: v.optional(v.array(v.id("bands"))),
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

    const { user } = await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

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

    if (args.cohostBandIds && args.cohostBandIds.length > 0) {
      await createCohostInvitesForEvent(ctx, {
        eventId,
        hostBandId: args.bandId,
        invitedByBandId: args.bandId,
        invitedByUserId: user._id,
        invitedBandIds: args.cohostBandIds,
      });
    }

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
    actingBandId: v.id("bands"),
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

    await requireBandRole(ctx, args.actingBandId, ["owner", "admin"]);
    const participatingBandIds = await getParticipatingBandIdsForEvent(ctx, event);
    if (!participatingBandIds.includes(args.actingBandId)) {
      throw new Error("Not authorized for this event");
    }

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
    actingBandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await requireBandRole(ctx, args.actingBandId, ["owner", "admin"]);
    const participatingBandIds = await getParticipatingBandIdsForEvent(ctx, event);
    if (!participatingBandIds.includes(args.actingBandId)) {
      throw new Error("Not authorized for this event");
    }

    if (!isTentative(event.status)) {
      throw new Error("Only tentative gigs can be deleted.");
    }

    // Defensive cleanup in case legacy data exists.
    const [likes, rsvps, tickets, checkinStaff] = await Promise.all([
      ctx.db
        .query("likes")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect(),
      ctx.db
        .query("rsvps")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect(),
      ctx.db
        .query("eventTickets")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect(),
      ctx.db
        .query("eventCheckinStaff")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect(),
    ]);

    await Promise.all([
      ...likes.map((like) => ctx.db.delete(like._id)),
      ...rsvps.map((rsvp) => ctx.db.delete(rsvp._id)),
      ...tickets.map((ticket) => ctx.db.delete(ticket._id)),
      ...checkinStaff.map((staff) => ctx.db.delete(staff._id)),
    ]);

    await ctx.db.delete(args.eventId);

    return { eventId: args.eventId };
  },
});
