"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { Search, SlidersHorizontal, X, Map as MapIcon, List, Navigation } from "lucide-react";
import { motion, AnimatePresence, type Variants, type Transition } from "framer-motion";
import { MapInfoWindow } from "@/components/maps/MapInfoWindow";
import { useEvents, useSearchEvents, useNearbyEvents } from "@/hooks/useEvents";
import { useGeolocation } from "@/hooks/useGeolocation";
import { EventCard } from "@/components/events/EventCard";
import { GenreFilter } from "@/components/ui/GenreFilter";
import { DistanceSlider } from "@/components/ui/DistanceSlider";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";
import { loadGoogleMapsApiKey } from "@/lib/google/ensurePlacesLibrary";
import type { Id } from "../../../../../convex/_generated/dataModel";

const VALID_GENRES: Genre[] = ["indie", "rock", "jazz", "electronic", "folk", "pop", "alternative"];

type ViewMode = "map" | "list";

// Event type with distance from nearby search - using Convex's Id type
interface DisplayEvent {
  _id: Id<"events">;
  _creationTime: number;
  title?: string;
  bandId: Id<"bands">;
  venueId?: Id<"venues">;
  dateTime?: number;
  image?: string;
  rsvpCount: number;
  capacity?: number;
  price?: number;
  description?: string;
  genres: Genre[];
  genre?: Genre;
  status: "confirmed" | "hold" | "available";
  addressVisibility?: "public" | "rsvp_only";
  band: { name: string; image?: string } | null;
  venue: { 
    name?: string; 
    city?: string; 
    address?: string;
    coordinates?: { lat: number; lng: number };
  } | null;
  isVenueAddressHidden?: boolean;
  cohostBands?: { name: string; image?: string }[];
  distance?: number;
}

// Animation variants with proper typing
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  },
};

const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    } as Transition,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 20 : -20,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  }),
};

export function FanDiscoverView() {
  const searchParams = useSearchParams();
  const genreParam = searchParams.get("genre") as Genre | null;

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [direction, setDirection] = useState(0);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<Genre | undefined>(
    genreParam && VALID_GENRES.includes(genreParam) ? genreParam : undefined
  );
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<Id<"events"> | null>(null);
  const [distanceRadius, setDistanceRadius] = useState(25);
  const [useDistanceFilter, setUseDistanceFilter] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);
  const [mapsApiKeyLoading, setMapsApiKeyLoading] = useState(true);

  // Geolocation
  const {
    latitude,
    longitude,
    loading: locationLoading,
    requestPosition,
    hasLocation,
  } = useGeolocation();

  // Data fetching
  const { events: regularEvents, isLoading: regularLoading } = useEvents({ genre: selectedGenre });
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
  const displayEvents = (searchQuery.length >= 2 ? searchResults : events) as DisplayEvent[] | undefined;

  // Enable distance filter when location becomes available
  useEffect(() => {
    if (hasLocation && !useDistanceFilter) {
      setUseDistanceFilter(true);
    }
  }, [hasLocation, useDistanceFilter]);

  // Sync genre from URL param
  useEffect(() => {
    if (genreParam && VALID_GENRES.includes(genreParam)) {
      setSelectedGenre(genreParam);
      setShowFilters(true);
    }
  }, [genreParam]);

  // Load Google Maps API key
  useEffect(() => {
    let isCancelled = false;
    async function fetchMapsApiKey() {
      const apiKey = await loadGoogleMapsApiKey();
      if (isCancelled) return;
      setMapsApiKey(apiKey);
      setMapsApiKeyLoading(false);
    }
    void fetchMapsApiKey();
    return () => { isCancelled = true; };
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

  const handleViewChange = useCallback((newMode: ViewMode) => {
    setDirection(newMode === "map" ? -1 : 1);
    setViewMode(newMode);
  }, []);

  // Count active filters
  const activeFilterCount = [
    selectedGenre,
    useDistanceFilter && hasLocation,
  ].filter(Boolean).length;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-background">
      {/* Header Section */}
      <div className="flex-shrink-0 z-20 bg-card/80 backdrop-blur-xl border-b border-border">
        {/* Search Bar */}
        <div className="p-3">
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search events, bands, or venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 bg-muted/60 border border-border/50 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-fan/30 focus:border-fan/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "relative p-2.5 border rounded-xl flex items-center justify-center transition-all touch-target",
                showFilters
                  ? "bg-fan border-fan text-white shadow-lg shadow-fan/25"
                  : activeFilterCount > 0
                    ? "bg-fan/10 border-fan/30 text-fan"
                    : "bg-card border-border text-muted-foreground hover:border-fan/30 hover:text-fan"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && !showFilters && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-fan text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="overflow-hidden"
              >
                <div className="pt-3 pb-1 space-y-4">
                  {/* Genre Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Genre
                      </span>
                      {selectedGenre && (
                        <button
                          onClick={() => setSelectedGenre(undefined)}
                          className="text-[10px] text-fan hover:text-fan/80 font-medium"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <GenreFilter
                      selected={selectedGenre}
                      onSelect={setSelectedGenre}
                      showAll
                      tone="fan"
                      colorStrategy="genre"
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View Toggle & Results Count */}
        <div className="px-3 pb-3 flex items-center justify-between">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/50">
            <button
              onClick={() => handleViewChange("map")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all touch-target-sm",
                viewMode === "map"
                  ? "bg-fan text-white shadow-md shadow-fan/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Map
            </button>
            <button
              onClick={() => handleViewChange("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all touch-target-sm",
                viewMode === "list"
                  ? "bg-fan text-white shadow-md shadow-fan/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          {/* Results Count */}
          <div className="flex items-center gap-2">
            {!isLoading && displayEvents && (
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{displayEvents.length}</span>
                {" "}event{displayEvents.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {viewMode === "map" ? (
            <motion.div
              key="map"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 flex flex-col"
            >
              {/* Map */}
              <div className="flex-1 relative">
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
                            <div className="w-4 h-4 bg-fan border-2 border-white rounded-full shadow-lg" />
                            <div className="absolute inset-0 bg-fan rounded-full animate-ping opacity-30" />
                          </div>
                        </AdvancedMarker>
                      )}

                      {/* Event markers */}
                      {displayEvents?.map((event: DisplayEvent) => {
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
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center text-foreground text-xs font-bold border-2 border-white cursor-pointer shadow-lg transition-all duration-200",
                                isSelected
                                  ? "bg-fan scale-110 ring-2 ring-fan ring-offset-2 ring-offset-background"
                                  : "bg-fan/90 hover:bg-fan hover:scale-105"
                              )}
                            >
                              {event.rsvpCount}
                            </motion.div>
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
                          <div className="w-[260px]">
                            <EventCard event={selectedEvent} variant="compact" showLikeButton={false} />
                          </div>
                        </MapInfoWindow>
                      )}
                    </Map>
                  </APIProvider>
                ) : mapsApiKeyLoading ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted/30">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-fan border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground">Loading map...</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/30">
                    <p className="text-sm text-muted-foreground">Map configuration unavailable</p>
                  </div>
                )}

                {/* Location Button */}
                {!hasLocation && !locationLoading && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={requestPosition}
                    className="absolute bottom-4 left-4 flex items-center gap-2 px-4 py-2.5 bg-card/90 backdrop-blur-xl border border-border rounded-xl shadow-lg text-sm font-medium text-foreground hover:bg-card transition-colors"
                  >
                    <Navigation className="w-4 h-4 text-fan" />
                    Enable location
                  </motion.button>
                )}
              </div>

              {/* Bottom Sheet - Events Preview */}
              <div className="h-[35%] bg-card border-t border-border flex flex-col">
                <div className="w-full py-2 flex items-center justify-center border-b border-border/50">
                  <div className="w-8 h-1 bg-border rounded-full" />
                </div>

                <div className="flex-1 overflow-hidden">
                  <div className="p-3 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-foreground">
                        {useDistanceFilter && hasLocation
                          ? `Within ${distanceRadius} miles`
                          : "Nearby Events"}
                      </h2>
                      {!isLoading && displayEvents && displayEvents.length > 0 && (
                        <span className="text-[10px] font-medium px-2 py-1 bg-fan/10 text-fan rounded-full">
                          {displayEvents.length} event{displayEvents.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                      {isLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="h-16 bg-muted/60 border border-border/50 rounded-xl animate-shimmer"
                            />
                          ))}
                        </div>
                      ) : displayEvents && displayEvents.length > 0 ? (
                        displayEvents.slice(0, 10).map((event, index) => (
                          <motion.div
                            key={event._id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative"
                          >
                            <EventCard event={event} variant="compact" density="dense" />
                            {event.distance !== undefined && (
                              <span className="absolute top-2 right-2 text-[10px] bg-fan/10 text-fan px-1.5 py-0.5 font-medium rounded">
                                {event.distance} mi
                              </span>
                            )}
                          </motion.div>
                        ))
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="h-full flex flex-col items-center justify-center text-center py-8"
                        >
                          <div className="w-12 h-12 bg-muted/60 rounded-full flex items-center justify-center mb-3">
                            <MapIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground mb-1">
                            No events found
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {useDistanceFilter && hasLocation
                              ? `Try expanding your search radius`
                              : "Check back later for new events"}
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 overflow-y-auto"
            >
              {/* List View */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="p-3 space-y-3"
              >
                {isLoading ? (
                  // Loading skeleton
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="h-24 bg-muted/60 border border-border/50 rounded-xl animate-shimmer"
                      />
                    ))}
                  </div>
                ) : displayEvents && displayEvents.length > 0 ? (
                  // Event list
                  displayEvents.map((event, index) => (
                    <motion.div
                      key={event._id}
                      variants={itemVariants}
                      custom={index}
                      layoutId={event._id}
                    >
                      <EventCard
                        event={event}
                        variant="default"
                        showLikeButton
                      />
                      {event.distance !== undefined && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                          <Navigation className="w-3 h-3" />
                          <span>{event.distance} miles away</span>
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  // Empty state
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center text-center py-16 px-6"
                  >
                    <div className="w-16 h-16 bg-muted/60 rounded-2xl flex items-center justify-center mb-4">
                      <List className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No events found
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
                      {searchQuery.length >= 2
                        ? `No results for "${searchQuery}". Try different keywords.`
                        : useDistanceFilter && hasLocation
                          ? `No events within ${distanceRadius} miles. Try expanding your search radius.`
                          : "There are no upcoming events at the moment. Check back soon!"}
                    </p>
                    {(selectedGenre || (useDistanceFilter && hasLocation)) && (
                      <button
                        onClick={() => {
                          setSelectedGenre(undefined);
                          setDistanceRadius(50);
                        }}
                        className="px-4 py-2 bg-fan text-white text-sm font-medium rounded-lg hover:bg-fan/90 transition-colors"
                      >
                        Clear filters
                      </button>
                    )}
                  </motion.div>
                )}

                {/* Bottom spacer for mobile nav */}
                <div className="h-20" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
