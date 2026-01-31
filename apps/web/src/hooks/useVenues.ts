"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Genre } from "@ear-plug/shared/types";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useVenues(options?: { city?: string; limit?: number }) {
  const venues = useQuery(api.venues.list, {
    city: options?.city,
    limit: options?.limit,
  });

  return {
    venues: venues ?? [],
    isLoading: venues === undefined,
  };
}

export function useSuggestedVenues(genre?: Genre) {
  const venues = useQuery(api.venues.getSuggested, {
    genre,
    limit: 10,
  });

  return {
    venues: venues ?? [],
    isLoading: venues === undefined,
  };
}

export function useNearbyVenues(
  lat: number | undefined,
  lng: number | undefined,
  radiusMiles?: number
) {
  const venues = useQuery(
    api.venues.getNearby,
    lat !== undefined && lng !== undefined
      ? { lat, lng, radiusMiles }
      : "skip"
  );

  return {
    venues: venues ?? [],
    isLoading: venues === undefined,
  };
}

export function useOpenDates(options?: {
  venueId?: Id<"venues">;
  genre?: Genre;
  limit?: number;
}) {
  const openDates = useQuery(api.venues.getOpenDates, {
    venueId: options?.venueId,
    genre: options?.genre,
    limit: options?.limit,
  });

  const applyToOpenDate = useMutation(api.venues.applyToOpenDate);

  return {
    openDates: openDates ?? [],
    isLoading: openDates === undefined,
    applyToOpenDate,
  };
}

export function useSavedVenues() {
  const savedVenues = useQuery(api.venues.getSavedVenues);
  const toggleSave = useMutation(api.venues.toggleSave);

  return {
    savedVenues: savedVenues ?? [],
    isLoading: savedVenues === undefined,
    toggleSave: (venueId: Id<"venues">) => toggleSave({ venueId }),
  };
}
