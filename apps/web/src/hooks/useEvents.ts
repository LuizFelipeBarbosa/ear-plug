/**
 * @fileoverview Custom hooks for event discovery, RSVP, and user event management.
 * Provides access to upcoming events, search, nearby events, and user interactions.
 * @module hooks/useEvents
 */

"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Genre } from "@ear-plug/shared/types";
import type { Id } from "../../../../convex/_generated/dataModel";

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
    options?.limit ? { limit: options.limit } : {}
  );

  /** Events filtered by genre (when genre is specified) */
  const eventsByGenre = useQuery(
    api.events.listByGenre,
    options?.genre ? { genre: options.genre, limit: options.limit } : "skip"
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
  const event = useQuery(
    api.events.getById,
    eventId ? { eventId } : "skip"
  );

  /** User's RSVP and like status for this event */
  const eventStatus = useQuery(
    api.events.getUserEventStatus,
    eventId ? { eventId } : "skip"
  );

  /** Mutation to toggle RSVP status */
  const rsvp = useMutation(api.events.rsvp);

  /** Mutation to toggle like status */
  const toggleLike = useMutation(api.events.toggleLike);

  return {
    /** The event document with band and venue data */
    event,
    /** True if the user has RSVP'd to this event */
    hasRsvp: eventStatus?.hasRsvp ?? false,
    /** True if the user has liked this event */
    hasLiked: eventStatus?.hasLiked ?? false,
    /** True while the event query is loading */
    isLoading: event === undefined,
    /** Function to toggle RSVP status for this event */
    rsvp: () => eventId && rsvp({ eventId }),
    /** Function to toggle like status for this event */
    toggleLike: () => eventId && toggleLike({ eventId }),
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
    isLoading: rsvps === undefined || likes === undefined || pastRsvps === undefined,
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
    query.length >= 2 ? { query, limit: 20 } : "skip"
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
  const { latitude, longitude, radiusMiles, genre, limit, enabled = true } = options;

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
      : "skip"
  );

  return {
    /** Array of event documents with distance property added */
    events: events ?? [],
    /** True while the query is loading (only when coordinates are available) */
    isLoading: shouldQuery && events === undefined,
  };
}
