/**
 * @fileoverview Custom hooks for band management and following.
 * Provides access to band profiles, statistics, analytics, and fan interactions.
 * @module hooks/useBand
 */

"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useProfileContext } from "./useProfileContext";

/**
 * Hook for accessing and managing the current musician user's band.
 * Provides band data, statistics, and CRUD operations.
 *
 * @returns Object containing band data and management functions
 *
 * @example
 * function BandDashboard() {
 *   const { band, bandWithStats, isLoading, createBand, updateBand } = useCurrentBand();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   if (!band) {
 *     return <CreateBandForm onSubmit={createBand} />;
 *   }
 *
 *   return (
 *     <div>
 *       <h1>{band.name}</h1>
 *       <p>Total RSVPs: {bandWithStats?.stats.totalRsvps}</p>
 *       <p>Shows this month: {bandWithStats?.stats.showsThisMonth}</p>
 *     </div>
 *   );
 * }
 */
export function useCurrentBand() {
  const { mode, bandId } = useProfileContext();
  const activeBandId = mode === "band" ? bandId : undefined;

  /** Basic band document for the active workspace */
  const band = useQuery(
    api.bands.getById,
    activeBandId ? { bandId: activeBandId } : "skip"
  );

  /** Band document with aggregated statistics */
  const bandWithStats = useQuery(
    api.bands.getBandWithStats,
    activeBandId ? { bandId: activeBandId } : "skip"
  );

  /** Mutation to create a new band */
  const createBand = useMutation(api.bands.create);

  /** Mutation to update band profile */
  const updateBand = useMutation(api.bands.update);

  return {
    /** The current user's band document, or null if none exists */
    band,
    /** Band document with stats (showsThisMonth, totalRsvps, newFans) */
    bandWithStats,
    /** True while the band query is loading */
    isLoading: activeBandId !== undefined && band === undefined,
    /** Active band id from profile context */
    activeBandId,
    /** Mutation to create a new band profile */
    createBand,
    /** Mutation to update the band profile */
    updateBand,
  };
}

/**
 * Hook for accessing analytics data for a specific band.
 * Provides chart-ready data for the musician dashboard.
 *
 * @param bandId - The Convex ID of the band, or undefined to skip the query
 * @returns Object containing analytics data and loading state
 *
 * @example
 * function AnalyticsPage() {
 *   const { band } = useCurrentBand();
 *   const { analytics, isLoading } = useBandAnalytics(band?._id);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <BarChart data={analytics?.eventComparison} />
 *       <PieChart data={analytics?.trafficData} />
 *     </div>
 *   );
 * }
 */
export function useBandAnalytics(bandId: Id<"bands"> | undefined) {
  /** Analytics data including event comparison and traffic breakdown */
  const analytics = useQuery(
    api.bands.getAnalytics,
    bandId ? { bandId } : "skip"
  );

  return {
    /** Analytics data object with chart-ready arrays */
    analytics,
    /** True while the analytics query is loading */
    isLoading: analytics === undefined,
  };
}

/**
 * Hook for listing a band's past confirmed shows with flyer-ready display fields.
 */
export function useBandPastShows(bandId: Id<"bands"> | undefined) {
  const events = useQuery(
    api.events.listByBand,
    bandId ? { bandId, includesPast: true } : "skip"
  );

  const pastShows = (events ?? [])
    .filter(
      (
        event
      ): event is typeof event & {
        dateTime: number;
      } =>
        typeof event.dateTime === "number" &&
        Number.isFinite(event.dateTime) &&
        event.dateTime < Date.now() &&
        event.status === "confirmed"
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

/**
 * Hook for managing saved/followed bands for the current user.
 * Provides the list of saved bands and toggle functionality.
 *
 * @returns Object containing saved bands list and toggle function
 *
 * @example
 * function SavedBandsPage() {
 *   const { savedBands, isLoading, toggleSave } = useSavedBands();
 *
 *   return (
 *     <div>
 *       {savedBands.map(band => (
 *         <BandCard
 *           key={band._id}
 *           band={band}
 *           onUnsave={() => toggleSave(band._id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 *
 * @example
 * // Toggle save status from a band profile
 * function BandProfile({ bandId }: { bandId: Id<"bands"> }) {
 *   const { toggleSave } = useSavedBands();
 *
 *   return (
 *     <button onClick={() => toggleSave(bandId)}>
 *       Save Band
 *     </button>
 *   );
 * }
 */
export function useSavedBands() {
  /** Array of saved band documents */
  const savedBands = useQuery(api.bands.getSavedBands);

  /** Mutation to toggle save status */
  const toggleSave = useMutation(api.bands.toggleSave);

  return {
    /** Array of bands the user has saved/followed */
    savedBands: savedBands ?? [],
    /** True while the saved bands query is loading */
    isLoading: savedBands === undefined,
    /**
     * Toggles the save status of a band.
     * If saved, unsaves it. If not saved, saves it.
     *
     * @param bandId - The Convex ID of the band to toggle
     */
    toggleSave: (bandId: Id<"bands">) => toggleSave({ bandId }),
  };
}
