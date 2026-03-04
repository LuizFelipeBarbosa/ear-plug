import { useProfileContext } from "@/context/ProfileContext";
import { useBandAnalytics, useCurrentBand } from "@/hooks/useBand";
import { useBandConversations } from "@/hooks/useMessages";
import { useOpenDates, useSuggestedVenues } from "@/hooks/useVenues";
import type { Genre } from "@ear-plug/shared/types";
import { useState } from "react";
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";

export function BandDashboardScreen() {
  const { bandWithStats, isLoading, createBand } = useCurrentBand();
  const { setBandMode } = useProfileContext();
  const { unreadCount, pendingInviteCount } = useBandConversations(bandWithStats?._id);
  const { analytics } = useBandAnalytics(bandWithStats?._id);
  const primaryGenre = (bandWithStats?.genres?.[0] ?? "indie") as Genre;
  const { venues: suggestedVenues } = useSuggestedVenues(primaryGenre);
  const { openDates, applyToOpenDate } = useOpenDates({ genre: primaryGenre, limit: 10 });

  const [applyingOpenDateId, setApplyingOpenDateId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Loading dashboard...</Text>
      </View>
    );
  }

  if (!bandWithStats) {
    return (
      <CreateBandCard
        onCreate={async (payload) => {
          const bandId = await createBand(payload);
          setBandMode(bandId);
        }}
      />
    );
  }

  return (
    <FlatList
      className="flex-1 bg-white"
      data={openDates}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      ListHeaderComponent={() => (
        <>
          <Text className="text-2xl font-bold text-gray-900">{bandWithStats.name}</Text>
          <Text className="text-sm text-gray-500 mt-1">
            {(bandWithStats.genres || []).map((genre) => genre.charAt(0).toUpperCase() + genre.slice(1)).join(" • ")}
          </Text>

          <View className="mt-4 flex-row gap-2">
            <StatCard label="Shows" value={String(bandWithStats.stats.showsThisMonth)} />
            <StatCard label="RSVPs" value={String(bandWithStats.stats.totalRsvps)} />
            <StatCard label="New Fans" value={String(bandWithStats.stats.newFans)} />
          </View>

          <View className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3">
            <Text className="text-sm font-semibold text-violet-800">Inbox Activity</Text>
            <Text className="text-xs text-violet-700 mt-1">
              {unreadCount} unread messages • {pendingInviteCount} pending co-host invites
            </Text>
          </View>

          <View className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <Text className="text-sm font-semibold text-gray-800">Performance Snapshot</Text>
            <Text className="text-xs text-gray-600 mt-1">Event count: {analytics?.eventCount ?? 0}</Text>
            <Text className="text-xs text-gray-600">Average attendance: {analytics?.averageAttendancePerShow?.toFixed?.(1) ?? "0.0"}</Text>
          </View>

          <Text className="mt-6 text-lg font-semibold text-gray-900">Suggested Venues</Text>
          <FlatList
            horizontal
            className="mt-2"
            data={suggestedVenues}
            keyExtractor={(item) => item._id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View className="mr-3 w-44 rounded-xl border border-gray-200 bg-white p-3">
                <Text className="font-semibold text-gray-900" numberOfLines={1}>{item.name}</Text>
                <Text className="text-xs text-gray-500 mt-1">{item.city}</Text>
                <Text className="text-xs text-gray-500">Capacity {item.capacity}</Text>
              </View>
            )}
          />

          <Text className="mt-6 mb-2 text-lg font-semibold text-gray-900">Open Dates</Text>
        </>
      )}
      renderItem={({ item }) => (
        <View className="mb-3 rounded-xl border border-gray-200 bg-white p-4">
          <Text className="font-semibold text-gray-900">{item.venue?.name || "Unknown Venue"}</Text>
          <Text className="text-xs text-gray-500 mt-1">{new Date(item.date).toLocaleDateString()}</Text>
          <Text className="text-xs text-gray-500">{item.venue?.city || "City TBD"}</Text>
          <Text className="text-xs text-gray-500 mt-1">
            Offered pay: {typeof item.offeredPay === "number" ? `$${item.offeredPay}` : "TBD"}
          </Text>

          <TouchableOpacity
            onPress={async () => {
              if (applyingOpenDateId) return;
              setApplyingOpenDateId(item._id);
              try {
                await applyToOpenDate({ openDateId: item._id, bandId: bandWithStats._id });
              } finally {
                setApplyingOpenDateId(null);
              }
            }}
            className="mt-3 rounded-lg bg-violet-600 py-2"
            disabled={applyingOpenDateId === item._id}
          >
            <Text className="text-center font-semibold text-white">
              {applyingOpenDateId === item._id ? "Applying..." : "Apply"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={() => (
        <View className="py-12 items-center">
          <Text className="text-gray-500">No open dates available.</Text>
        </View>
      )}
    />
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <Text className="text-lg font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-600">{label}</Text>
    </View>
  );
}

function CreateBandCard({
  onCreate,
}: {
  onCreate: (payload: {
    name: string;
    location: string;
    genres: Genre[];
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [genre, setGenre] = useState<Genre>("indie");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <View className="flex-1 bg-white p-6 justify-center">
      <Text className="text-2xl font-bold text-gray-900">Create Your Band Workspace</Text>
      <Text className="mt-2 text-gray-500">You need a band profile to access band tools.</Text>

      <View className="mt-5 rounded-xl border border-gray-200 px-3 py-2">
        <TextInput
          placeholder="Band name"
          value={name}
          onChangeText={setName}
          className="text-gray-900"
        />
      </View>

      <View className="mt-3 rounded-xl border border-gray-200 px-3 py-2">
        <TextInput
          placeholder="Location"
          value={location}
          onChangeText={setLocation}
          className="text-gray-900"
        />
      </View>

      <Text className="mt-3 text-xs font-medium text-gray-500 uppercase">Primary Genre</Text>
      <View className="mt-2 flex-row flex-wrap">
        {(["indie", "rock", "jazz", "electronic", "folk", "pop", "alternative"] as Genre[]).map((value) => {
          const active = genre === value;
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setGenre(value)}
              className={`mr-2 mb-2 rounded-full border px-3 py-1.5 ${
                active ? "border-violet-400 bg-violet-50" : "border-gray-200"
              }`}
            >
              <Text className={`text-xs ${active ? "text-violet-700" : "text-gray-600"}`}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}

      <TouchableOpacity
        onPress={async () => {
          if (!name.trim() || !location.trim()) {
            setError("Name and location are required.");
            return;
          }

          setError(null);
          setPending(true);
          try {
            await onCreate({
              name: name.trim(),
              location: location.trim(),
              genres: [genre],
            });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create band.");
          } finally {
            setPending(false);
          }
        }}
        disabled={pending}
        className="mt-5 rounded-xl bg-violet-600 py-3"
      >
        <Text className="text-center font-semibold text-white">
          {pending ? "Creating..." : "Create Band"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
