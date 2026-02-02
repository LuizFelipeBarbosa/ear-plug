/**
 * Shared TypeScript types for the Ear-Plug web application
 */

import type { Genre } from "@ear-plug/shared/types";

/**
 * Venue data extracted from Google Places
 */
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

/**
 * Event input for creating new events
 */
export interface CreateEventInput {
    title: string;
    bandId: string;
    date: string; // ISO date string (YYYY-MM-DD)
    startTime: string; // HH:MM format
    endTime?: string; // HH:MM format
    venue: VenueLocationData;
    image?: string;
    genres: Genre[]; // Multiple genres supported
    capacity?: number;
    description?: string;
    price?: number;
}

/**
 * Geolocation state
 */
export interface GeolocationState {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    error: string | null;
    loading: boolean;
    timestamp: number | null;
}

/**
 * Geolocation options
 */
export interface GeolocationOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
}
