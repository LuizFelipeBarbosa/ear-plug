"use client";

import { useState, useEffect, useCallback } from "react";

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: GeolocationPositionError | null;
  loading: boolean;
  supported: boolean;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

const defaultOptions: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000, // 1 minute cache
  watch: false,
};

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

  const handleError = useCallback((error: GeolocationPositionError) => {
    setState((prev) => ({
      ...prev,
      error,
      loading: false,
    }));
  }, []);

  // Request current position
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

  // Watch position (continuous updates)
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
      }
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

  // Calculate distance between two coordinates (Haversine formula)
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
    [state.latitude, state.longitude]
  );

  return {
    ...state,
    requestPosition,
    getDistance,
    hasLocation: state.latitude !== null && state.longitude !== null,
  };
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
