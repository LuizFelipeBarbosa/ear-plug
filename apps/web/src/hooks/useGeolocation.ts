/**
 * @fileoverview Custom hook for browser geolocation access.
 * Provides user location, distance calculation, and error handling.
 * @module hooks/useGeolocation
 */

"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * State returned by the useGeolocation hook.
 */
export interface GeolocationState {
  /** User's latitude in decimal degrees, or null if not available */
  latitude: number | null;
  /** User's longitude in decimal degrees, or null if not available */
  longitude: number | null;
  /** Accuracy of the position in meters, or null if not available */
  accuracy: number | null;
  /** Geolocation error if one occurred, or null */
  error: GeolocationPositionError | null;
  /** True while a position request is in progress */
  loading: boolean;
  /** True if the browser supports geolocation API */
  supported: boolean;
}

/**
 * Configuration options for geolocation requests.
 */
export interface GeolocationOptions {
  /** Request high-accuracy position (may be slower and use more battery) */
  enableHighAccuracy?: boolean;
  /** Maximum time to wait for a position in milliseconds */
  timeout?: number;
  /** Maximum age of a cached position to accept in milliseconds */
  maximumAge?: number;
  /** If true, continuously watch position changes */
  watch?: boolean;
}

/** Default geolocation options */
const defaultOptions: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000, // 1 minute cache
  watch: false,
};

/**
 * Hook for accessing user's geographic location via the browser Geolocation API.
 * Provides current position, distance calculation, and error handling.
 *
 * @param options - Optional geolocation configuration
 * @returns Object containing location state and helper functions
 *
 * @example
 * function LocationDisplay() {
 *   const { latitude, longitude, loading, error, requestPosition, supported } = useGeolocation();
 *
 *   if (!supported) return <p>Geolocation not supported</p>;
 *
 *   if (loading) return <Spinner />;
 *
 *   if (error) return <p>Error: {error.message}</p>;
 *
 *   return latitude && longitude ? (
 *     <p>Your location: {latitude}, {longitude}</p>
 *   ) : (
 *     <button onClick={requestPosition}>Get Location</button>
 *   );
 * }
 *
 * @example
 * // Continuous position watching
 * function LiveLocationMap() {
 *   const { latitude, longitude, hasLocation } = useGeolocation({ watch: true });
 *
 *   return hasLocation ? (
 *     <Map center={[latitude!, longitude!]} />
 *   ) : (
 *     <p>Acquiring location...</p>
 *   );
 * }
 *
 * @example
 * // Distance calculation
 * function DistanceToVenue({ venueLat, venueLng }: { venueLat: number; venueLng: number }) {
 *   const { getDistance, hasLocation } = useGeolocation();
 *
 *   const distance = getDistance(venueLat, venueLng);
 *
 *   return hasLocation && distance !== null ? (
 *     <p>{distance.toFixed(1)} miles away</p>
 *   ) : null;
 * }
 */
export function useGeolocation(options: GeolocationOptions = {}) {
  const mergedOptions = { ...defaultOptions, ...options };

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    supported: typeof navigator !== "undefined" && "geolocation" in navigator,
  });

  /**
   * Handler for successful position acquisition.
   */
  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setState((prev) => ({
      ...prev,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      error: null,
      loading: false,
    }));
  }, []);

  /**
   * Handler for position acquisition errors.
   */
  const handleError = useCallback((error: GeolocationPositionError) => {
    setState((prev) => ({
      ...prev,
      error,
      loading: false,
    }));
  }, []);

  /**
   * Requests the current position from the browser.
   * Updates state with the result or error.
   */
  const requestPosition = useCallback(() => {
    if (!state.supported) {
      setState((prev) => ({
        ...prev,
        error: {
          code: 2,
          message: "Geolocation is not supported by this browser",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: mergedOptions.enableHighAccuracy,
      timeout: mergedOptions.timeout,
      maximumAge: mergedOptions.maximumAge,
    });
  }, [
    state.supported,
    handleSuccess,
    handleError,
    mergedOptions.enableHighAccuracy,
    mergedOptions.timeout,
    mergedOptions.maximumAge,
  ]);

  // Set up position watching if enabled
  useEffect(() => {
    if (!mergedOptions.watch || !state.supported) return;

    setState((prev) => ({ ...prev, loading: true }));

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [
    mergedOptions.watch,
    mergedOptions.enableHighAccuracy,
    mergedOptions.timeout,
    mergedOptions.maximumAge,
    state.supported,
    handleSuccess,
    handleError,
  ]);

  /**
   * Calculates the distance from the user's current location to a target point.
   * Uses the Haversine formula for accurate great-circle distance.
   *
   * @param targetLat - Latitude of the target point
   * @param targetLng - Longitude of the target point
   * @returns Distance in miles, or null if user location is not available
   */
  const getDistance = useCallback(
    (targetLat: number, targetLng: number): number | null => {
      if (state.latitude === null || state.longitude === null) return null;

      const R = 3958.8; // Earth's radius in miles
      const dLat = toRad(targetLat - state.latitude);
      const dLon = toRad(targetLng - state.longitude);
      const lat1 = toRad(state.latitude);
      const lat2 = toRad(targetLat);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) *
          Math.sin(dLon / 2) *
          Math.cos(lat1) *
          Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    [state.latitude, state.longitude],
  );

  return {
    ...state,
    /** Requests the user's current position */
    requestPosition,
    /** Calculates distance from user to a target coordinate */
    getDistance,
    /** True if a valid location has been obtained */
    hasLocation: state.latitude !== null && state.longitude !== null,
  };
}

/**
 * Converts degrees to radians.
 * @param deg - Angle in degrees
 * @returns Angle in radians
 */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
