import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type {
  EventCheckinAssignableUser,
  EventCheckinStaff,
  EventTicketScanResult,
  Genre,
  GuestFilterType,
  MyEventTicketPayload,
} from "@ear-plug/shared/types";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect } from "react";

export function useEvents(options?: { genre?: Genre; limit?: number }) {
  const events = useQuery(api.events.listUpcoming, options?.limit ? { limit: options.limit } : {});

  const eventsByGenre = useQuery(
    api.events.listByGenre,
    options?.genre ? { genre: options.genre, limit: options.limit } : "skip",
  );

  return {
    events: options?.genre ? eventsByGenre : events,
    isLoading: (options?.genre ? eventsByGenre : events) === undefined,
  };
}

export function useEvent(eventId: Id<"events"> | undefined) {
  const event = useQuery(api.events.getById, eventId ? { eventId } : "skip");
  const eventStatus = useQuery(api.events.getUserEventStatus, eventId ? { eventId } : "skip");
  const rsvp = useMutation(api.events.rsvp);
  const toggleLike = useMutation(api.events.toggleLike);

  return {
    event,
    hasRsvp: eventStatus?.hasRsvp ?? false,
    hasLiked: eventStatus?.hasLiked ?? false,
    isLoading: eventId !== undefined && event === undefined,
    rsvp: () => (eventId ? rsvp({ eventId }) : Promise.resolve(undefined)),
    toggleLike: () => (eventId ? toggleLike({ eventId }) : Promise.resolve(undefined)),
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
  const results = useQuery(api.events.search, query.length >= 2 ? { query, limit: 20 } : "skip");

  return {
    results: results ?? [],
    isLoading: query.length >= 2 && results === undefined,
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
          latitude,
          longitude,
          radiusMiles,
          genre,
          limit,
        }
      : "skip",
  );

  return {
    events: events ?? [],
    isLoading: shouldQuery && events === undefined,
  };
}

export function useMyEventTicket(eventId: Id<"events"> | undefined) {
  const ticketPayload = useQuery(api.events.getMyEventTicket, eventId ? { eventId } : "skip");
  const ensureTicket = useMutation(api.events.ensureMyEventTicket);

  useEffect(() => {
    if (!eventId || !ticketPayload?.requiresTicketBootstrap) {
      return;
    }

    void ensureTicket({ eventId }).catch(() => {
      // Best-effort bootstrap for legacy data.
    });
  }, [ensureTicket, eventId, ticketPayload?.requiresTicketBootstrap]);

  return {
    ticket: (ticketPayload ?? null) as MyEventTicketPayload | null,
    isLoading: eventId !== undefined && ticketPayload === undefined,
    ensureTicket: () => (eventId ? ensureTicket({ eventId }) : Promise.resolve(null)),
  };
}

export function useEventCheckinAccess(eventId: Id<"events"> | undefined) {
  const access = useQuery(api.events.getEventCheckinAccess, eventId ? { eventId } : "skip");

  return {
    access,
    canScan: access?.canScan ?? false,
    canManageStaff: access?.canManageStaff ?? false,
    role: access?.role ?? null,
    managerBandIds: access?.managerBandIds ?? [],
    isLoading: eventId !== undefined && access === undefined,
  };
}

export function useEventCheckinStaff(eventId: Id<"events"> | undefined, bandId: Id<"bands"> | undefined) {
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

      const result = await convex.query(api.events.searchAssignableEventCheckinUsers, {
        eventId,
        bandId,
        query,
        limit,
      });

      return (result.users ?? []) as EventCheckinAssignableUser[];
    },
    [bandId, convex, eventId],
  );

  const assignByUserId = useCallback(
    async (staffUserId: Id<"users">) => {
      if (!eventId || !bandId) {
        throw new Error("Event and band context are required");
      }

      return assignByIdMutation({ eventId, bandId, staffUserId });
    },
    [assignByIdMutation, bandId, eventId],
  );

  const removeStaff = useCallback(
    async (staffUserId: Id<"users">) => {
      if (!eventId || !bandId) {
        throw new Error("Event and band context are required");
      }

      return removeMutation({ eventId, bandId, staffUserId });
    },
    [bandId, eventId, removeMutation],
  );

  return {
    staff: (staffResult?.staff ?? []) as EventCheckinStaff[],
    isLoading: eventId !== undefined && bandId !== undefined && staffResult === undefined,
    searchAssignableUsers,
    assignByUserId,
    removeStaff,
  };
}

export function useEventTicketScanner(eventId: Id<"events"> | undefined) {
  const scanMutation = useMutation(api.events.scanEventTicket);

  return {
    scanTicket: async (qrValue: string) => {
      if (!eventId) {
        throw new Error("Event ID is required to scan tickets");
      }

      return (await scanMutation({ eventId, qrValue })) as EventTicketScanResult;
    },
  };
}

export function useEventGuestListSummary(eventId: Id<"events"> | undefined, bandId: Id<"bands"> | undefined) {
  const summary = useQuery(
    api.events.getEventGuestListSummary,
    eventId && bandId ? { eventId, bandId } : "skip",
  );

  return {
    summary,
    isLoading: eventId !== undefined && bandId !== undefined && summary === undefined,
  };
}

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

  const setGuestAttendanceMutation = useMutation(api.events.setEventGuestAttendance);
  const removeGuestRsvpMutation = useMutation(api.events.removeEventGuestRsvp);

  return {
    guests: guestsResult?.guests ?? [],
    capReached: guestsResult?.capReached ?? false,
    cap: guestsResult?.cap ?? 500,
    totalCount: guestsResult?.totalCount ?? 0,
    canManage: guestsResult?.canManage ?? false,
    isLoading: eventId !== undefined && bandId !== undefined && guestsResult === undefined,
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
