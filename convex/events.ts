/**
 * @fileoverview Convex queries and mutations for core event management.
 * Handles event CRUD operations, listing queries, search, and geospatial queries.
 *
 * RSVP/like/guest/poll functions live in ./eventRsvps.ts
 * Ticket/check-in functions live in ./eventTickets.ts
 *
 * @module convex/events
 */

import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  EVENT_RSVP_GRACE_PERIOD_MS,
  isEventPast,
} from "../packages/shared/src/eventTiming";
import { haversineDistance, coordinatesMatch } from "./utils/geo";
import {
  getAuthenticatedUserOrNull,
  requireAuthenticatedUser,
  requireBandMember,
  requireBandRole,
} from "./utils/permissions";
import {
  getAcceptedCohostBandIds,
  getParticipatingBandIdsForEvent,
} from "./eventCohosts";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Validator for music genre values.
 * Supports: indie, rock, jazz, electronic, folk, pop, alternative
 */
export const genreValidator = v.union(
  v.literal("indie"),
  v.literal("rock"),
  v.literal("jazz"),
  v.literal("electronic"),
  v.literal("folk"),
  v.literal("pop"),
  v.literal("alternative")
);

export const eventStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("hold"),
  v.literal("available")
);

export const eventAddressVisibilityValidator = v.union(
  v.literal("public"),
  v.literal("rsvp_only")
);

const eventPollOptionValidator = v.object({
  id: v.string(),
  label: v.string(),
});

export const eventPollValidator = v.object({
  question: v.string(),
  options: v.array(eventPollOptionValidator),
});

type EventAddressVisibility = "public" | "rsvp_only";
export type GuestRsvpType = "on_list" | "attended";
export type EventTicketStatus = "active" | "used" | "revoked";
export type EventCheckinRole = "manager" | "staff";
export type EventTicketScanStatus = "checked_in" | "already_used" | "revoked" | "invalid";
export type EventPollOption = {
  id: string;
  label: string;
};
export type EventPoll = {
  question: string;
  options: EventPollOption[];
};
export type GenreValue =
  | "indie"
  | "rock"
  | "jazz"
  | "electronic"
  | "folk"
  | "pop"
  | "alternative";

export const guestFilterTypeValidator = v.union(
  v.literal("all"),
  v.literal("on_list"),
  v.literal("attended")
);

export const MASKED_VENUE_ADDRESS = "Address revealed after RSVP";
export const GUEST_LIST_PREVIEW_LIMIT = 6;
export const GUEST_LIST_CAP = 500;
export const TICKET_QR_PREFIX = "EPT1";
export const CHECKIN_STAFF_REVOKE_REASON = "event_staff_revoked";
export const RSVP_CANCEL_REVOKE_REASON = "rsvp_cancelled";
export const GUEST_REMOVED_REVOKE_REASON = "guest_removed";
export const MAX_EVENT_POLL_OPTIONS = 6;
export const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
]);
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export interface ViewerContext {
  userId: Id<"users"> | null;
  memberBandIds: Set<Id<"bands">>;
  rsvpEventIds: Set<Id<"events">>;
  cohostEventIds: Set<Id<"events">>;
  hasSpotifyPersonalization: boolean;
  personalizedGenres: GenreValue[];
  matchedBandIds: Set<Id<"bands">>;
}

export interface EventBandAccess {
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

export type PublicEvent = Doc<"events"> & {
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

export function createEventHydrationCache(): EventHydrationCache {
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

export async function hydratePublicEvent(
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
      q.eq("status", "confirmed").gte("dateTime", now - EVENT_RSVP_GRACE_PERIOD_MS)
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

function getEventGenres(
  event: Pick<Doc<"events">, "genres" | "genre">,
): GenreValue[] {
  if (event.genres && event.genres.length > 0) {
    return event.genres.filter(
      (genre): genre is GenreValue =>
        genre === "indie" ||
        genre === "rock" ||
        genre === "jazz" ||
        genre === "electronic" ||
        genre === "folk" ||
        genre === "pop" ||
        genre === "alternative",
    );
  }

  if (event.genre) {
    return [event.genre];
  }

  return [];
}

function getEventPersonalizationMetadata(
  event: Pick<Doc<"events">, "bandId" | "genres" | "genre">,
  viewerContext: ViewerContext,
): {
  score: number;
  personalizationReason?: "spotify_artist_match" | "spotify_genre_match";
} {
  if (!viewerContext.hasSpotifyPersonalization) {
    return { score: 0 };
  }

  let score = 0;
  let personalizationReason:
    | "spotify_artist_match"
    | "spotify_genre_match"
    | undefined;

  if (viewerContext.matchedBandIds.has(event.bandId)) {
    score += 100;
    personalizationReason = "spotify_artist_match";
  }

  const eventGenres = getEventGenres(event);
  const overlapCount = eventGenres.filter((genre) =>
    viewerContext.personalizedGenres.includes(genre),
  ).length;

  if (overlapCount > 0) {
    score += overlapCount * 10;
    if (!personalizationReason) {
      personalizationReason = "spotify_genre_match";
    }
  }

  return { score, personalizationReason };
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
    throw new ConvexError({
      code: "invalid_confirmed_event",
      message: "Confirmed gigs require an event title.",
    });
  }

  if (typeof input.dateTime !== "number" || !Number.isFinite(input.dateTime)) {
    throw new ConvexError({
      code: "invalid_confirmed_event",
      message: "Confirmed gigs require a valid date.",
    });
  }

  if (typeof input.capacity !== "number" || !Number.isFinite(input.capacity) || input.capacity <= 0) {
    throw new ConvexError({
      code: "invalid_confirmed_event",
      message: "Confirmed gigs require a positive capacity.",
    });
  }

  if (!input.genres || input.genres.length === 0) {
    throw new ConvexError({
      code: "invalid_confirmed_event",
      message: "Confirmed gigs require at least one genre.",
    });
  }

  if (!input.venueId && !hasCompleteVenueInput(input)) {
    throw new ConvexError({
      code: "invalid_confirmed_event",
      message: "Confirmed gigs require a complete venue selection.",
    });
  }
}

function isBandManagerAccessError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === "Not authenticated" ||
      error.message === "User not found" ||
      error.message === "Not authorized for this band")
  );
}

async function requireBandManagerAccess(
  ctx: MutationCtx,
  bandId: Id<"bands">,
  message: string
) {
  try {
    return await requireBandRole(ctx, bandId, ["owner", "admin"]);
  } catch (error) {
    if (isBandManagerAccessError(error)) {
      throw new ConvexError({
        code: "event_band_access_denied",
        message,
      });
    }
    throw error;
  }
}

function normalizeEventImage(image: string | undefined): string | undefined {
  const normalized = image?.trim();
  return normalized ? normalized : undefined;
}

async function resolveEventImageFromStorage(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
): Promise<{ image: string; imageStorageId: Id<"_storage"> }> {
  const metadata = await ctx.storage.getMetadata(storageId);
  if (!metadata) {
    throw new ConvexError({
      code: "event_image_not_found",
      message: "Uploaded event image file not found.",
    });
  }

  const mimeType = (metadata.contentType ?? "").toLowerCase();
  if (!IMAGE_MIME_TYPES.has(mimeType)) {
    throw new ConvexError({
      code: "invalid_event_image",
      message: "Unsupported image format. Use JPEG, PNG, or WEBP.",
    });
  }

  if (metadata.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ConvexError({
      code: "invalid_event_image",
      message: "Image file exceeds the 10 MB size limit.",
    });
  }

  const imageUrl = await ctx.storage.getUrl(storageId);
  if (!imageUrl) {
    throw new ConvexError({
      code: "event_image_unavailable",
      message: "Unable to resolve the uploaded event image.",
    });
  }

  return {
    image: imageUrl,
    imageStorageId: storageId,
  };
}

async function resolveEventImageInput(
  ctx: MutationCtx,
  args: {
    image?: string;
    imageStorageId?: Id<"_storage">;
  },
): Promise<{
  image?: string;
  imageStorageId?: Id<"_storage">;
}> {
  if (args.imageStorageId) {
    return await resolveEventImageFromStorage(ctx, args.imageStorageId);
  }

  return { image: normalizeEventImage(args.image) };
}

function normalizeEventPollOption(option: EventPollOption): EventPollOption {
  return {
    id: option.id.trim(),
    label: option.label.trim(),
  };
}

function normalizeEventPoll(poll: EventPoll | null | undefined): EventPoll | undefined {
  if (!poll) {
    return undefined;
  }

  return {
    question: poll.question.trim(),
    options: poll.options.map(normalizeEventPollOption),
  };
}

function validateEventPoll(poll: EventPoll | undefined): void {
  if (!poll) {
    return;
  }

  if (poll.question.length === 0) {
    throw new ConvexError({
      code: "invalid_event_poll",
      message: "Poll question is required.",
    });
  }

  if (poll.question.length > 200) {
    throw new ConvexError({
      code: "invalid_event_poll",
      message: "Poll question must be 200 characters or fewer.",
    });
  }

  if (poll.options.length < 2 || poll.options.length > MAX_EVENT_POLL_OPTIONS) {
    throw new ConvexError({
      code: "invalid_event_poll",
      message: `Polls must have between 2 and ${MAX_EVENT_POLL_OPTIONS} options.`,
    });
  }

  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();

  for (const option of poll.options) {
    if (option.id.length === 0) {
      throw new ConvexError({
        code: "invalid_event_poll",
        message: "Each poll option needs a stable id.",
      });
    }

    if (seenIds.has(option.id)) {
      throw new ConvexError({
        code: "invalid_event_poll",
        message: "Poll options must have unique ids.",
      });
    }
    seenIds.add(option.id);

    if (option.label.length === 0) {
      throw new ConvexError({
        code: "invalid_event_poll",
        message: "Poll options cannot be empty.",
      });
    }

    if (option.label.length > 120) {
      throw new ConvexError({
        code: "invalid_event_poll",
        message: "Poll options must be 120 characters or fewer.",
      });
    }

    const normalizedLabel = option.label.toLowerCase();
    if (seenLabels.has(normalizedLabel)) {
      throw new ConvexError({
        code: "invalid_event_poll",
        message: "Poll options must be unique.",
      });
    }
    seenLabels.add(normalizedLabel);
  }
}

export function areEventPollsEqual(
  left: EventPoll | undefined,
  right: EventPoll | undefined
): boolean {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  if (left.question !== right.question || left.options.length !== right.options.length) {
    return false;
  }

  return left.options.every((option, index) => {
    const nextOption = right.options[index];
    return option.id === nextOption.id && option.label === nextOption.label;
  });
}

export async function getEventPollResponses(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">
) {
  const rsvps = await ctx.db
    .query("rsvps")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const answered = rsvps.filter((rsvp) => typeof rsvp.pollAnswerOptionId === "string");

  return {
    rsvps,
    answerCount: answered.length,
    hasResponses: answered.length > 0,
  };
}

export function buildPollPromptPayload(
  event: Pick<Doc<"events">, "_id" | "title" | "poll" | "dateTime">
) {
  if (!event.poll || !canAnswerEventPoll(event)) {
    return null;
  }

  return {
    eventId: event._id,
    eventTitle: event.title?.trim() || "Untitled Gig",
    question: event.poll.question,
    options: event.poll.options,
  };
}

export function canAnswerEventPoll(event: Pick<Doc<"events">, "dateTime" | "poll">): boolean {
  return (
    !!event.poll &&
    typeof event.dateTime === "number" &&
    Number.isFinite(event.dateTime) &&
    event.dateTime > Date.now()
  );
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

export function isPublicEvent(event: Doc<"events">): event is PublicEvent {
  return isPublic(event.status) && hasPublicCoreFields(event);
}

export function getAttendanceStatus(
  rsvp: Pick<Doc<"rsvps">, "attendanceStatus">
): GuestRsvpType {
  return rsvp.attendanceStatus ?? "on_list";
}

export async function decrementShowsAttended(
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

export async function incrementShowsAttended(
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

export async function buildViewerContext(ctx: QueryCtx): Promise<ViewerContext> {
  const user = await getAuthenticatedUserOrNull(ctx);
  if (!user) {
    return {
      userId: null,
      memberBandIds: new Set<Id<"bands">>(),
      rsvpEventIds: new Set<Id<"events">>(),
      cohostEventIds: new Set<Id<"events">>(),
      hasSpotifyPersonalization: false,
      personalizedGenres: [],
      matchedBandIds: new Set<Id<"bands">>(),
    };
  }

  const [memberships, rsvps, spotifyProfile] = await Promise.all([
    ctx.db
      .query("bandMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect(),
    ctx.db
      .query("rsvps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect(),
    ctx.db
      .query("spotifyProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique(),
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
    hasSpotifyPersonalization: Boolean(spotifyProfile),
    personalizedGenres: spotifyProfile?.topGenres ?? [],
    matchedBandIds: new Set(spotifyProfile?.matchedBandIds ?? []),
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

export function applyAddressMask<
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

export async function resolveEventBandAccess(
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

export async function resolveEventCheckinAccess(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">
): Promise<EventCheckinAccess | null> {
  const event = await ctx.db.get(eventId);
  if (!event) {
    return null;
  }

  const user = await getAuthenticatedUserOrNull(ctx);
  if (!user) {
    return null;
  }

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
    const events = await listUpcomingPublicEvents(ctx, {
      limit,
      scanLimit: Math.max(limit * 8, 250),
    });
    const hydrated = await Promise.all(
      events.map(async (event) => {
        const hydratedEvent = applyAddressMask(
          await hydratePublicEvent(ctx, event, cache),
          viewerContext,
        );
        const personalization = getEventPersonalizationMetadata(
          hydratedEvent,
          viewerContext,
        );

        return {
          ...hydratedEvent,
          personalizationReason: personalization.personalizationReason,
          _personalizationScore: personalization.score,
        };
      }),
    );

    return hydrated
      .sort((a, b) => {
        if (b._personalizationScore !== a._personalizationScore) {
          return b._personalizationScore - a._personalizationScore;
        }
        return a.dateTime - b.dateTime;
      })
      .slice(0, limit)
      .map(({ _personalizationScore, ...event }) => event);
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
      .filter((event) => eventMatchesGenre(event, args.genre));
    const hydrated = await Promise.all(
      filteredEvents.map(async (event) => {
        const hydratedEvent = applyAddressMask(
          await hydratePublicEvent(ctx, event, cache),
          viewerContext,
        );
        const personalization = getEventPersonalizationMetadata(
          hydratedEvent,
          viewerContext,
        );

        return {
          ...hydratedEvent,
          personalizationReason: personalization.personalizationReason,
          _personalizationScore: personalization.score,
        };
      }),
    );

    return hydrated
      .sort((a, b) => {
        if (b._personalizationScore !== a._personalizationScore) {
          return b._personalizationScore - a._personalizationScore;
        }
        return a.dateTime - b.dateTime;
      })
      .slice(0, limit)
      .map(({ _personalizationScore, ...event }) => event);
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

    const [band, acceptedCohostBandIds, pollResponses] = await Promise.all([
      ctx.db.get(event.bandId),
      getAcceptedCohostBandIds(ctx, event._id),
      getEventPollResponses(ctx, event._id),
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
        pollHasResponses: pollResponses.hasResponses,
        pollResponseCount: pollResponses.answerCount,
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
      events = mergedEvents.filter(
        (e) =>
          e.dateTime === undefined ||
          !isEventPast(e.dateTime, now),
      );
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
 * Lists public confirmed events for a specific band for fan-facing surfaces.
 * Legacy name retained for existing clients.
 * Returns hosted and accepted cohost gigs, sorted by most recent date first.
 *
 * @param args.bandId - The Convex ID of the band
 * @param args.limit - Maximum number of gigs to return (default: 6, max: 24)
 */
export const listPublicPastByBand = query({
  args: {
    bandId: v.id("bands"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 6, 24));

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

    const confirmedEvents = [
      ...hostedEvents,
      ...cohostedEvents.filter((event) => !hostedById.has(event._id)),
    ]
      .filter((event): event is PublicEvent => isPublicEvent(event))
      .sort((a, b) => b.dateTime - a.dateTime)
      .slice(0, limit);

    return Promise.all(
      confirmedEvents.map(async (event) => {
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
        isPublicEvent(event) && !isEventPast(event.dateTime, now)
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

// RSVP/like/guest/poll functions moved to ./eventRsvps.ts
// Ticket/check-in functions moved to ./eventTickets.ts

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

        const maskedEvent = {
          ...applyAddressMask(hydrated, viewerContext),
          distance: Math.round(distance * 10) / 10,
        };
        const personalization = getEventPersonalizationMetadata(
          maskedEvent,
          viewerContext,
        );

        return {
          ...maskedEvent,
          personalizationReason: personalization.personalizationReason,
          _personalizationScore: personalization.score,
        };
      })
    );

    return eventsWithDistance
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => {
        if (b._personalizationScore !== a._personalizationScore) {
          return b._personalizationScore - a._personalizationScore;
        }
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        return a.dateTime - b.dateTime;
      })
      .slice(0, limit)
      .map(({ _personalizationScore, ...event }) => event);
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
    imageStorageId: v.optional(v.id("_storage")),
    capacity: v.optional(v.number()),
    price: v.optional(v.number()),
    description: v.optional(v.string()),
    genres: v.optional(v.array(genreValidator)), // Multiple genres
    genre: v.optional(genreValidator), // Legacy field for backward compatibility
    status: v.optional(eventStatusValidator),
    addressVisibility: v.optional(eventAddressVisibilityValidator),
    poll: v.optional(eventPollValidator),
  },
  handler: async (ctx, args) => {
    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new ConvexError({
        code: "event_band_not_found",
        message: "Band not found.",
      });
    }

    const { user } = await requireBandManagerAccess(
      ctx,
      args.bandId,
      "Only band owners and admins can create gigs.",
    );

    const status = args.status ?? "confirmed";
    const genres = args.genres ?? (args.genre ? [args.genre] : undefined);
    const poll = normalizeEventPoll(args.poll);
    const image = await resolveEventImageInput(ctx, {
      image: args.image,
      imageStorageId: args.imageStorageId,
    });
    validateEventPoll(poll);

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
      image: image.image,
      imageStorageId: image.imageStorageId,
      capacity: args.capacity,
      price: args.price,
      description: args.description,
      genres,
      genre: args.genre ?? genres?.[0],
      rsvpCount: 0,
      status,
      addressVisibility: args.addressVisibility ?? "public",
      poll,
    });

    if (args.cohostBandIds && args.cohostBandIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.eventCohosts.createInvitesAfterEventCreate, {
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
    imageStorageId: v.optional(v.id("_storage")),
    capacity: v.optional(v.number()),
    price: v.optional(v.number()),
    description: v.optional(v.string()),
    status: v.optional(eventStatusValidator),
    addressVisibility: v.optional(eventAddressVisibilityValidator),
    poll: v.optional(eventPollValidator),
  },
  handler: async (ctx, args) => {
    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new ConvexError({
        code: "event_band_not_found",
        message: "Band not found.",
      });
    }

    const { user } = await requireBandManagerAccess(
      ctx,
      args.bandId,
      "Only band owners and admins can create gigs.",
    );

    const status = args.status ?? "confirmed";
    const genres = args.genres ?? (args.genre ? [args.genre] : undefined);
    const poll = normalizeEventPoll(args.poll);
    const image = await resolveEventImageInput(ctx, {
      image: args.image,
      imageStorageId: args.imageStorageId,
    });
    validateEventPoll(poll);
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
      image: image.image,
      imageStorageId: image.imageStorageId,
      capacity: args.capacity,
      price: args.price,
      description: args.description,
      genres,
      genre: args.genre ?? genres?.[0],
      rsvpCount: 0,
      status,
      addressVisibility: args.addressVisibility ?? "public",
      poll,
    });

    if (args.cohostBandIds && args.cohostBandIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.eventCohosts.createInvitesAfterEventCreate, {
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

export const generateImageUploadUrl = mutation({
  args: {
    bandId: v.optional(v.id("bands")),
    eventId: v.optional(v.id("events")),
    actingBandId: v.optional(v.id("bands")),
  },
  handler: async (ctx, args) => {
    const isCreateUpload =
      args.bandId !== undefined &&
      args.eventId === undefined &&
      args.actingBandId === undefined;
    const isUpdateUpload =
      args.bandId === undefined &&
      args.eventId !== undefined &&
      args.actingBandId !== undefined;

    if (!isCreateUpload && !isUpdateUpload) {
      throw new ConvexError({
        code: "invalid_event_image_upload_request",
        message:
          "Provide either bandId for a new gig image or eventId plus actingBandId for an existing gig image.",
      });
    }

    if (isCreateUpload) {
      await requireBandManagerAccess(
        ctx,
        args.bandId!,
        "Only band owners and admins can create gigs.",
      );
    } else {
      const event = await ctx.db.get(args.eventId!);
      if (!event) {
        throw new ConvexError({
          code: "event_not_found",
          message: "Event not found.",
        });
      }

      await requireBandManagerAccess(
        ctx,
        args.actingBandId!,
        "Only participating band owners and admins can edit this gig.",
      );

      const participatingBandIds = await getParticipatingBandIdsForEvent(ctx, event);
      if (!participatingBandIds.includes(args.actingBandId!)) {
        throw new ConvexError({
          code: "event_band_access_denied",
          message: "Only participating band owners and admins can edit this gig.",
        });
      }
    }

    const uploadUrl = await ctx.storage.generateUploadUrl();
    return { uploadUrl };
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
    imageStorageId: v.optional(v.id("_storage")),
    clearImage: v.optional(v.boolean()),
    capacity: v.optional(v.number()),
    price: v.optional(v.number()),
    description: v.optional(v.string()),
    genres: v.optional(v.array(genreValidator)),
    genre: v.optional(genreValidator),
    status: v.optional(eventStatusValidator),
    addressVisibility: v.optional(eventAddressVisibilityValidator),
    poll: v.optional(v.union(eventPollValidator, v.null())),
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
      throw new ConvexError({
        code: "event_not_found",
        message: "Event not found.",
      });
    }

    await requireBandManagerAccess(
      ctx,
      args.actingBandId,
      "Only band owners and admins can edit gigs.",
    );
    const participatingBandIds = await getParticipatingBandIdsForEvent(ctx, event);
    if (!participatingBandIds.includes(args.actingBandId)) {
      throw new ConvexError({
        code: "event_band_access_denied",
        message: "Only participating band owners and admins can edit this gig.",
      });
    }

    if (args.capacity !== undefined && args.capacity < event.rsvpCount) {
      throw new ConvexError({
        code: "invalid_event_capacity",
        message: `Cannot reduce capacity below current RSVP count (${event.rsvpCount}).`,
      });
    }

    const nextStatus = args.status ?? event.status;
    const normalizedPoll = normalizeEventPoll(args.poll);
    validateEventPoll(normalizedPoll);
    if (args.clearImage && (args.image !== undefined || args.imageStorageId !== undefined)) {
      throw new ConvexError({
        code: "invalid_event_image",
        message: "Event image updates must either replace the image or remove it.",
      });
    }
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
        throw new ConvexError({
          code: "invalid_confirmed_event",
          message: "Confirmed gigs require a complete venue selection.",
        });
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
    const currentPoll = normalizeEventPoll(event.poll);
    const nextPoll = args.poll !== undefined ? normalizedPoll : currentPoll;
    const normalizedImage = normalizeEventImage(args.image);
    const shouldClearImage =
      args.clearImage === true ||
      (args.image !== undefined && normalizedImage === undefined);

    if (
      args.poll !== undefined &&
      !areEventPollsEqual(currentPoll, nextPoll)
    ) {
      const pollResponses = await getEventPollResponses(ctx, args.eventId);
      if (pollResponses.hasResponses) {
        throw new ConvexError({
          code: "event_poll_locked",
          message: "This RSVP poll is locked after the first response.",
        });
      }
    }

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
    const previousImageStorageId = event.imageStorageId;
    let nextImageStorageId = event.imageStorageId;
    let storageIdToDelete: Id<"_storage"> | undefined;
    if (venueId !== event.venueId) {
      updates.venueId = venueId;
    }

    if (args.title !== undefined) updates.title = args.title;
    if (args.dateTime !== undefined) updates.dateTime = args.dateTime;
    if (args.imageStorageId !== undefined) {
      const resolvedImage = await resolveEventImageFromStorage(ctx, args.imageStorageId);
      updates.image = resolvedImage.image;
      updates.imageStorageId = resolvedImage.imageStorageId;
      nextImageStorageId = resolvedImage.imageStorageId;
      if (previousImageStorageId && previousImageStorageId !== resolvedImage.imageStorageId) {
        storageIdToDelete = previousImageStorageId;
      }
    } else if (shouldClearImage) {
      updates.image = undefined;
      updates.imageStorageId = undefined;
      nextImageStorageId = undefined;
      if (previousImageStorageId) {
        storageIdToDelete = previousImageStorageId;
      }
    } else if (args.image !== undefined) {
      updates.image = normalizedImage;
      updates.imageStorageId = undefined;
      nextImageStorageId = undefined;
      if (previousImageStorageId) {
        storageIdToDelete = previousImageStorageId;
      }
    }
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
    if (args.poll !== undefined) {
      updates.poll = nextPoll;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.eventId, updates);
    }

    if (storageIdToDelete && storageIdToDelete !== nextImageStorageId) {
      try {
        await ctx.storage.delete(storageIdToDelete);
      } catch {
        // Storage object may already be missing.
      }
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
      throw new ConvexError({
        code: "event_not_found",
        message: "Event not found.",
      });
    }

    await requireBandManagerAccess(
      ctx,
      args.actingBandId,
      "Only band owners and admins can delete tentative gigs.",
    );
    const participatingBandIds = await getParticipatingBandIdsForEvent(ctx, event);
    if (!participatingBandIds.includes(args.actingBandId)) {
      throw new ConvexError({
        code: "event_band_access_denied",
        message: "Only participating band owners and admins can delete this gig.",
      });
    }

    if (!isTentative(event.status)) {
      throw new ConvexError({
        code: "invalid_event_status",
        message: "Only tentative gigs can be deleted.",
      });
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

    if (event.imageStorageId) {
      try {
        await ctx.storage.delete(event.imageStorageId);
      } catch {
        // Storage object may already be missing.
      }
    }

    return { eventId: args.eventId };
  },
});
