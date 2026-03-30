import { EventListItem } from "@/components/events/EventListItem";
import {
  Button,
  AppScreen,
  PillButton,
} from "@/components/ui/AppPrimitives";
import { useDeviceLocation } from "@/hooks/useDeviceLocation";
import { useEvents, useNearbyEvents, useSearchEvents } from "@/hooks/useEvents";
import { GENRES } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import { useRouter } from "expo-router";
import { List, Map as MapIcon, SlidersHorizontal, X, Search, Navigation } from "lucide-react-native";
import { useMemo, useState, useEffect } from "react";
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { cn } from "@/lib/utils";

type ViewMode = "map" | "list";

const DEFAULT_REGION: Region = {
  latitude: 37.8044,
  longitude: -122.2712,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

const DISTANCE_OPTIONS = [5, 10, 25, 50] as const;

export function FanDiscoverScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<Genre | undefined>();
  const [distanceMiles, setDistanceMiles] = useState<number>(25);
  const [useDistanceFilter, setUseDistanceFilter] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const {
    latitude,
    longitude,
    hasLocation,
    loading: locationLoading,
    requestPosition,
  } = useDeviceLocation(false);

  // Debounce search query
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const { events: defaultEvents, isLoading: defaultLoading } = useEvents({
    genre: selectedGenre,
    limit: 100,
  });
  
  const { events: nearbyEvents, isLoading: nearbyLoading } = useNearbyEvents({
    latitude,
    longitude,
    radiusMiles: distanceMiles,
    genre: selectedGenre,
    enabled: useDistanceFilter && hasLocation,
    limit: 100,
  });

  const hasActiveSearch = debouncedSearchQuery.length >= 2;
  const events = useDistanceFilter && hasLocation ? nearbyEvents : defaultEvents;
  const baseLoading = useDistanceFilter && hasLocation ? nearbyLoading : defaultLoading;
  const isLoading = hasActiveSearch ? false : baseLoading; // Search loading handled separately
  
  const { results: searchResults } = useSearchEvents(
    hasActiveSearch ? debouncedSearchQuery : ""
  );
  
  const displayEvents = (hasActiveSearch ? searchResults : events) as any[] | undefined;

  const mapRegion = useMemo<Region>(() => {
    if (hasLocation && latitude !== null && longitude !== null) {
      return {
        latitude,
        longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      };
    }
    return DEFAULT_REGION;
  }, [hasLocation, latitude, longitude]);

  const activeFilterCount = [selectedGenre, useDistanceFilter && hasLocation].filter(Boolean).length;

  // Enable distance filter when location becomes available
  useEffect(() => {
    if (hasLocation && !useDistanceFilter) {
      setUseDistanceFilter(true);
    }
  }, [hasLocation, useDistanceFilter]);

  return (
    <AppScreen
      header={
        <View className="border-b border-slate-200 bg-white">
          {/* Search Bar */}
          <View className="px-4 pb-3 pt-3">
            <View className="flex-row items-center gap-2">
              {/* Search Input */}
              <View className="flex-1 relative">
                <View className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Search size={16} color="#64748b" />
                </View>
                <TextInput
                  placeholder="Search events, bands, or venues..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  className="min-h-[48px] w-full rounded-[18px] border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900"
                />
                {searchQuery && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5"
                  >
                    <X size={14} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filter Button */}
              <TouchableOpacity
                onPress={() => setShowFilters(!showFilters)}
                className={cn(
                  "relative h-11 w-11 items-center justify-center rounded-[18px] border",
                  showFilters
                    ? "bg-fan border-fan"
                    : activeFilterCount > 0
                    ? "bg-fan/10 border-fan/30"
                    : "bg-white border-slate-200"
                )}
              >
                <SlidersHorizontal 
                  size={18} 
                  color={showFilters ? "#ffffff" : activeFilterCount > 0 ? "#2563eb" : "#475569"} 
                />
                {activeFilterCount > 0 && !showFilters && (
                  <View className="absolute -top-1 -right-1 w-5 h-5 bg-fan rounded-full items-center justify-center">
                    <Text className="text-[10px] font-bold text-white">{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Filters Panel */}
            {showFilters && (
              <View className="mt-4 gap-4">
                {/* Genre Filter */}
                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Genre
                    </Text>
                    {selectedGenre && (
                      <TouchableOpacity onPress={() => setSelectedGenre(undefined)}>
                        <Text className="text-[10px] text-fan font-medium">Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={["all", ...GENRES.map((g) => g.value)] as ("all" | Genre)[]}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => {
                      const isAll = item === "all";
                      const active = isAll ? !selectedGenre : selectedGenre === item;
                      return (
                        <PillButton
                          label={isAll ? "All" : GENRES.find((g) => g.value === item)?.label ?? item}
                          active={active}
                          tone="fan"
                          onPress={() => setSelectedGenre(isAll ? undefined : item)}
                        />
                      );
                    }}
                  />
                </View>

                {/* Distance Filter */}
                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <View>
                      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Distance
                      </Text>
                      <Text className="text-xs text-muted-foreground mt-0.5">
                        {useDistanceFilter && hasLocation
                          ? `Showing events within ${distanceMiles} miles`
                          : "Use your location to show nearby gigs"}
                      </Text>
                    </View>
                    
                    {!hasLocation && !locationLoading && (
                      <Button
                        label="Enable location"
                        tone="fan"
                        size="sm"
                        onPress={requestPosition}
                      />
                    )}
                  </View>
                  
                  {useDistanceFilter && (
                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      data={DISTANCE_OPTIONS as readonly number[]}
                      keyExtractor={(item) => String(item)}
                      renderItem={({ item }) => (
                        <PillButton
                          label={`${item} mi`}
                          active={distanceMiles === item}
                          tone="fan"
                          onPress={() => setDistanceMiles(item)}
                        />
                      )}
                    />
                  )}
                </View>
              </View>
            )}
          </View>

          {/* View Toggle & Results Count */}
          <View className="flex-row items-center justify-between px-4 pb-3">
            {/* View Mode Toggle */}
            <View className="flex-row items-center gap-1 rounded-[18px] bg-slate-100 p-1">
              <TouchableOpacity
                onPress={() => setViewMode("map")}
                className={cn(
                  "flex-row items-center gap-1.5 rounded-[14px] px-3 py-2",
                  viewMode === "map" ? "bg-fan" : ""
                )}
              >
                <MapIcon size={14} color={viewMode === "map" ? "#ffffff" : "#6b7280"} />
                <Text className={cn("text-xs font-medium", viewMode === "map" ? "text-white" : "text-muted-foreground")}>
                  Map
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewMode("list")}
                className={cn(
                  "flex-row items-center gap-1.5 rounded-[14px] px-3 py-2",
                  viewMode === "list" ? "bg-fan" : ""
                )}
              >
                <List size={14} color={viewMode === "list" ? "#ffffff" : "#6b7280"} />
                <Text className={cn("text-xs font-medium", viewMode === "list" ? "text-white" : "text-muted-foreground")}>
                  List
                </Text>
              </TouchableOpacity>
            </View>

            {/* Results Count */}
            {!isLoading && displayEvents && (
              <Text className="text-xs text-muted-foreground">
                <Text className="font-semibold text-foreground">{displayEvents.length}</Text>
                {" "}event{displayEvents.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>
      }
    >
      {/* Content Area */}
      <View className="flex-1">
        {/* Map View */}
        {viewMode === "map" && (
          <View className="flex-1 -mx-4">
            <View className="flex-1">
              <MapView 
                style={{ flex: 1 }} 
                initialRegion={mapRegion}
                showsUserLocation={hasLocation}
              >
                {displayEvents
                  ?.filter((event) => event.venue?.coordinates?.lat && event.venue?.coordinates?.lng)
                  .map((event) => (
                    <Marker
                      key={event._id}
                      coordinate={{
                        latitude: event.venue.coordinates.lat,
                        longitude: event.venue.coordinates.lng,
                      }}
                      onPress={() => router.push(`/gig/${event._id}`)}
                    >
                      <View className="w-9 h-9 rounded-full bg-fan/90 border-2 border-white items-center justify-center shadow-lg">
                        <Text className="text-xs font-bold text-white">{event.rsvpCount}</Text>
                      </View>
                    </Marker>
                  ))}
              </MapView>

              {/* Location Button */}
              {!hasLocation && !locationLoading && (
                <TouchableOpacity
                  onPress={requestPosition}
                  className="absolute bottom-4 left-4 flex-row items-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-2.5"
                >
                  <Navigation size={16} color="#2563eb" />
                  <Text className="text-sm font-medium text-slate-900">Enable location</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Bottom Sheet - Events Preview */}
            <View className="h-[34%] border-t border-slate-200 bg-white">
              <View className="w-full items-center border-b border-slate-200/80 py-2">
                <View className="h-1 w-8 rounded-full bg-slate-300" />
              </View>

              <View className="flex-1 px-4 pt-3">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-sm font-semibold text-foreground">
                    {useDistanceFilter && hasLocation
                      ? `Within ${distanceMiles} miles`
                      : "Nearby Events"}
                  </Text>
                  {!isLoading && displayEvents && displayEvents.length > 0 && (
                    <View className="rounded-full bg-fan/10 px-2 py-1">
                      <Text className="text-[10px] font-medium text-fan">
                        {displayEvents.length} event{displayEvents.length !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </View>

                <FlatList
                  showsVerticalScrollIndicator={false}
                  data={displayEvents?.slice(0, 10) || []}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <View className="mb-2">
                      <EventListItem event={item} variant="compact" />
                    </View>
                  )}
                  ListEmptyComponent={
                    isLoading ? (
                      <View className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <View key={i} className="h-16 rounded-[18px] border border-slate-200 bg-slate-100" />
                        ))}
                      </View>
                    ) : (
                      <View className="h-full flex-col items-center justify-center py-8">
                        <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                          <MapIcon size={20} color="#9ca3af" />
                        </View>
                        <Text className="text-sm font-medium text-foreground mb-1">No events found</Text>
                        <Text className="text-xs text-muted-foreground text-center">
                          {useDistanceFilter && hasLocation
                            ? "Try expanding your search radius"
                            : "Check back later for new events"}
                        </Text>
                      </View>
                    )
                  }
                />
              </View>
            </View>
          </View>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <FlatList
            showsVerticalScrollIndicator={false}
            data={displayEvents || []}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View className="mb-3">
                <EventListItem event={item} />
              </View>
            )}
            ListEmptyComponent={
              isLoading ? (
                <View className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} className="h-24 rounded-[20px] border border-slate-200 bg-slate-100 animate-shimmer" />
                  ))}
                </View>
              ) : (
                <View className="flex-col items-center justify-center py-16 px-6">
                  <View className="mb-4 h-16 w-16 items-center justify-center rounded-[20px] bg-slate-100">
                    <List size={28} color="#9ca3af" />
                  </View>
                  <Text className="text-lg font-semibold text-foreground mb-2">No events found</Text>
                  <Text className="text-sm text-muted-foreground text-center mb-6">
                    {hasActiveSearch
                      ? `No results for "${debouncedSearchQuery}". Try different keywords.`
                      : useDistanceFilter && hasLocation
                      ? `No events within ${distanceMiles} miles. Try expanding your search radius.`
                      : "There are no upcoming events at the moment. Check back soon!"}
                  </Text>
                  {(selectedGenre || (useDistanceFilter && hasLocation)) && (
                    <Button
                      label="Clear filters"
                      tone="fan"
                      onPress={() => {
                        setSelectedGenre(undefined);
                        setDistanceMiles(50);
                      }}
                    />
                  )}
                </View>
              )
            }
            ListFooterComponent={<View className="h-20" />}
          />
        )}
      </View>
    </AppScreen>
  );
}
