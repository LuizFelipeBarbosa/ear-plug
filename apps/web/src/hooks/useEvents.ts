"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Genre } from "@ear-plug/shared/types";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useEvents(options?: { genre?: Genre; limit?: number }) {
  const events = useQuery(
    api.events.listUpcoming,
    options?.limit ? { limit: options.limit } : {}
  );

  const eventsByGenre = useQuery(
    api.events.listByGenre,
    options?.genre ? { genre: options.genre, limit: options.limit } : "skip"
  );

  return {
    events: options?.genre ? eventsByGenre : events,
    isLoading: (options?.genre ? eventsByGenre : events) === undefined,
  };
}

export function useEvent(eventId: Id<"events"> | undefined) {
  const event = useQuery(
    api.events.getById,
    eventId ? { eventId } : "skip"
  );
  const eventStatus = useQuery(
    api.events.getUserEventStatus,
    eventId ? { eventId } : "skip"
  );

  const rsvp = useMutation(api.events.rsvp);
  const toggleLike = useMutation(api.events.toggleLike);

  return {
    event,
    hasRsvp: eventStatus?.hasRsvp ?? false,
    hasLiked: eventStatus?.hasLiked ?? false,
    isLoading: event === undefined,
    rsvp: () => eventId && rsvp({ eventId }),
    toggleLike: () => eventId && toggleLike({ eventId }),
  };
}

export function useUserEvents() {
  const rsvps = useQuery(api.events.getUserRsvps);
  const likes = useQuery(api.events.getUserLikes);
  const pastRsvps = useQuery(api.events.getUserPastRsvps);

  return {
    rsvps: rsvps ?? [],
    likes: likes ?? [],
    pastRsvps: pastRsvps ?? [],
    isLoading: rsvps === undefined || likes === undefined || pastRsvps === undefined,
  };
}

export function useSearchEvents(query: string) {
  const results = useQuery(
    api.events.search,
    query.length >= 2 ? { query, limit: 20 } : "skip"
  );

  return {
    results: results ?? [],
    isLoading: results === undefined,
  };
}

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
    events: events ?? [],
    isLoading: shouldQuery && events === undefined,
  };
}
