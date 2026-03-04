import { EventListItem } from "@/components/events/EventListItem";
import { useDeviceLocation } from "@/hooks/useDeviceLocation";
import { useEvents, useNearbyEvents, useSearchEvents } from "@/hooks/useEvents";
import { GENRES } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Callout, Marker, Region } from "react-native-maps";
import { Map as MapIcon, List, LocateFixed } from "lucide-react-native";
import { useRouter } from "expo-router";

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
  const [selectedGenre, setSelectedGenre] = useState<Genre | undefined>(undefined);
  const [distanceMiles, setDistanceMiles] = useState<number>(25);
  const [useDistanceFilter, setUseDistanceFilter] = useState(false);

  const {
    latitude,
    longitude,
    hasLocation,
    loading: locationLoading,
    requestPosition,
  } = useDeviceLocation(false);

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

  const normalizedQuery = searchQuery.trim();
  const hasSearch = normalizedQuery.length >= 2;
  const { results: searchResults, isLoading: searchLoading } = useSearchEvents(normalizedQuery);

  const isLoading = hasSearch ? searchLoading : useDistanceFilter && hasLocation ? nearbyLoading : defaultLoading;

  const events = useMemo(() => {
    if (hasSearch) return (searchResults ?? []) as any[];
    return ((useDistanceFilter && hasLocation ? nearbyEvents : defaultEvents) ?? []) as any[];
  }, [defaultEvents, hasLocation, hasSearch, nearbyEvents, searchResults, useDistanceFilter]);

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

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-2 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Discover</Text>
        <Text className="text-sm text-gray-500 mt-1">Find local Bay Area gigs near you</Text>

        <View className="mt-3 flex-row items-center gap-2">
          <View className="flex-1 rounded-xl border border-gray-200 px-3 py-2 bg-gray-50">
            <TextInput
              placeholder="Search events, bands, venues..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              className="text-sm text-gray-900"
            />
          </View>

          <TouchableOpacity
            onPress={() => setViewMode((current) => (current === "map" ? "list" : "map"))}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
          >
            {viewMode === "map" ? <List size={20} color="#374151" /> : <MapIcon size={20} color="#374151" />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              void requestPosition().then(() => setUseDistanceFilter(true));
            }}
            className={`rounded-xl border px-3 py-2 ${useDistanceFilter ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-gray-50"}`}
          >
            <LocateFixed size={20} color={useDistanceFilter ? "#2563eb" : "#374151"} />
          </TouchableOpacity>
        </View>

        <FlatList
          className="mt-3"
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["all", ...GENRES.map((genre) => genre.value)] as ("all" | Genre)[]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isAll = item === "all";
            const isActive = isAll ? selectedGenre === undefined : selectedGenre === item;

            return (
              <TouchableOpacity
                onPress={() => setSelectedGenre(isAll ? undefined : item)}
                className={`mr-2 rounded-full border px-3 py-1.5 ${
                  isActive ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
                }`}
              >
                <Text className={`text-xs font-medium ${isActive ? "text-blue-700" : "text-gray-600"}`}>
                  {isAll ? "All" : GENRES.find((g) => g.value === item)?.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {useDistanceFilter ? (
          <FlatList
            className="mt-2"
            horizontal
            showsHorizontalScrollIndicator={false}
            data={DISTANCE_OPTIONS as readonly number[]}
            keyExtractor={(item) => String(item)}
            renderItem={({ item }) => {
              const active = distanceMiles === item;
              return (
                <TouchableOpacity
                  onPress={() => setDistanceMiles(item)}
                  className={`mr-2 rounded-full border px-3 py-1 ${
                    active ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <Text className={`text-xs ${active ? "text-blue-700" : "text-gray-600"}`}>{item} mi</Text>
                </TouchableOpacity>
              );
            }}
          />
        ) : null}

        {locationLoading ? <Text className="text-xs text-gray-500 mt-2">Locating you...</Text> : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading events...</Text>
        </View>
      ) : viewMode === "map" ? (
        <View className="flex-1">
          <MapView style={{ flex: 1 }} initialRegion={mapRegion} showsUserLocation={hasLocation}>
            {events
              .filter((event) => event.venue?.coordinates?.lat && event.venue?.coordinates?.lng)
              .map((event) => (
                <Marker
                  key={event._id}
                  coordinate={{
                    latitude: event.venue.coordinates.lat,
                    longitude: event.venue.coordinates.lng,
                  }}
                >
                  <Callout
                    onPress={() => {
                      router.push(`/gig/${event._id}`);
                    }}
                  >
                    <Pressable className="w-52 p-2">
                      <Text className="font-semibold text-gray-900">{event.title || "Untitled Gig"}</Text>
                      <Text className="text-xs text-gray-500 mt-1">{event.band?.name || "Unknown Band"}</Text>
                      <Text className="text-xs text-gray-500">{event.venue?.name || "Venue TBD"}</Text>
                    </Pressable>
                  </Callout>
                </Marker>
              ))}
          </MapView>

          <View className="absolute left-0 right-0 bottom-0 max-h-72 bg-white/95 border-t border-gray-200">
            <FlatList
              data={events.slice(0, 10)}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => <EventListItem event={item} showActions />}
              contentContainerStyle={{ padding: 12 }}
              ListEmptyComponent={() => (
                <View className="py-10 items-center">
                  <Text className="text-gray-500">No events found for the current filters.</Text>
                </View>
              )}
            />
          </View>
        </View>
      ) : (
        <FlatList
          className="flex-1"
          data={events}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => <EventListItem event={item} showActions />}
          ListEmptyComponent={() => (
            <View className="py-16 items-center">
              <Text className="text-gray-500">No events found.</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
