import { useProfileContext } from "@/context/ProfileContext";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Calendar, Heart, MapPin, Users } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function PublicBandProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bandId = id as Id<"bands">;
  const { mode } = useProfileContext();

  const profile = useQuery(api.bands.getPublicBandProfile, { bandId });
  const pastShows = useQuery(api.events.listPublicPastByBand, { bandId, limit: 20 }) ?? [];
  const toggleSave = useMutation(api.bands.toggleSave);
  const trackProfileView = useMutation(api.bands.trackProfileView);
  const trackedRef = useRef<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [optimisticFollowing, setOptimisticFollowing] = useState<boolean | null>(null);
  const [optimisticFollowers, setOptimisticFollowers] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "personal" || !profile?.band) return;
    if (trackedRef.current === bandId) return;

    trackedRef.current = bandId;
    void trackProfileView({ bandId }).catch(() => {
      trackedRef.current = null;
    });
  }, [bandId, mode, profile?.band, trackProfileView]);

  const isFollowing = optimisticFollowing ?? profile?.isFollowing ?? false;
  const followerCount = optimisticFollowers ?? profile?.followerCount ?? 0;
  const canFollow = !profile?.viewerMembershipRole;

  const genres = useMemo(() => {
    if (!profile?.band) return [];
    if (profile.band.genres && profile.band.genres.length > 0) return profile.band.genres;
    return profile.band.genre ? [profile.band.genre] : [];
  }, [profile?.band]);

  const onToggleFollow = async () => {
    if (!canFollow || !profile || isSaving) return;

    setError(null);
    setIsSaving(true);
    const nextFollow = !isFollowing;
    const nextCount = Math.max(0, followerCount + (nextFollow ? 1 : -1));
    setOptimisticFollowing(nextFollow);
    setOptimisticFollowers(nextCount);

    try {
      await toggleSave({ bandId });
    } catch (err) {
      setOptimisticFollowing(isFollowing);
      setOptimisticFollowers(followerCount);
      setError(err instanceof Error ? err.message : "Failed to update follow status.");
    } finally {
      setIsSaving(false);
    }
  };

  if (profile === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Loading band profile...</Text>
      </View>
    );
  }

  if (!profile?.band) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-xl font-semibold text-gray-900">Band not found</Text>
        <Text className="mt-2 text-center text-sm text-gray-500">This profile is unavailable.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5">
          <Text className="font-semibold text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-4 pb-8 pt-14">
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center self-start rounded-lg border border-gray-200 px-3 py-2">
        <ArrowLeft size={16} color="#4b5563" />
        <Text className="ml-2 text-xs font-semibold text-gray-700">Back</Text>
      </TouchableOpacity>

      <View className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <Text className="text-2xl font-bold text-gray-900">{profile.band.name}</Text>
        <View className="mt-1 flex-row items-center">
          <MapPin size={14} color="#6b7280" />
          <Text className="ml-1 text-sm text-gray-600">{profile.band.location}</Text>
        </View>
        <View className="mt-2 flex-row items-center">
          <Users size={14} color="#6b7280" />
          <Text className="ml-1 text-sm text-gray-600">{followerCount} followers</Text>
        </View>

        {genres.length > 0 ? (
          <View className="mt-3 flex-row flex-wrap">
            {genres.map((genre) => (
              <View key={genre} className="mr-2 mb-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1">
                <Text className="text-xs text-blue-700">{genre.charAt(0).toUpperCase() + genre.slice(1)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {profile.band.bio ? <Text className="mt-2 text-sm text-gray-600">{profile.band.bio}</Text> : null}

        {canFollow ? (
          <TouchableOpacity
            onPress={() => void onToggleFollow()}
            disabled={isSaving}
            className={`mt-4 rounded-xl py-3 ${isFollowing ? "border border-blue-300 bg-white" : "bg-blue-600"}`}
          >
            <View className="flex-row items-center justify-center">
              <Heart size={16} color={isFollowing ? "#1d4ed8" : "#ffffff"} fill={isFollowing ? "#1d4ed8" : "transparent"} />
              <Text className={`ml-2 font-semibold ${isFollowing ? "text-blue-700" : "text-white"}`}>
                {isSaving ? "Updating..." : isFollowing ? "Following" : "Follow"}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View className="mt-4 rounded-xl border border-gray-200 bg-white py-3">
            <Text className="text-center text-sm font-semibold text-gray-600">You are a member of this band</Text>
          </View>
        )}

        {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}
      </View>

      <Text className="mt-5 text-lg font-semibold text-gray-900">Past Shows</Text>
      <FlatList
        className="mt-2 flex-1"
        data={pastShows}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/gig/${item._id}`)} className="mb-2 rounded-xl border border-gray-200 p-3">
            <Text className="font-semibold text-gray-900">{item.title || "Untitled Gig"}</Text>
            <View className="mt-1 flex-row items-center">
              <Calendar size={13} color="#6b7280" />
              <Text className="ml-1 text-xs text-gray-500">{new Date(item.dateTime).toLocaleDateString()}</Text>
            </View>
            <Text className="mt-1 text-xs text-gray-500">
              {item.venue?.name || "Unknown Venue"} • {item.venue?.city || "Unknown City"}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="py-8 items-center">
            <Text className="text-sm text-gray-500">No past shows yet.</Text>
          </View>
        )}
      />
    </View>
  );
}
