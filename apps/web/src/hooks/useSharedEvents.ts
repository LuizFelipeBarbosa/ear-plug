/**
 * @fileoverview Custom hooks for creating events with integrated venue management.
 * Handles event creation with automatic venue deduplication via Google Places data.
 * @module hooks/useSharedEvents
 */

"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { VenueLocationData, CreateEventInput } from "@/types";

// Re-export types for backwards compatibility
export type { VenueLocationData, CreateEventInput } from "@/types";

/**
 * Hook for creating events that are stored in the Convex database.
 * Events are visible to both Band and Fan views across the platform.
 * Handles venue creation/lookup automatically based on coordinates.
 *
 * @returns Object containing event and venue creation functions
 *
 * @example
 * function CreateEventForm() {
 *   const { createEvent, createVenue } = useSharedEvents();
 *   const { band } = useCurrentBand();
 *
 *   const handleSubmit = async (formData: CreateEventFormData) => {
 *     const { eventId, venueId } = await createEvent({
 *       title: formData.title,
 *       bandId: band._id,
 *       date: formData.date,
 *       startTime: formData.startTime,
 *       genres: formData.genres,
 *       venue: {
 *         name: formData.venueName,
 *         address: formData.venueAddress,
 *         city: formData.venueCity,
 *         coordinates: formData.venueCoordinates,
 *         placeId: formData.venuePlaceId
 *       }
 *     });
 *
 *     // Navigate to the new event
 *     router.push(`/events/${eventId}`);
 *   };
 * }
 */
export function useSharedEvents() {
  /** Mutation to create an event with venue data in one call */
  const createEventWithVenue = useMutation(api.events.createWithVenue);

  /** Mutation to create a venue from Google Places data */
  const createVenue = useMutation(api.venues.createFromPlace);

  /**
   * Creates a new event with automatic venue creation or lookup.
   * If a venue with matching coordinates exists, uses the existing venue.
   * Otherwise, creates a new venue from the provided data.
   *
   * @param input - Event creation input with venue data
   * @returns Object containing the new event ID and venue ID
   *
   * @example
   * const { eventId, venueId } = await createEvent({
   *   title: "Friday Night Live",
   *   bandId: "band123",
   *   date: "2024-06-15",
   *   startTime: "20:00",
   *   genres: ["rock", "indie"],
   *   venue: {
   *     name: "The Starry Plough",
   *     address: "3101 Shattuck Ave",
   *     city: "Berkeley",
   *     coordinates: { lat: 37.8497, lng: -122.2661 }
   *   }
   * });
   */
  const createEvent = useCallback(
    async (input: CreateEventInput): Promise<{ eventId: Id<"events">; venueId: Id<"venues"> }> => {
      // Convert date and time to timestamp
      const dateTime = new Date(`${input.date}T${input.startTime}`).getTime();

      // Create the event with venue in one mutation
      const result = await createEventWithVenue({
        title: input.title,
        bandId: input.bandId as Id<"bands">,
        dateTime,
        genres: input.genres,
        venueName: input.venue.name,
        venueAddress: input.venue.address,
        venueCity: input.venue.city,
        venueCoordinates: input.venue.coordinates,
        venuePlaceId: input.venue.placeId,
        image: input.image,
        capacity: input.capacity,
        price: input.price,
        description: input.description,
      });

      return result;
    },
    [createEventWithVenue]
  );

  /**
   * Creates a venue from Google Places data or returns existing venue ID.
   * Deduplicates venues by checking if coordinates match within a tolerance.
   *
   * @param venueData - Venue location data from Google Places
   * @returns The venue's Convex document ID (new or existing)
   *
   * @example
   * const venueId = await createVenue({
   *   name: "Bottom of the Hill",
   *   address: "1233 17th St",
   *   city: "San Francisco",
   *   coordinates: { lat: 37.7656, lng: -122.3986 },
   *   placeId: "ChIJ..."
   * });
   */
  const createVenueFromPlace = useCallback(
    async (venueData: VenueLocationData): Promise<Id<"venues">> => {
      const venueId = await createVenue({
        name: venueData.name,
        address: venueData.address,
        city: venueData.city,
        coordinates: venueData.coordinates,
        placeId: venueData.placeId,
        capacity: venueData.capacity,
      });

      return venueId;
    },
    [createVenue]
  );

  return {
    /** Creates an event with automatic venue handling */
    createEvent,
    /** Creates a venue from Google Places data */
    createVenue: createVenueFromPlace,
  };
}

/**
 * Hook specifically for band calendar event management.
 * Simplifies event creation by automatically using the current band's ID.
 * Uses Convex for all data operations.
 *
 * @param bandId - The Convex ID of the band, or undefined if not available
 * @returns Object containing band-specific event creation function
 *
 * @example
 * function BandCalendar() {
 *   const { band } = useCurrentBand();
 *   const { createEvent } = useBandEvents(band?._id);
 *
 *   const handleAddEvent = async (eventData: Omit<CreateEventInput, "bandId">) => {
 *     try {
 *       const { eventId } = await createEvent(eventData);
 *       toast.success("Event created!");
 *     } catch (error) {
 *       toast.error("Failed to create event");
 *     }
 *   };
 *
 *   return <Calendar onAddEvent={handleAddEvent} />;
 * }
 */
export function useBandEvents(bandId: string | undefined) {
  const { createEvent } = useSharedEvents();

  /**
   * Creates an event for the specified band.
   * Automatically includes the band ID in the request.
   *
   * @param input - Event creation input without bandId
   * @returns Object containing the new event ID and venue ID
   * @throws Error if bandId is not provided
   */
  const createBandEvent = useCallback(
    async (input: Omit<CreateEventInput, "bandId">) => {
      if (!bandId) throw new Error("Band ID is required");
      return createEvent({ ...input, bandId });
    },
    [bandId, createEvent]
  );

  return {
    /** Creates an event for the current band */
    createEvent: createBandEvent,
  };
}
