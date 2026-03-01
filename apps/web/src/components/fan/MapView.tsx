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
import { loadGoogleMapsApiKey } from "@/lib/google/ensurePlacesLibrary";
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
  const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);
  const [mapsApiKeyLoading, setMapsApiKeyLoading] = useState(true);

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

  useEffect(() => {
    let isCancelled = false;

    async function fetchMapsApiKey() {
      const apiKey = await loadGoogleMapsApiKey();
      if (isCancelled) {
        return;
      }

      setMapsApiKey(apiKey);
      setMapsApiKeyLoading(false);
    }

    void fetchMapsApiKey();

    return () => {
      isCancelled = true;
    };
  }, []);

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

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Search Bar */}
      <div className="relative z-10 p-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search events, bands, or venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-fan transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 flex items-center justify-center hover:bg-card rounded-full touch-target"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-3.5 border rounded-lg flex items-center justify-center transition-all touch-target",
              showFilters
                ? "bg-fan border-fan text-foreground"
                : "bg-card border-border text-muted-foreground hover:border-fan/50"
            )}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            {/* Genre Filter */}
            <div>
              <span className="text-xs font-medium text-muted-foreground mb-3 block">
                Genre
              </span>
              <GenreFilter
                selected={selectedGenre}
                onSelect={setSelectedGenre}
                showAll
                tone="fan"
              />
            </div>

            {/* Distance Filter */}
            <DistanceSlider
              value={distanceRadius}
              onChange={setDistanceRadius}
              hasLocation={hasLocation}
              onRequestLocation={requestPosition}
              loading={locationLoading}
              tone="fan"
            />
          </div>
        )}
      </div>

      {/* Map */}
      <div
        className="relative overflow-hidden transition-all duration-500 ease-in-out"
        style={{ height: isEventsExpanded ? 0 : 'calc(65vh - 80px)' }}
      >
        {mapsApiKey ? (
          <APIProvider apiKey={mapsApiKey}>
            <Map
              defaultCenter={mapCenter}
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
                    <div className="w-5 h-5 bg-fan border-2 border-card rounded-full shadow-lg" />
                    <div className="absolute inset-0 bg-fan rounded-full animate-ping opacity-40" />
                  </div>
                </AdvancedMarker>
              )}

              {/* Event markers */}
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
                        "w-10 h-10 rounded-full flex items-center justify-center text-foreground text-sm font-bold border-2 border-background cursor-pointer transition-all duration-200 shadow-lg",
                        isSelected
                          ? "bg-fan text-foreground scale-110 ring-2 ring-fan ring-offset-2 ring-offset-background"
                          : "bg-fan/90 hover:bg-fan hover:scale-105"
                      )}
                    >
                      {event.rsvpCount}
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Info Window */}
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
        ) : mapsApiKeyLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <p className="text-muted-foreground">Loading map configuration...</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <p className="text-muted-foreground">Map requires Google Maps API key</p>
          </div>
        )}
      </div>

      {/* Near You List */}
      <div
        className="bg-card border-t border-border flex flex-col transition-all duration-500 ease-in-out overflow-hidden"
        style={{ height: isEventsExpanded ? 'calc(100vh - 80px)' : '35vh' }}
      >
        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setIsEventsExpanded(!isEventsExpanded)}
          className="w-full py-2 flex items-center justify-center hover:bg-muted transition-colors border-b border-border/50"
        >
          {isEventsExpanded ? (
            <ChevronDown className="w-6 h-6 text-fan" />
          ) : (
            <ChevronUp className="w-6 h-6 text-fan" />
          )}
        </button>

        <div className="p-4 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              {useDistanceFilter && hasLocation ? `Within ${distanceRadius} miles` : "Near You"}
            </h2>
            {displayEvents && displayEvents.length > 0 && (
              <span className="text-xs font-medium text-fan">
                {displayEvents.length} event{displayEvents.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="space-y-3 overflow-y-auto no-scrollbar pb-2 flex-1">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted border border-border rounded-lg animate-shimmer" />
                ))}
              </div>
            ) : displayEvents && displayEvents.length > 0 ? (
              (isEventsExpanded ? displayEvents : displayEvents.slice(0, 5)).map((event: any) => (
                <div key={event._id} className="relative">
                  <EventCard event={event} variant="compact" />
                  {event.distance !== undefined && (
                    <span className="absolute top-2 right-2 text-xs bg-fan text-foreground px-2 py-0.5 font-medium rounded">
                      {event.distance} mi
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground font-medium">
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
