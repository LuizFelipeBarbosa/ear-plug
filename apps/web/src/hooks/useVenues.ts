/**
 * @fileoverview Custom hooks for venue listing, search, and booking.
 * Provides access to venues, open dates, and user saved venues.
 * @module hooks/useVenues
 */

"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Genre } from "@ear-plug/shared/types";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Hook for listing venues with optional filtering.
 *
 * @param options - Optional filter parameters
 * @param options.city - Filter venues by city name
 * @param options.limit - Maximum number of venues to return
 * @returns Object containing venues array and loading state
 *
 * @example
 * function VenueList() {
 *   const { venues, isLoading } = useVenues({ city: "Oakland" });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return venues.map(venue => (
 *     <VenueCard key={venue._id} venue={venue} />
 *   ));
 * }
 */
export function useVenues(options?: { city?: string; limit?: number }) {
  const venues = useQuery(api.venues.list, {
    city: options?.city,
    limit: options?.limit,
  });

  return {
    /** Array of venue documents */
    venues: venues ?? [],
    /** True while the venues query is loading */
    isLoading: venues === undefined,
  };
}

/**
 * Hook for getting suggested venues based on genre matching.
 * Prioritizes venues that typically host the specified genre.
 *
 * @param genre - Optional genre to prioritize in results
 * @returns Object containing suggested venues array and loading state
 *
 * @example
 * function SuggestedVenues() {
 *   const { band } = useCurrentBand();
 *   const { venues, isLoading } = useSuggestedVenues(band?.genres?.[0]);
 *
 *   return venues.map(venue => (
 *     <VenueCard key={venue._id} venue={venue} />
 *   ));
 * }
 */
export function useSuggestedVenues(genre?: Genre) {
  const venues = useQuery(api.venues.getSuggested, {
    genre,
    limit: 10,
  });

  return {
    /** Array of suggested venue documents, genre-matched first */
    venues: venues ?? [],
    /** True while the query is loading */
    isLoading: venues === undefined,
  };
}

/**
 * Hook for getting venues near a geographic location.
 * Uses Haversine formula for distance calculation.
 * Skips the query if coordinates are not provided.
 *
 * @param lat - Latitude coordinate, or undefined to skip query
 * @param lng - Longitude coordinate, or undefined to skip query
 * @param radiusMiles - Optional search radius in miles (default: 25)
 * @returns Object containing nearby venues with distances and loading state
 *
 * @example
 * function NearbyVenues() {
 *   const { latitude, longitude } = useGeolocation();
 *   const { venues, isLoading } = useNearbyVenues(latitude, longitude, 10);
 *
 *   return venues.map(venue => (
 *     <VenueCard
 *       key={venue._id}
 *       venue={venue}
 *       distance={venue.distance}
 *     />
 *   ));
 * }
 */
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
    /** Array of venue documents with distance property added */
    venues: venues ?? [],
    /** True while the query is loading */
    isLoading: venues === undefined,
  };
}

/**
 * Hook for accessing open booking dates at venues.
 * Provides open dates and application functionality for bands.
 *
 * @param options - Optional filter parameters
 * @param options.venueId - Filter to a specific venue
 * @param options.genre - Filter by preferred genre
 * @param options.limit - Maximum number of results
 * @returns Object containing open dates, loading state, and apply function
 *
 * @example
 * function OpenDatesPage() {
 *   const { openDates, isLoading, applyToOpenDate } = useOpenDates({ genre: "rock" });
 *   const { band } = useCurrentBand();
 *
 *   const handleApply = async (openDateId: Id<"openDates">) => {
 *     await applyToOpenDate({
 *       openDateId,
 *       bandId: band._id,
 *       message: "We'd love to play!"
 *     });
 *   };
 *
 *   return openDates.map(od => (
 *     <OpenDateCard
 *       key={od._id}
 *       openDate={od}
 *       onApply={() => handleApply(od._id)}
 *     />
 *   ));
 * }
 */
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

  /** Mutation to submit a band application */
  const applyToOpenDate = useMutation(api.venues.applyToOpenDate);

  return {
    /** Array of open date documents with venue data included */
    openDates: openDates ?? [],
    /** True while the query is loading */
    isLoading: openDates === undefined,
    /** Mutation to apply to an open date */
    applyToOpenDate,
  };
}

/**
 * Hook for managing saved/followed venues for the current user.
 * Provides the list of saved venues and toggle functionality.
 *
 * @returns Object containing saved venues list and toggle function
 *
 * @example
 * function SavedVenuesPage() {
 *   const { savedVenues, isLoading, toggleSave } = useSavedVenues();
 *
 *   return savedVenues.map(venue => (
 *     <VenueCard
 *       key={venue._id}
 *       venue={venue}
 *       onUnsave={() => toggleSave(venue._id)}
 *     />
 *   ));
 * }
 */
export function useSavedVenues() {
  /** Array of saved venue documents */
  const savedVenues = useQuery(api.venues.getSavedVenues);

  /** Mutation to toggle save status */
  const toggleSave = useMutation(api.venues.toggleSave);

  return {
    /** Array of venues the user has saved/followed */
    savedVenues: savedVenues ?? [],
    /** True while the query is loading */
    isLoading: savedVenues === undefined,
    /**
     * Toggles the save status of a venue.
     * If saved, unsaves it. If not saved, saves it.
     *
     * @param venueId - The Convex ID of the venue to toggle
     */
    toggleSave: (venueId: Id<"venues">) => toggleSave({ venueId }),
  };
}
