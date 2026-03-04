import { EventListItem } from "@/components/events/EventListItem";
import { useUserEvents } from "@/hooks/useEvents";
import { useMemo, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

type CalendarTab = "upcoming" | "saved" | "past";

export function FanCalendarScreen() {
  const { rsvps, likes, pastRsvps, isLoading } = useUserEvents();
  const [tab, setTab] = useState<CalendarTab>("upcoming");

  const events = useMemo<any[]>(() => {
    if (tab === "upcoming") return rsvps as any[];
    if (tab === "saved") return likes as any[];
    return pastRsvps as any[];
  }, [likes, pastRsvps, rsvps, tab]);

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-3 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">My Events</Text>

        <View className="mt-3 flex-row">
          <CalendarTabButton
            label={`Upcoming (${rsvps.length})`}
            active={tab === "upcoming"}
            onPress={() => setTab("upcoming")}
          />
          <CalendarTabButton
            label={`Saved (${likes.length})`}
            active={tab === "saved"}
            onPress={() => setTab("saved")}
          />
          <CalendarTabButton
            label={`Past (${pastRsvps.length})`}
            active={tab === "past"}
            onPress={() => setTab("past")}
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading events...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => <EventListItem event={item} showActions={false} />}
          ListEmptyComponent={() => (
            <View className="py-16 items-center">
              <Text className="text-gray-500">No events in this section yet.</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function CalendarTabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`mr-2 rounded-xl border px-3 py-2 ${
        active ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
      }`}
    >
      <Text className={`text-xs font-medium ${active ? "text-blue-700" : "text-gray-600"}`}>{label}</Text>
    </TouchableOpacity>
  );
}
