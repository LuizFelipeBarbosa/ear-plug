import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Heart, MapPin, Music, Ticket, User } from "lucide-react-native";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function PublicFanProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const fanId = id as Id<"users">;

  const profile = useQuery(api.users.getPublicFanProfile, { fanId });

  if (profile === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Loading fan profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-xl font-semibold text-gray-900">Fan profile not found</Text>
        <Text className="mt-2 text-center text-sm text-gray-500">This fan profile is unavailable.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5">
          <Text className="font-semibold text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { fan, topGenres, savedArtists, pastShows, gigDna } = profile;

  return (
    <View className="flex-1 bg-white px-4 pb-8 pt-14">
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center self-start rounded-lg border border-gray-200 px-3 py-2">
        <ArrowLeft size={16} color="#4b5563" />
        <Text className="ml-2 text-xs font-semibold text-gray-700">Back</Text>
      </TouchableOpacity>

      <View className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <View className="flex-row items-center">
          <User size={16} color="#2563eb" />
          <Text className="ml-2 text-xl font-bold text-gray-900">{fan.name}</Text>
        </View>
        <View className="mt-2 flex-row items-center">
          <MapPin size={14} color="#6b7280" />
          <Text className="ml-1 text-sm text-gray-600">{fan.location || "Location not set"}</Text>
        </View>
        <Text className="mt-1 text-xs text-gray-500">
          Member since {new Date(fan.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </Text>
        <Text className="mt-1 text-xs text-gray-500">Shows attended: {fan.showsAttended}</Text>
        {gigDna ? (
          <View className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <Text className="text-xs uppercase text-blue-700">Gig DNA</Text>
            <Text className="mt-1 text-sm font-semibold text-blue-800">{gigDna.label}</Text>
          </View>
        ) : null}
      </View>

      <View className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
        <View className="flex-row items-center">
          <Music size={15} color="#7c3aed" />
          <Text className="ml-2 text-sm font-semibold text-gray-900">Top Genres</Text>
        </View>
        <View className="mt-2 flex-row flex-wrap">
          {topGenres.length > 0 ? (
            topGenres.map((entry) => (
              <View key={entry.genre} className="mr-2 mb-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1">
                <Text className="text-xs text-violet-700">{entry.label} ({entry.attendedCount})</Text>
              </View>
            ))
          ) : (
            <Text className="text-xs text-gray-500">No genre activity yet.</Text>
          )}
        </View>
      </View>

      <Text className="mt-5 text-base font-semibold text-gray-900">Saved Artists</Text>
      <FlatList
        horizontal
        className="mt-2"
        showsHorizontalScrollIndicator={false}
        data={savedArtists}
        keyExtractor={(item) => item.bandId}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/bands/${item.bandId}`)}
            className="mr-2 w-44 rounded-xl border border-gray-200 p-3"
          >
            <View className="flex-row items-center">
              <Heart size={14} color="#2563eb" />
              <Text className="ml-1 text-xs text-gray-500">Saved</Text>
            </View>
            <Text className="mt-2 font-semibold text-gray-900" numberOfLines={1}>{item.name}</Text>
            <Text className="mt-1 text-xs text-gray-500" numberOfLines={1}>{item.location}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => <Text className="text-sm text-gray-500">No saved artists yet.</Text>}
      />

      <Text className="mt-5 text-base font-semibold text-gray-900">Recent Activity</Text>
      <FlatList
        className="mt-2 flex-1"
        data={pastShows}
        keyExtractor={(item) => item.eventId}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/gig/${item.eventId}`)} className="mb-2 rounded-xl border border-gray-200 p-3">
            <View className="flex-row items-center">
              <Ticket size={14} color="#6b7280" />
              <Text className="ml-1 font-semibold text-gray-900">{item.title}</Text>
            </View>
            <Text className="mt-1 text-xs text-gray-500">
              {item.venue.name} • {item.venue.city}
            </Text>
            <Text className="mt-1 text-xs text-gray-500">{new Date(item.dateTime).toLocaleDateString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="py-8 items-center">
            <Text className="text-sm text-gray-500">No past activity yet.</Text>
          </View>
        )}
      />
    </View>
  );
}
