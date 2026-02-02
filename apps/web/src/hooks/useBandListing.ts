/**
 * @fileoverview Custom hooks for band marketplace listing management.
 * Provides access to listing creation, updates, and availability management.
 * @module hooks/useBandListing
 */

"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Hook for accessing and managing the current musician's band listing.
 * Provides listing data and CRUD operations.
 *
 * @returns Object containing listing data and management functions
 *
 * @example
 * function ListingSettings() {
 *   const { listing, isLoading, createListing, updateListing } = useBandListing();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   if (!listing) {
 *     return <CreateListingForm onSubmit={createListing} />;
 *   }
 *
 *   return (
 *     <EditListingForm listing={listing} onSubmit={updateListing} />
 *   );
 * }
 */
export function useBandListing() {
  /** Current user's band listing with band data */
  const listing = useQuery(api.bandListings.getByCurrentUser);

  /** Mutation to create a new listing */
  const createListing = useMutation(api.bandListings.create);

  /** Mutation to update listing */
  const updateListing = useMutation(api.bandListings.update);

  /** Mutation to archive listing */
  const archiveListing = useMutation(api.bandListings.archive);

  return {
    /** The current user's band listing, or null if none exists */
    listing,
    /** True while the listing query is loading */
    isLoading: listing === undefined,
    /** True if the user has a listing */
    hasListing: listing !== null && listing !== undefined,
    /** Mutation to create a new listing */
    createListing,
    /** Mutation to update the listing */
    updateListing,
    /** Mutation to archive the listing */
    archiveListing,
  };
}

/**
 * Hook for searching band listings in the marketplace.
 * Used by fans to discover bands for hire.
 *
 * @param filters - Search filters
 * @returns Object containing search results and loading state
 *
 * @example
 * function BandMarketplace() {
 *   const [filters, setFilters] = useState({});
 *   const { listings, isLoading } = useBandListingSearch(filters);
 *
 *   return (
 *     <div>
 *       <FilterBar filters={filters} onChange={setFilters} />
 *       {listings.map(listing => (
 *         <BandHireCard key={listing._id} listing={listing} />
 *       ))}
 *     </div>
 *   );
 * }
 */
export function useBandListingSearch(filters: {
  eventType?: "wedding" | "corporate" | "private_party" | "public_gig" | "festival" | "other";
  genre?: "indie" | "rock" | "jazz" | "electronic" | "folk" | "pop" | "alternative";
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}) {
  const listings = useQuery(api.bandListings.search, filters);

  return {
    /** Array of matching listings with band data */
    listings: listings ?? [],
    /** True while the search query is loading */
    isLoading: listings === undefined,
  };
}

/**
 * Hook for getting a single band listing by band ID.
 *
 * @param bandId - The ID of the band
 * @returns Object containing listing data and loading state
 */
export function useBandListingByBand(bandId: Id<"bands"> | undefined) {
  const listing = useQuery(
    api.bandListings.getByBand,
    bandId ? { bandId } : "skip"
  );

  return {
    /** The band's active listing, or null if none exists */
    listing,
    /** True while the query is loading */
    isLoading: listing === undefined,
  };
}

/**
 * Hook for getting a listing by its ID.
 *
 * @param listingId - The ID of the listing
 * @returns Object containing listing data and loading state
 */
export function useBandListingById(listingId: Id<"bandListings"> | undefined) {
  const listing = useQuery(
    api.bandListings.getById,
    listingId ? { listingId } : "skip"
  );

  return {
    /** The listing with band data, or null if not found */
    listing,
    /** True while the query is loading */
    isLoading: listing === undefined,
  };
}

/**
 * Hook for managing band availability slots.
 *
 * @param bandId - The ID of the band
 * @returns Object containing availability data and management functions
 *
 * @example
 * function AvailabilityCalendar({ bandId, listingId }) {
 *   const { slots, isLoading, setAvailability, blockDates, deleteSlot } = useBandAvailability(bandId);
 *
 *   return (
 *     <Calendar
 *       slots={slots}
 *       onAddSlot={(start, end) => setAvailability({ bandId, listingId, slots: [{ startDateTime: start, endDateTime: end }] })}
 *       onBlockDates={(start, end) => blockDates({ bandId, listingId, startDateTime: start, endDateTime: end })}
 *       onDeleteSlot={(slotId) => deleteSlot({ slotId })}
 *     />
 *   );
 * }
 */
export function useBandAvailability(bandId: Id<"bands"> | undefined) {
  const slots = useQuery(
    api.bandAvailability.getByBand,
    bandId ? { bandId } : "skip"
  );

  const setAvailability = useMutation(api.bandAvailability.setAvailability);
  const blockDates = useMutation(api.bandAvailability.blockDates);
  const deleteSlot = useMutation(api.bandAvailability.deleteSlot);

  return {
    /** Array of availability slots */
    slots: slots ?? [],
    /** True while the query is loading */
    isLoading: slots === undefined,
    /** Mutation to set available slots */
    setAvailability,
    /** Mutation to block dates */
    blockDates,
    /** Mutation to delete a slot */
    deleteSlot,
  };
}

/**
 * Hook for checking band availability for a specific time.
 *
 * @param bandId - The ID of the band
 * @param startDateTime - Start time to check
 * @param endDateTime - End time to check
 * @returns Object containing availability status
 */
export function useCheckAvailability(
  bandId: Id<"bands"> | undefined,
  startDateTime: number | undefined,
  endDateTime: number | undefined
) {
  const availability = useQuery(
    api.bandAvailability.checkAvailability,
    bandId && startDateTime && endDateTime
      ? { bandId, startDateTime, endDateTime }
      : "skip"
  );

  return {
    /** Whether the band is available */
    available: availability?.available ?? false,
    /** Reason if not available */
    reason: availability?.available === false ? availability.reason : undefined,
    /** True while the query is loading */
    isLoading: availability === undefined,
  };
}

/**
 * Hook for getting available slots for a band (for fans to view).
 *
 * @param bandId - The ID of the band
 * @returns Object containing available slots
 */
export function useAvailableSlots(bandId: Id<"bands"> | undefined) {
  const slots = useQuery(
    api.bandAvailability.getAvailableSlots,
    bandId ? { bandId } : "skip"
  );

  return {
    /** Array of available slots */
    slots: slots ?? [],
    /** True while the query is loading */
    isLoading: slots === undefined,
  };
}
