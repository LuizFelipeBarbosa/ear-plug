"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEvents, useSearchEvents, useNearbyEvents } from "@/hooks/useEvents";
import { useGeolocation } from "@/hooks/useGeolocation";
import { EventCard } from "@/components/events/EventCard";
import { GenreFilter } from "@/components/ui/GenreFilter";
import { DistanceSlider } from "@/components/ui/DistanceSlider";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, GENRES } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";

const VALID_GENRES: Genre[] = ["indie", "rock", "jazz", "electronic", "folk", "pop", "alternative"];

export function FanMapView() {
  const searchParams = useSearchParams();
  const genreParam = searchParams.get("genre") as Genre | null;

  const [searchQuery, setSearchQuery] = useState("");
  // Initialize from URL param if valid, otherwise undefined
  const [selectedGenre, setSelectedGenre] = useState<Genre | undefined>(
    genreParam && VALID_GENRES.includes(genreParam) ? genreParam : undefined
  );
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<Id<"events"> | null>(null);
  const [distanceRadius, setDistanceRadius] = useState(25); // Default 25 miles
  const [useDistanceFilter, setUseDistanceFilter] = useState(false);

  // Geolocation
  const {
    latitude,
    longitude,
    loading: locationLoading,
    requestPosition,
    hasLocation
  } = useGeolocation();

  // Regular events (no distance filter)
  const { events: regularEvents, isLoading: regularLoading } = useEvents({ genre: selectedGenre });

  // Nearby events (with distance filter)
  const { events: nearbyEvents, isLoading: nearbyLoading } = useNearbyEvents({
    latitude,
    longitude,
    radiusMiles: distanceRadius,
    genre: selectedGenre,
    enabled: useDistanceFilter && hasLocation,
  });

  const { results: searchResults } = useSearchEvents(searchQuery);

  // Determine which events to display
  const events = useDistanceFilter && hasLocation ? nearbyEvents : regularEvents;
  const isLoading = useDistanceFilter && hasLocation ? nearbyLoading : regularLoading;

  const displayEvents = searchQuery.length >= 2 ? searchResults : events;

  // Enable distance filter when location becomes available
  useEffect(() => {
    if (hasLocation && !useDistanceFilter) {
      setUseDistanceFilter(true);
    }
  }, [hasLocation, useDistanceFilter]);

  // Sync genre from URL param and show filters if genre is set
  useEffect(() => {
    if (genreParam && VALID_GENRES.includes(genreParam)) {
      setSelectedGenre(genreParam);
      setShowFilters(true); // Show filters so user can see/clear the active filter
    }
  }, [genreParam]);

  // Map center - use user location if available
  const mapCenter = useMemo(() => {
    if (hasLocation && latitude && longitude) {
      return { lat: latitude, lng: longitude };
    }
    return DEFAULT_MAP_CENTER;
  }, [hasLocation, latitude, longitude]);

  const selectedEvent = useMemo(
    () => displayEvents?.find((e) => e._id === selectedEventId),
    [displayEvents, selectedEventId]
  );

  const handleMarkerClick = useCallback((eventId: Id<"events">) => {
    setSelectedEventId(eventId);
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="h-screen flex flex-col">
      {/* Search Bar */}
      <div className="relative z-10 p-4 bg-white dark:bg-surface-dark shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events, bands, or venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-surface-dark-secondary rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-3 rounded-xl transition-colors",
              showFilters
                ? "bg-primary-500 text-white"
                : "bg-gray-100 dark:bg-surface-dark-secondary text-gray-600 dark:text-gray-400"
            )}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-4">
            {/* Genre Filter */}
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Genre
              </span>
              <GenreFilter
                selected={selectedGenre}
                onSelect={setSelectedGenre}
                showAll
              />
            </div>

            {/* Distance Filter */}
            <DistanceSlider
              value={distanceRadius}
              onChange={setDistanceRadius}
              hasLocation={hasLocation}
              onRequestLocation={requestPosition}
              loading={locationLoading}
            />
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              center={mapCenter}
              defaultZoom={DEFAULT_MAP_ZOOM}
              mapId="ear-plug-map"
              gestureHandling="greedy"
              disableDefaultUI
              className="w-full h-full"
            >
              {/* User location marker */}
              {hasLocation && latitude && longitude && (
                <AdvancedMarker
                  position={{ lat: latitude, lng: longitude }}
                  zIndex={1000}
                >
                  <div className="relative">
                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-30" />
                  </div>
                </AdvancedMarker>
              )}
              {displayEvents?.map((event) => {
                if (!event.venue?.coordinates) return null;

                return (
                  <AdvancedMarker
                    key={event._id}
                    position={{
                      lat: event.venue.coordinates.lat,
                      lng: event.venue.coordinates.lng,
                    }}
                    onClick={() => handleMarkerClick(event._id)}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg cursor-pointer transition-transform hover:scale-110",
                        selectedEventId === event._id
                          ? "bg-accent-500 scale-125"
                          : "bg-primary-500"
                      )}
                    >
                      {event.rsvpCount}
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Info Window */}
              {selectedEvent && selectedEvent.venue?.coordinates && (
                <InfoWindow
                  position={{
                    lat: selectedEvent.venue.coordinates.lat,
                    lng: selectedEvent.venue.coordinates.lng,
                  }}
                  onCloseClick={() => setSelectedEventId(null)}
                >
                  <div className="p-2 max-w-[250px]">
                    <EventCard event={selectedEvent} variant="compact" showLikeButton={false} />
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-surface-dark-secondary">
            <p className="text-gray-500">Map requires Google Maps API key</p>
          </div>
        )}
      </div>

      {/* Near You List */}
      <div className="bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {useDistanceFilter && hasLocation ? `Within ${distanceRadius} miles` : "Near You"}
            </h2>
            {displayEvents && displayEvents.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {displayEvents.length} event{displayEvents.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 dark:bg-surface-dark-secondary rounded-xl animate-pulse" />
                ))}
              </div>
            ) : displayEvents && displayEvents.length > 0 ? (
              displayEvents.slice(0, 5).map((event: any) => (
                <div key={event._id} className="relative">
                  <EventCard event={event} variant="compact" />
                  {event.distance !== undefined && (
                    <span className="absolute top-2 right-2 text-xs bg-gray-900/70 text-white px-2 py-0.5 rounded-full">
                      {event.distance} mi
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                {useDistanceFilter && hasLocation
                  ? `No events within ${distanceRadius} miles`
                  : "No events found"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
