/**
 * useGeolocation Hook Usage Examples
 *
 * Complete examples demonstrating the geolocation hook for location-based
 * features like nearby events, venue distances, and map centering.
 */
"use client";

import { useState, useEffect } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNearbyEvents } from "@/hooks/useEvents";
import { useNearbyVenues } from "@/hooks/useVenues";
import type { Genre } from "@ear-plug/shared/types";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { formatEventDate, DISTANCE_OPTIONS, DEFAULT_MAP_CENTER } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";

// =============================================================================
// EXAMPLE 1: Basic Location Display
// =============================================================================

/**
 * Simple component showing user's current location.
 * Demonstrates basic useGeolocation usage.
 */
export function LocationDisplayExample() {
  const {
    latitude,
    longitude,
    accuracy,
    loading,
    error,
    supported,
    requestPosition,
    hasLocation,
  } = useGeolocation();

  // Not supported in this browser
  if (!supported) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500 text-red-400">
        Geolocation is not supported by your browser.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Your Location</h2>

      {/* Status Display */}
      <div className="p-4 bg-night-tertiary border border-zinc-800 space-y-2">
        {loading && (
          <div className="flex items-center gap-2 text-zinc-400">
            <div className="w-4 h-4 border-2 border-lime border-t-transparent rounded-full animate-spin" />
            Acquiring location...
          </div>
        )}

        {error && (
          <div className="text-red-400">
            <p className="font-medium">Error: {getLocationErrorMessage(error)}</p>
            <button
              onClick={requestPosition}
              className="mt-2 text-sm text-lime hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {hasLocation && (
          <div className="space-y-1">
            <p className="text-zinc-300">
              <span className="text-zinc-500">Latitude:</span>{" "}
              {latitude?.toFixed(6)}
            </p>
            <p className="text-zinc-300">
              <span className="text-zinc-500">Longitude:</span>{" "}
              {longitude?.toFixed(6)}
            </p>
            <p className="text-zinc-300">
              <span className="text-zinc-500">Accuracy:</span>{" "}
              {accuracy ? `${Math.round(accuracy)} meters` : "Unknown"}
            </p>
          </div>
        )}

        {!loading && !hasLocation && !error && (
          <button
            onClick={requestPosition}
            className="px-4 py-2 bg-lime text-night font-bold hover:bg-lime/90"
          >
            Get My Location
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// EXAMPLE 2: Distance Calculation
// =============================================================================

interface Venue {
  _id: Id<"venues">;
  name: string;
  address: string;
  city: string;
  coordinates: { lat: number; lng: number };
}

/**
 * Component showing distances to venues.
 * Demonstrates the getDistance helper function.
 */
export function VenueDistanceExample({ venues }: { venues: Venue[] }) {
  const { hasLocation, getDistance, requestPosition, loading } = useGeolocation();

  // Calculate distance for each venue
  const venuesWithDistance = venues
    .map((venue) => ({
      ...venue,
      distance: getDistance(venue.coordinates.lat, venue.coordinates.lng),
    }))
    .sort((a, b) => {
      // Sort by distance (null values at end)
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Nearby Venues</h2>
        {!hasLocation && (
          <button
            onClick={requestPosition}
            disabled={loading}
            className="text-sm text-lime hover:underline"
          >
            {loading ? "Getting location..." : "Enable location for distances"}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {venuesWithDistance.map((venue) => (
          <div
            key={venue._id}
            className="flex items-center justify-between p-4 bg-night-tertiary border border-zinc-800"
          >
            <div>
              <h3 className="font-medium text-white">{venue.name}</h3>
              <p className="text-sm text-zinc-400">{venue.city}</p>
            </div>
            {venue.distance !== null ? (
              <span className="text-lime font-bold">
                {venue.distance < 1
                  ? `${(venue.distance * 5280).toFixed(0)} ft`
                  : `${venue.distance.toFixed(1)} mi`}
              </span>
            ) : (
              <span className="text-zinc-500 text-sm">--</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// EXAMPLE 3: Continuous Location Watching
// =============================================================================

/**
 * Live location tracking component.
 * Demonstrates the watch option for continuous updates.
 */
export function LiveLocationExample() {
  // Enable continuous position updates
  const {
    latitude,
    longitude,
    accuracy,
    loading,
    hasLocation,
  } = useGeolocation({ watch: true });

  const [history, setHistory] = useState<
    Array<{ lat: number; lng: number; time: Date }>
  >([]);

  // Track location history
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setHistory((prev) => [
        ...prev.slice(-9), // Keep last 10
        { lat: latitude, lng: longitude, time: new Date() },
      ]);
    }
  }, [latitude, longitude]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">Live Location</h2>
        {loading && (
          <span className="px-2 py-1 text-xs bg-lime/20 text-lime rounded">
            Tracking
          </span>
        )}
      </div>

      {/* Current Position */}
      <div className="p-4 bg-night-tertiary border border-zinc-800">
        {hasLocation ? (
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-mono text-lime">
                {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
              </p>
              <p className="text-sm text-zinc-400">
                Accuracy: {accuracy ? `${Math.round(accuracy)}m` : "Unknown"}
              </p>
            </div>
            <div className="w-4 h-4 bg-lime rounded-full animate-pulse" />
          </div>
        ) : (
          <p className="text-zinc-400">Waiting for location...</p>
        )}
      </div>

      {/* Position History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">
            Recent positions
          </h3>
          <div className="space-y-1 text-sm font-mono">
            {history.slice().reverse().map((pos, i) => (
              <div
                key={i}
                className={cn(
                  "text-zinc-500",
                  i === 0 && "text-zinc-300"
                )}
              >
                {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}{" "}
                <span className="text-zinc-600">
                  {pos.time.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXAMPLE 4: Map Center with Location
// =============================================================================

/**
 * Map center control with location button.
 * Demonstrates using geolocation to center a map.
 */
export function MapCenterExample() {
  const {
    latitude,
    longitude,
    hasLocation,
    requestPosition,
    loading,
    error,
  } = useGeolocation();

  // Map center state (would be passed to your map component)
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);

  // Center on user when location is available
  const centerOnUser = () => {
    if (hasLocation && latitude !== null && longitude !== null) {
      setMapCenter({ lat: latitude, lng: longitude });
    } else {
      requestPosition();
    }
  };

  // Update map center when location becomes available
  useEffect(() => {
    if (hasLocation && latitude !== null && longitude !== null) {
      setMapCenter({ lat: latitude, lng: longitude });
    }
  }, [hasLocation, latitude, longitude]);

  return (
    <div className="space-y-4">
      {/* Map Placeholder */}
      <div className="relative h-64 bg-night-tertiary border border-zinc-800 overflow-hidden">
        {/* This would be your actual map component */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-zinc-400">Map centered at:</p>
            <p className="font-mono text-lime">
              {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Center on me button */}
        <button
          onClick={centerOnUser}
          disabled={loading}
          className={cn(
            "absolute bottom-4 right-4 p-3 rounded-full shadow-lg transition-colors",
            hasLocation
              ? "bg-lime text-night hover:bg-lime/90"
              : "bg-night text-white border border-zinc-700 hover:border-lime"
          )}
          title={hasLocation ? "Center on my location" : "Get my location"}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
        </button>

        {/* User location marker */}
        {hasLocation && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 bg-lime rounded-full border-2 border-white shadow-lg" />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-400">
          {getLocationErrorMessage(error)}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// EXAMPLE 5: Nearby Events Discovery
// =============================================================================

/**
 * Complete nearby events discovery with geolocation.
 * Demonstrates full integration pattern.
 */
export function NearbyEventsDiscoveryExample() {
  const [radius, setRadius] = useState(10);
  const [genre, setGenre] = useState<Genre | undefined>();

  // Geolocation hook
  const geo = useGeolocation();

  // Nearby events query - enabled only when we have location
  const { events, isLoading: eventsLoading } = useNearbyEvents({
    latitude: geo.latitude,
    longitude: geo.longitude,
    radiusMiles: radius,
    genre,
    limit: 20,
    enabled: geo.hasLocation,
  });

  // Nearby venues for the map
  const nearbyVenues = useNearbyVenues(
    geo.latitude ?? undefined,
    geo.longitude ?? undefined,
    radius
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Discover Events</h1>

      {/* Location Status Bar */}
      <LocationStatusBar geo={geo} />

      {/* Filters */}
      {geo.hasLocation && (
        <div className="flex flex-wrap gap-4">
          {/* Distance Selector */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase tracking-wide">
              Distance
            </label>
            <div className="flex">
              {DISTANCE_OPTIONS.map((miles) => (
                <button
                  key={miles}
                  onClick={() => setRadius(miles)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium border-y first:border-l last:border-r border-zinc-700",
                    radius === miles
                      ? "bg-lime text-night"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  {miles} mi
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {(geo.loading || eventsLoading) && (
        <div className="flex items-center gap-2 text-zinc-400">
          <div className="w-4 h-4 border-2 border-lime border-t-transparent rounded-full animate-spin" />
          {geo.loading ? "Getting your location..." : "Finding events..."}
        </div>
      )}

      {/* Results */}
      {geo.hasLocation && !eventsLoading && (
        <div className="space-y-4">
          <p className="text-zinc-400">
            {events.length} event{events.length !== 1 && "s"} within {radius}{" "}
            miles of you
          </p>

          {events.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p>No events found nearby.</p>
              <p className="text-sm mt-1">Try increasing the distance.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event: { _id: Id<"events">; title: string; dateTime: number; distance?: number; venue?: { name: string; city: string } | null }) => (
                <div
                  key={event._id}
                  className="flex items-center gap-4 p-4 bg-night-tertiary border border-zinc-800 hover:border-lime/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">
                      {event.title}
                    </h3>
                    <p className="text-sm text-zinc-400 truncate">
                      {event.venue?.name}, {event.venue?.city}
                    </p>
                    <p className="text-sm text-lime">
                      {formatEventDate(event.dateTime)}
                    </p>
                  </div>
                  {event.distance !== undefined && (
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xl font-bold text-lime">
                        {event.distance.toFixed(1)}
                      </span>
                      <span className="text-sm text-zinc-400 ml-1">mi</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Location status indicator bar.
 */
function LocationStatusBar({
  geo,
}: {
  geo: ReturnType<typeof useGeolocation>;
}) {
  if (!geo.supported) {
    return (
      <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
        Geolocation is not supported by your browser.
      </div>
    );
  }

  if (geo.error) {
    return (
      <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30">
        <span className="text-red-400 text-sm">
          {getLocationErrorMessage(geo.error)}
        </span>
        <button
          onClick={geo.requestPosition}
          className="text-sm text-lime hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (geo.hasLocation) {
    return (
      <div className="flex items-center gap-2 p-3 bg-lime/10 border border-lime/30">
        <div className="w-2 h-2 bg-lime rounded-full" />
        <span className="text-sm text-lime">
          Location enabled
          {geo.accuracy && ` (${Math.round(geo.accuracy)}m accuracy)`}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-night-tertiary border border-zinc-800">
      <span className="text-zinc-400 text-sm">
        Enable location for nearby events
      </span>
      <button
        onClick={geo.requestPosition}
        disabled={geo.loading}
        className="px-3 py-1 text-sm bg-lime text-night font-medium hover:bg-lime/90 disabled:opacity-50"
      >
        {geo.loading ? "Getting..." : "Enable"}
      </button>
    </div>
  );
}

/**
 * Convert GeolocationPositionError to user-friendly message.
 */
function getLocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return "Location access was denied. Please enable location in your browser settings.";
    case 2: // POSITION_UNAVAILABLE
      return "Unable to determine your location. Please try again.";
    case 3: // TIMEOUT
      return "Location request timed out. Please try again.";
    default:
      return error.message || "An error occurred while getting your location.";
  }
}
