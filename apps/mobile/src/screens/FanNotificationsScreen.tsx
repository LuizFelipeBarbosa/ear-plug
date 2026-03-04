import { useNotifications } from "@/hooks/useNotifications";
import { getRelativeTime } from "@ear-plug/shared/constants";
import type { NotificationType } from "@ear-plug/shared/types";
import { useMemo, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

type FilterOption = "all" | "unread" | NotificationType;

const FILTERS: FilterOption[] = [
  "all",
  "unread",
  "event_reminder",
  "new_event_followed_artist",
  "new_event_nearby",
  "lineup_change",
  "application_update",
  "message",
];

export function FanNotificationsScreen() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, removeNotification } = useNotifications({
    limit: 100,
  });

  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");

  const filtered = useMemo(() => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "unread") return notifications.filter((notification) => !notification.read);
    return notifications.filter((notification) => notification.type === activeFilter);
  }, [activeFilter, notifications]);

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-3 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Notifications</Text>
        <Text className="text-sm text-gray-500 mt-1">{unreadCount} unread</Text>

        {unreadCount > 0 ? (
          <TouchableOpacity onPress={() => void markAllAsRead({})} className="mt-2 rounded-lg bg-blue-50 py-2">
            <Text className="text-center text-sm font-semibold text-blue-700">Mark all as read</Text>
          </TouchableOpacity>
        ) : null}

        <FlatList
          className="mt-3"
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = activeFilter === item;
            return (
              <TouchableOpacity
                onPress={() => setActiveFilter(item)}
                className={`mr-2 rounded-full border px-3 py-1.5 ${
                  active ? "border-blue-300 bg-blue-50" : "border-gray-200"
                }`}
              >
                <Text className={`text-xs ${active ? "text-blue-700" : "text-gray-600"}`}>{labelForFilter(item)}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View className={`mb-3 rounded-xl border p-4 ${item.read ? "border-gray-200 bg-white" : "border-blue-200 bg-blue-50"}`}>
              <Text className="text-sm font-semibold text-gray-900">{item.title}</Text>
              <Text className="mt-1 text-sm text-gray-600">{item.content}</Text>
              <Text className="mt-1 text-xs text-gray-500">{getRelativeTime(item.timestamp)}</Text>

              <View className="mt-3 flex-row gap-2">
                {!item.read ? (
                  <TouchableOpacity
                    onPress={() => void markAsRead(item._id)}
                    className="flex-1 rounded-lg border border-blue-300 py-2"
                  >
                    <Text className="text-center text-xs font-semibold text-blue-700">Mark read</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  onPress={() => void removeNotification(item._id)}
                  className="flex-1 rounded-lg border border-red-300 py-2"
                >
                  <Text className="text-center text-xs font-semibold text-red-700">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View className="py-16 items-center">
              <Text className="text-gray-500">No notifications.</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function labelForFilter(filter: FilterOption): string {
  switch (filter) {
    case "all":
      return "All";
    case "unread":
      return "Unread";
    case "event_reminder":
      return "Reminders";
    case "new_event_followed_artist":
      return "Artists";
    case "new_event_nearby":
      return "Nearby";
    case "lineup_change":
      return "Lineup";
    case "application_update":
      return "Applications";
    case "message":
      return "Messages";
    default:
      return filter;
  }
}
