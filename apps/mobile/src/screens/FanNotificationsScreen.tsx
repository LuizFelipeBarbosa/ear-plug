import {
  ActionButton,
  AppScreen,
  EmptyState,
  HeroHeader,
  LoadingPanel,
  PillButton,
  SectionCard,
  SectionTitle,
  StatCard,
} from "@/components/ui/AppPrimitives";
import { useNotifications } from "@/hooks/useNotifications";
import { getRelativeTime } from "@ear-plug/shared/constants";
import type { NotificationType } from "@ear-plug/shared/types";
import { useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";

type FilterOption = "all" | "unread" | NotificationType;

const FILTERS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "event_reminder", label: "Reminders" },
  { value: "new_event_followed_artist", label: "Artists" },
  { value: "new_event_nearby", label: "Nearby" },
  { value: "lineup_change", label: "Updates" },
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

  const stats = useMemo(
    () => ({
      total: notifications.length,
      unread: notifications.filter((notification) => !notification.read).length,
      reminders: notifications.filter((notification) => notification.type === "event_reminder").length,
    }),
    [notifications],
  );

  const grouped = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 24 * 60 * 60 * 1000;
    const lastWeek = today - 7 * 24 * 60 * 60 * 1000;

    const groups = {
      Today: [] as typeof notifications,
      Yesterday: [] as typeof notifications,
      "This Week": [] as typeof notifications,
      Earlier: [] as typeof notifications,
    };

    filtered.forEach((notification) => {
      const timestamp = new Date(notification.timestamp);
      const day = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate()).getTime();
      if (day === today) {
        groups.Today.push(notification);
      } else if (day === yesterday) {
        groups.Yesterday.push(notification);
      } else if (day > lastWeek) {
        groups["This Week"].push(notification);
      } else {
        groups.Earlier.push(notification);
      }
    });

    return Object.entries(groups).filter(([, values]) => values.length > 0);
  }, [filtered]);

  return (
    <AppScreen
      scroll
      header={
        <HeroHeader
          title="Notifications"
          subtitle="Stay on top of reminders, nearby shows, and lineup changes."
          eyebrow="Fan Workspace"
          tone="fan"
          action={
            unreadCount > 0 ? (
              <ActionButton
                label="Mark all read"
                tone="fan"
                size="sm"
                onPress={() => void markAllAsRead({})}
              />
            ) : null
          }
        >
          <View className="flex-row gap-2">
            <StatCard label="Unread" value={String(stats.unread)} tone="fan" />
            <StatCard label="Total" value={String(stats.total)} tone="fan" />
            <StatCard label="Reminders" value={String(stats.reminders)} tone="fan" />
          </View>
        </HeroHeader>
      }
    >
      {isLoading ? (
        <LoadingPanel label="Loading notifications..." tone="fan" />
      ) : (
        <>
          <FlatList
            horizontal
            className="mt-1"
            showsHorizontalScrollIndicator={false}
            data={FILTERS}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <PillButton
                label={item.label}
                active={activeFilter === item.value}
                tone="fan"
                onPress={() => setActiveFilter(item.value)}
              />
            )}
          />

          <View className="mt-5 gap-4">
            {grouped.length > 0 ? (
              grouped.map(([label, items]) => (
                <View key={label}>
                  <SectionTitle title={label} subtitle={`${items.length} ${items.length === 1 ? "notification" : "notifications"}`} />
                  {items.map((item) => (
                    <SectionCard key={item._id} tone={item.read ? "neutral" : "fan"}>
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-slate-900">{item.title}</Text>
                          <Text className="mt-2 text-sm leading-6 text-slate-600">{item.content}</Text>
                          <Text className="mt-3 text-xs text-slate-500">{getRelativeTime(item.timestamp)}</Text>
                        </View>
                        {!item.read ? (
                          <View className="h-3 w-3 rounded-full bg-blue-600" />
                        ) : null}
                      </View>

                      <View className="mt-4 flex-row gap-2">
                        {!item.read ? (
                          <View className="flex-1">
                            <ActionButton
                              label="Mark Read"
                              tone="fan"
                              variant="secondary"
                              onPress={() => void markAsRead(item._id)}
                            />
                          </View>
                        ) : null}
                        <View className="flex-1">
                          <ActionButton
                            label="Delete"
                            variant="danger"
                            onPress={() => void removeNotification(item._id)}
                          />
                        </View>
                      </View>
                    </SectionCard>
                  ))}
                </View>
              ))
            ) : (
              <EmptyState
                tone="fan"
                title="You’re all caught up"
                message="New alerts from your followed artists and nearby shows will land here."
              />
            )}
          </View>
        </>
      )}
    </AppScreen>
  );
}
