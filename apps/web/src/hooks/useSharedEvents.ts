"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Genre } from "@ear-plug/shared/types";
import type { Id } from "../../../../convex/_generated/dataModel";

// Venue data extracted from Google Places
export interface VenueLocationData {
  name: string;
  address: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  placeId?: string;
  phoneNumber?: string;
  website?: string;
  capacity?: number;
}

// Event input for creating new events
export interface CreateEventInput {
  title: string;
  bandId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:MM format
  endTime?: string; // HH:MM format
  venue: VenueLocationData;
  image?: string;
  genre: Genre;
  capacity?: number;
  description?: string;
  price?: number;
}

/**
 * Hook for creating events in Convex database
 * Events are saved to the master events list and visible to both Band and Fan views
 */
export function useSharedEvents() {
  const createEventWithVenue = useMutation(api.events.createWithVenue);
  const createVenue = useMutation(api.venues.createFromPlace);

  /**
   * Create a new event with automatic venue creation/finding
   * This handles creating both the venue (if new) and the event
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
        genre: input.genre,
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
   * Create just a venue from Google Places data
   * Returns existing venue ID if coordinates match
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
    createEvent,
    createVenue: createVenueFromPlace,
  };
}

/**
 * Hook specifically for band calendar - manages events for the current band
 * Uses Convex for all data operations
 */
export function useBandEvents(bandId: string | undefined) {
  const { createEvent } = useSharedEvents();

  const createBandEvent = useCallback(
    async (input: Omit<CreateEventInput, "bandId">) => {
      if (!bandId) throw new Error("Band ID is required");
      return createEvent({ ...input, bandId });
    },
    [bandId, createEvent]
  );

  return {
    createEvent: createBandEvent,
  };
}
