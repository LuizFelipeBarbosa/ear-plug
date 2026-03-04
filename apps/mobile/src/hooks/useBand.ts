import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useProfileContext } from "@/context/ProfileContext";

export function useCurrentBand() {
  const { mode, bandId } = useProfileContext();
  const activeBandId = mode === "band" ? bandId : undefined;

  const band = useQuery(api.bands.getById, activeBandId ? { bandId: activeBandId } : "skip");
  const bandWithStats = useQuery(
    api.bands.getBandWithStats,
    activeBandId ? { bandId: activeBandId } : "skip",
  );

  const createBand = useMutation(api.bands.create);
  const updateBand = useMutation(api.bands.update);

  return {
    band,
    bandWithStats,
    isLoading: activeBandId !== undefined && band === undefined,
    activeBandId,
    createBand,
    updateBand,
  };
}

export function useBandAnalytics(bandId: Id<"bands"> | undefined) {
  const analytics = useQuery(api.bands.getAnalytics, bandId ? { bandId } : "skip");

  return {
    analytics,
    isLoading: bandId !== undefined && analytics === undefined,
  };
}

export function useBandPastShows(bandId: Id<"bands"> | undefined) {
  const events = useQuery(api.events.listByBand, bandId ? { bandId, includesPast: true } : "skip");

  const pastShows = (events ?? [])
    .filter(
      (event): event is typeof event & { dateTime: number } =>
        typeof event.dateTime === "number" &&
        Number.isFinite(event.dateTime) &&
        event.dateTime < Date.now() &&
        event.status === "confirmed",
    )
    .sort((a, b) => b.dateTime - a.dateTime)
    .map((event) => ({
      eventId: event._id,
      title: event.title?.trim() || "Untitled Gig",
      dateTime: event.dateTime,
      image: event.image,
      venueName: event.venue?.name || "Unknown Venue",
      venueCity: event.venue?.city || "Unknown City",
    }));

  return {
    pastShows,
    isLoading: bandId !== undefined && events === undefined,
  };
}

export function useSavedBands() {
  const savedBands = useQuery(api.bands.getSavedBands);
  const toggleSave = useMutation(api.bands.toggleSave);

  return {
    savedBands: savedBands ?? [],
    isLoading: savedBands === undefined,
    toggleSave: (bandId: Id<"bands">) => toggleSave({ bandId }),
  };
}
