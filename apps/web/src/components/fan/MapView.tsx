"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { Search, SlidersHorizontal, X, ChevronUp, ChevronDown } from "lucide-react";
import { MapInfoWindow } from "@/components/maps/MapInfoWindow";
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
  const [isEventsExpanded, setIsEventsExpanded] = useState(false);

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
    <div className="h-screen flex flex-col bg-night overflow-hidden">
      {/* Search Bar - Brutalist Style */}
      <div className="relative z-10 p-4 bg-night-secondary border-b-2 border-lime/20">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search events, bands, or venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 bg-night-tertiary border-2 border-zinc-800 rounded-none text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 flex items-center justify-center hover:bg-zinc-800 rounded-full touch-target"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-3.5 border-2 flex items-center justify-center transition-all touch-target",
              showFilters
                ? "bg-lime border-lime text-night"
                : "bg-night-tertiary border-zinc-800 text-zinc-400 hover:border-zinc-600"
            )}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Filters - Glassmorphism */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t-2 border-zinc-800 space-y-4">
            {/* Genre Filter */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 block">
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
      <div
        className="relative overflow-hidden transition-all duration-500 ease-in-out"
        style={{ height: isEventsExpanded ? 0 : 'calc(65vh - 80px)' }}
      >
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={mapCenter}
              defaultZoom={DEFAULT_MAP_ZOOM}
              mapId="ear-plug-map-dark"
              gestureHandling="greedy"
              disableDefaultUI
              className="w-full h-full"
            >
              {/* User location marker - Vivid Violet with pulse */}
              {hasLocation && latitude && longitude && (
                <AdvancedMarker
                  position={{ lat: latitude, lng: longitude }}
                  zIndex={1000}
                >
                  <div className="relative">
                    <div className="w-5 h-5 bg-violet border-2 border-white rounded-full shadow-lg animate-pulse-violet" />
                    <div className="absolute inset-0 bg-violet rounded-full animate-ping opacity-40" />
                  </div>
                </AdvancedMarker>
              )}

              {/* Event markers - Electric Lime with black border */}
              {displayEvents?.map((event) => {
                if (!event.venue?.coordinates) return null;

                const isSelected = selectedEventId === event._id;

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
                        "w-11 h-11 rounded-full flex items-center justify-center text-night text-sm font-bold border-2 border-night cursor-pointer transition-all duration-200",
                        isSelected
                          ? "bg-violet text-white border-lime scale-125 shadow-glow-violet"
                          : "bg-lime shadow-lg hover:scale-110 hover:shadow-glow-lime"
                      )}
                    >
                      {event.rsvpCount}
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Info Window - Custom Brutalist */}
              {selectedEvent && selectedEvent.venue?.coordinates && (
                <MapInfoWindow
                  position={{
                    lat: selectedEvent.venue.coordinates.lat,
                    lng: selectedEvent.venue.coordinates.lng,
                  }}
                  onClose={() => setSelectedEventId(null)}
                >
                  <div className="w-[280px]">
                    <EventCard event={selectedEvent} variant="compact" showLikeButton={false} />
                  </div>
                </MapInfoWindow>
              )}
            </Map>
          </APIProvider>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-night-secondary">
            <p className="text-zinc-500">Map requires Google Maps API key</p>
          </div>
        )}
      </div>

      {/* Near You List - Brutalist Style */}
      <div
        className="bg-night-secondary border-t-2 border-lime/20 flex flex-col transition-all duration-500 ease-in-out overflow-hidden"
        style={{ height: isEventsExpanded ? 'calc(100vh - 80px)' : '35vh' }}
      >
        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setIsEventsExpanded(!isEventsExpanded)}
          className="w-full py-2 flex items-center justify-center hover:bg-night-tertiary transition-colors border-b border-zinc-800/50"
        >
          {isEventsExpanded ? (
            <ChevronDown className="w-6 h-6 text-lime" />
          ) : (
            <ChevronUp className="w-6 h-6 text-lime" />
          )}
        </button>

        <div className="p-4 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold uppercase tracking-tight text-white">
              {useDistanceFilter && hasLocation ? `Within ${distanceRadius} miles` : "Near You"}
            </h2>
            {displayEvents && displayEvents.length > 0 && (
              <span className="text-xs font-bold uppercase tracking-wider text-lime">
                {displayEvents.length} event{displayEvents.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="space-y-3 overflow-y-auto no-scrollbar pb-2 flex-1">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-night-tertiary border-2 border-zinc-800 animate-shimmer" />
                ))}
              </div>
            ) : displayEvents && displayEvents.length > 0 ? (
              (isEventsExpanded ? displayEvents : displayEvents.slice(0, 5)).map((event: any) => (
                <div key={event._id} className="relative">
                  <EventCard event={event} variant="compact" />
                  {event.distance !== undefined && (
                    <span className="absolute top-2 right-2 text-xs bg-lime text-night px-2 py-0.5 font-bold uppercase">
                      {event.distance} mi
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-zinc-500 font-medium">
                  {useDistanceFilter && hasLocation
                    ? `No events within ${distanceRadius} miles`
                    : "No events found"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
