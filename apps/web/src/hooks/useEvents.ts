/**
 * @fileoverview Custom hooks for event discovery, RSVP, and user event management.
 * Provides access to upcoming events, search, nearby events, and user interactions.
 * @module hooks/useEvents
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type {
  EventCheckinAssignableUser,
  EventCheckinStaff,
  EventPoll,
  EventTicketScanResult,
  Genre,
  GuestFilterType,
  MyEventTicketPayload,
} from "@ear-plug/shared/types";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuthActionGuard } from "./useAuthActionGuard";

interface EventPollPromptState {
  eventId: Id<"events">;
  eventTitle: string;
  question: string;
  options: EventPoll["options"];
}

/**
 * Hook for listing upcoming events with optional genre filtering.
 * Returns either all upcoming events or events filtered by genre.
 *
 * @param options - Optional filter parameters
 * @param options.genre - Filter events by genre
 * @param options.limit - Maximum number of events to return
 * @returns Object containing events array and loading state
 *
 * @example
 * function EventsList() {
 *   const { events, isLoading } = useEvents({ genre: "rock", limit: 20 });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return events.map(event => (
 *     <EventCard key={event._id} event={event} />
 *   ));
 * }
 */
export function useEvents(options?: { genre?: Genre; limit?: number }) {
  /** All upcoming events (when no genre filter) */
  const events = useQuery(
    api.events.listUpcoming,
    options?.limit ? { limit: options.limit } : {},
  );

  /** Events filtered by genre (when genre is specified) */
  const eventsByGenre = useQuery(
    api.events.listByGenre,
    options?.genre ? { genre: options.genre, limit: options.limit } : "skip",
  );

  return {
    /** Array of event documents with band and venue data */
    events: options?.genre ? eventsByGenre : events,
    /** True while the query is loading */
    isLoading: (options?.genre ? eventsByGenre : events) === undefined,
  };
}

/**
 * Hook for accessing a single event's details with RSVP/like functionality.
 * Includes the user's interaction status with the event.
 *
 * @param eventId - The Convex ID of the event, or undefined to skip the query
 * @returns Object containing event data, user status, and action functions
 *
 * @example
 * function EventDetailPage({ eventId }: { eventId: Id<"events"> }) {
 *   const { event, hasRsvp, hasLiked, rsvp, toggleLike, isLoading } = useEvent(eventId);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <h1>{event?.title}</h1>
 *       <button onClick={rsvp}>
 *         {hasRsvp ? "Cancel RSVP" : "RSVP"}
 *       </button>
 *       <button onClick={toggleLike}>
 *         {hasLiked ? "Unlike" : "Like"}
 *       </button>
 *     </div>
 *   );
 * }
 */
export function useEvent(eventId: Id<"events"> | undefined) {
  /** Event document with band and venue data */
  const event = useQuery(api.events.getById, eventId ? { eventId } : "skip");

  const interaction = useEventInteraction(eventId);

  return {
    /** The event document with band and venue data */
    event,
    /** True while the event query is loading */
    isLoading: event === undefined,
    ...interaction,
  };
}

export function useEventInteraction(eventId: Id<"events"> | undefined) {
  const { requireSignIn } = useAuthActionGuard();
  const eventStatus = useQuery(
    api.events.getUserEventStatus,
    eventId ? { eventId } : "skip",
  );
  const rsvpMutation = useMutation(api.events.rsvp);
  const toggleLikeMutation = useMutation(api.events.toggleLike);
  const submitPollResponseMutation = useMutation(
    api.events.submitEventPollResponse,
  );
  const [pollPrompt, setPollPrompt] = useState<EventPollPromptState | null>(
    null,
  );

  const rsvp = useCallback(async () => {
    if (!eventId) return undefined;
    if (!requireSignIn()) return undefined;
    const result = await rsvpMutation({ eventId });

    if (result.action === "added" && result.pollPrompt) {
      setPollPrompt({
        eventId,
        eventTitle: result.pollPrompt.eventTitle,
        question: result.pollPrompt.question,
        options: result.pollPrompt.options,
      });
    } else if (result.action === "removed") {
      setPollPrompt(null);
    }

    return result;
  }, [eventId, requireSignIn, rsvpMutation]);

  const toggleLike = useCallback(async () => {
    if (!eventId) return undefined;
    if (!requireSignIn()) return undefined;
    return toggleLikeMutation({ eventId });
  }, [eventId, requireSignIn, toggleLikeMutation]);

  const submitPollResponse = useCallback(
    async (optionId: string) => {
      if (!eventId) return undefined;
      if (!requireSignIn()) return undefined;
      const result = await submitPollResponseMutation({ eventId, optionId });
      setPollPrompt(null);
      return result;
    },
    [eventId, requireSignIn, submitPollResponseMutation],
  );

  const dismissPollPrompt = useCallback(() => {
    setPollPrompt(null);
  }, []);

  const openPendingPollPrompt = useCallback(
    (
      event:
        | {
            title?: string;
            poll?: EventPoll;
          }
        | null
        | undefined,
    ) => {
      if (
        !eventId ||
        !event?.poll ||
        !eventStatus?.hasPendingPoll ||
        !eventStatus.canAnswerPoll
      ) {
        return;
      }

      setPollPrompt({
        eventId,
        eventTitle: event.title?.trim() || "Untitled Gig",
        question: event.poll.question,
        options: event.poll.options,
      });
    },
    [eventId, eventStatus?.canAnswerPoll, eventStatus?.hasPendingPoll],
  );

  return {
    eventStatus,
    hasRsvp: eventStatus?.hasRsvp ?? false,
    hasLiked: eventStatus?.hasLiked ?? false,
    hasPendingPoll: eventStatus?.hasPendingPoll ?? false,
    selectedPollOptionId: eventStatus?.selectedPollOptionId,
    canAnswerPoll: eventStatus?.canAnswerPoll ?? false,
    pollPrompt,
    rsvp,
    toggleLike,
    submitPollResponse,
    dismissPollPrompt,
    openPendingPollPrompt,
  };
}

/**
 * Hook for accessing the current user's event interactions.
 * Provides RSVPs (upcoming and past) and liked events.
 *
 * @returns Object containing user's RSVPs, likes, and past RSVPs
 *
 * @example
 * function MyEventsPage() {
 *   const { rsvps, likes, pastRsvps, isLoading } = useUserEvents();
 *
 *   return (
 *     <div>
 *       <section>
 *         <h2>Upcoming Events ({rsvps.length})</h2>
 *         {rsvps.map(event => <EventCard key={event._id} event={event} />)}
 *       </section>
 *       <section>
 *         <h2>Saved Events ({likes.length})</h2>
 *         {likes.map(event => <EventCard key={event._id} event={event} />)}
 *       </section>
 *       <section>
 *         <h2>Past Events ({pastRsvps.length})</h2>
 *         {pastRsvps.map(event => <EventCard key={event._id} event={event} />)}
 *       </section>
 *     </div>
 *   );
 * }
 */
export function useUserEvents() {
  /** Upcoming events the user has RSVP'd to */
  const rsvps = useQuery(api.events.getUserRsvps);

  /** Events the user has liked (not RSVP'd) */
  const likes = useQuery(api.events.getUserLikes);

  /** Past events the user attended */
  const pastRsvps = useQuery(api.events.getUserPastRsvps);

  return {
    /** Array of upcoming RSVP'd events */
    rsvps: rsvps ?? [],
    /** Array of liked events (excluding RSVP'd events) */
    likes: likes ?? [],
    /** Array of past RSVP'd events */
    pastRsvps: pastRsvps ?? [],
    /** True while any query is loading */
    isLoading:
      rsvps === undefined || likes === undefined || pastRsvps === undefined,
  };
}

/**
 * Hook for guest-list preview data on band event detail pages.
 */
export function useEventGuestListSummary(
  eventId: Id<"events"> | undefined,
  bandId: Id<"bands"> | undefined,
) {
  const summary = useQuery(
    api.events.getEventGuestListSummary,
    eventId && bandId ? { eventId, bandId } : "skip",
  );

  return {
    summary,
    isLoading:
      eventId !== undefined && bandId !== undefined && summary === undefined,
  };
}

/**
 * Hook for full event guest-list management state.
 */
export function useEventGuestList(
  eventId: Id<"events"> | undefined,
  bandId: Id<"bands"> | undefined,
  options?: { rsvpType?: GuestFilterType; search?: string },
) {
  const guestsResult = useQuery(
    api.events.listEventGuests,
    eventId && bandId
      ? {
          eventId,
          bandId,
          rsvpType: options?.rsvpType,
          search: options?.search?.trim() ? options.search : undefined,
        }
      : "skip",
  );

  const setGuestAttendanceMutation = useMutation(
    api.events.setEventGuestAttendance,
  );
  const removeGuestRsvpMutation = useMutation(api.events.removeEventGuestRsvp);

  return {
    guests: guestsResult?.guests ?? [],
    capReached: guestsResult?.capReached ?? false,
    cap: guestsResult?.cap ?? 500,
    counts: guestsResult?.counts ?? { total: 0, onList: 0, attended: 0 },
    totalCount: guestsResult?.totalCount ?? 0,
    canManage: guestsResult?.canManage ?? false,
    isLoading:
      eventId !== undefined &&
      bandId !== undefined &&
      guestsResult === undefined,
    setGuestAttendance: (args: {
      eventId: Id<"events">;
      bandId: Id<"bands">;
      rsvpId: Id<"rsvps">;
      attended: boolean;
    }) => setGuestAttendanceMutation(args),
    removeGuestRsvp: (args: {
      eventId: Id<"events">;
      bandId: Id<"bands">;
      rsvpId: Id<"rsvps">;
    }) => removeGuestRsvpMutation(args),
  };
}

/**
 * Hook for searching events by text query.
 * Searches event titles, band names, and venue names.
 * Requires at least 2 characters to perform search.
 *
 * @param query - Search text (minimum 2 characters)
 * @returns Object containing search results and loading state
 *
 * @example
 * function SearchPage() {
 *   const [query, setQuery] = useState("");
 *   const { results, isLoading } = useSearchEvents(query);
 *
 *   return (
 *     <div>
 *       <input value={query} onChange={e => setQuery(e.target.value)} />
 *       {results.map(event => (
 *         <EventCard key={event._id} event={event} />
 *       ))}
 *     </div>
 *   );
 * }
 */
export function useSearchEvents(query: string) {
  const results = useQuery(
    api.events.search,
    query.length >= 2 ? { query, limit: 20 } : "skip",
  );

  return {
    /** Array of matching event documents */
    results: results ?? [],
    /** True while the search query is loading */
    isLoading: results === undefined,
  };
}

/**
 * Hook for getting events near a geographic location.
 * Uses Haversine formula for accurate distance calculation.
 * Returns events sorted by distance with distance value included.
 *
 * @param options - Filter parameters
 * @param options.latitude - User's latitude, or null if unavailable
 * @param options.longitude - User's longitude, or null if unavailable
 * @param options.radiusMiles - Search radius in miles
 * @param options.genre - Optional genre filter
 * @param options.limit - Optional maximum number of results
 * @param options.enabled - Optional flag to enable/disable the query (default: true)
 * @returns Object containing nearby events with distances and loading state
 *
 * @example
 * function NearbyEventsMap() {
 *   const { latitude, longitude } = useGeolocation();
 *   const [radius, setRadius] = useState(10);
 *   const [genre, setGenre] = useState<Genre | undefined>();
 *
 *   const { events, isLoading } = useNearbyEvents({
 *     latitude,
 *     longitude,
 *     radiusMiles: radius,
 *     genre,
 *     enabled: !!latitude && !!longitude
 *   });
 *
 *   return (
 *     <Map>
 *       {events.map(event => (
 *         <Marker
 *           key={event._id}
 *           position={event.venue?.coordinates}
 *           label={`${event.distance} mi`}
 *         />
 *       ))}
 *     </Map>
 *   );
 * }
 */
export function useNearbyEvents(options: {
  latitude: number | null;
  longitude: number | null;
  radiusMiles: number;
  genre?: Genre;
  limit?: number;
  enabled?: boolean;
}) {
  const {
    latitude,
    longitude,
    radiusMiles,
    genre,
    limit,
    enabled = true,
  } = options;

  const shouldQuery = enabled && latitude !== null && longitude !== null;

  const events = useQuery(
    api.events.listNearby,
    shouldQuery
      ? {
          latitude: latitude!,
          longitude: longitude!,
          radiusMiles,
          genre,
          limit,
        }
      : "skip",
  );

  return {
    /** Array of event documents with distance property added */
    events: events ?? [],
    /** True while the query is loading (only when coordinates are available) */
    isLoading: shouldQuery && events === undefined,
  };
}

/**
 * Hook for the current fan's RSVP ticket payload.
 * Auto-bootstraps missing tickets for legacy RSVP rows.
 */
export function useMyEventTicket(eventId: Id<"events"> | undefined) {
  const ticketPayload = useQuery(
    api.events.getMyEventTicket,
    eventId ? { eventId } : "skip",
  );
  const ensureTicket = useMutation(api.events.ensureMyEventTicket);

  useEffect(() => {
    if (!eventId || !ticketPayload?.requiresTicketBootstrap) {
      return;
    }

    void ensureTicket({ eventId }).catch(() => {
      // Best-effort bootstrap for legacy data. UI still supports manual retry.
    });
  }, [eventId, ticketPayload?.requiresTicketBootstrap, ensureTicket]);

  return {
    ticket: (ticketPayload ?? null) as MyEventTicketPayload | null,
    isLoading: eventId !== undefined && ticketPayload === undefined,
    ensureTicket: () =>
      eventId ? ensureTicket({ eventId }) : Promise.resolve(null),
  };
}

/**
 * Hook for check-in capability flags for an event.
 */
export function useEventCheckinAccess(eventId: Id<"events"> | undefined) {
  const access = useQuery(
    api.events.getEventCheckinAccess,
    eventId ? { eventId } : "skip",
  );

  return {
    access,
    canScan: access?.canScan ?? false,
    canManageStaff: access?.canManageStaff ?? false,
    role: access?.role ?? null,
    managerBandIds: access?.managerBandIds ?? [],
    isLoading: eventId !== undefined && access === undefined,
  };
}

/**
 * Hook for manager check-in staff assignment flows.
 */
export function useEventCheckinStaff(
  eventId: Id<"events"> | undefined,
  bandId: Id<"bands"> | undefined,
) {
  const convex = useConvex();
  const staffResult = useQuery(
    api.events.listEventCheckinStaff,
    eventId && bandId ? { eventId, bandId } : "skip",
  );
  const assignByIdMutation = useMutation(api.events.assignEventCheckinStaff);
  const removeMutation = useMutation(api.events.removeEventCheckinStaff);
  const searchAssignableUsers = useCallback(
    async (query: string, limit = 8) => {
      if (!eventId || !bandId) {
        throw new Error("Event and band context are required");
      }

      const result = await convex.query(
        api.events.searchAssignableEventCheckinUsers,
        {
          eventId,
          bandId,
          query,
          limit,
        },
      );

      return (result.users ?? []) as EventCheckinAssignableUser[];
    },
    [bandId, convex, eventId],
  );

  const assignByUserId = useCallback(
    async (staffUserId: Id<"users">) => {
      if (!eventId || !bandId) {
        throw new Error("Event and band context are required");
      }
      return await assignByIdMutation({ eventId, bandId, staffUserId });
    },
    [assignByIdMutation, bandId, eventId],
  );

  const removeStaff = useCallback(
    async (staffUserId: Id<"users">) => {
      if (!eventId || !bandId) {
        throw new Error("Event and band context are required");
      }
      return await removeMutation({ eventId, bandId, staffUserId });
    },
    [bandId, eventId, removeMutation],
  );

  return {
    staff: (staffResult?.staff ?? []) as EventCheckinStaff[],
    isLoading:
      eventId !== undefined &&
      bandId !== undefined &&
      staffResult === undefined,
    searchAssignableUsers,
    assignByUserId,
    removeStaff,
  };
}

/**
 * Hook for submitting scanned ticket payloads.
 */
export function useEventTicketScanner(eventId: Id<"events"> | undefined) {
  const scanMutation = useMutation(api.events.scanEventTicket);

  return {
    scanTicket: async (qrValue: string) => {
      if (!eventId) {
        throw new Error("Event ID is required to scan tickets");
      }
      return (await scanMutation({
        eventId,
        qrValue,
      })) as EventTicketScanResult;
    },
  };
}
