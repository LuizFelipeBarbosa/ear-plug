"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  Clock,
  Music,
  MapPin,
  RefreshCw,
  Check,
  Trash2,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import {
  getRelativeTime,
  NOTIFICATION_TYPE_CONFIG,
} from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@ear-plug/shared/types";

type FilterOption = "all" | "unread" | NotificationType;

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "event_reminder", label: "Reminders" },
  { value: "new_event_followed_artist", label: "Artists" },
  { value: "new_event_nearby", label: "Nearby" },
  { value: "lineup_change", label: "Updates" },
];

export function FanNotificationsView() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");

  // Filter notifications based on active filter
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];

    switch (activeFilter) {
      case "all":
        return notifications;
      case "unread":
        return notifications.filter((n) => !n.read);
      default:
        return notifications.filter((n) => n.type === activeFilter);
    }
  }, [notifications, activeFilter]);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "event_reminder":
        return <Clock className="w-5 h-5" />;
      case "new_event_followed_artist":
        return <Music className="w-5 h-5" />;
      case "new_event_nearby":
        return <MapPin className="w-5 h-5" />;
      case "lineup_change":
        return <RefreshCw className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getIconBg = (type: NotificationType) => {
    switch (type) {
      case "event_reminder":
        return "bg-fan/10 text-fan border-fan/30";
      case "new_event_followed_artist":
        return "bg-band/10 text-band border-band/30";
      case "new_event_nearby":
        return "bg-fan/10 text-fan border-fan/30";
      case "lineup_change":
        return "bg-band/10 text-band border-band/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-fan/20">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-fan font-medium mt-1">
                  {unreadCount} unread
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 text-fan text-xs font-medium hover:text-fan/80 transition-colors touch-target"
              >
                <Check className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setActiveFilter(option.value)}
                className={cn(
                  "px-4 py-2 text-xs font-medium whitespace-nowrap transition-all border rounded-lg touch-target",
                  activeFilter === option.value
                    ? "bg-fan text-foreground border-fan"
                    : "bg-muted border-border text-muted-foreground hover:border-fan/30",
                )}
              >
                {option.label}
                {option.value === "unread" && unreadCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-fan text-foreground rounded">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Notifications List */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-muted border border-border rounded-lg animate-shimmer"
              />
            ))}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={cn(
                  "relative flex gap-3 p-4 border rounded-lg transition-colors",
                  notification.read
                    ? "bg-muted border-border"
                    : "bg-card border-fan/50",
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "w-10 h-10 flex items-center justify-center flex-shrink-0 border rounded-lg",
                    getIconBg(notification.type),
                  )}
                >
                  {getIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-sm">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {notification.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getRelativeTime(notification.timestamp)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification._id)}
                      className="p-1.5 flex items-center justify-center text-muted-foreground hover:text-fan hover:bg-fan/10 transition-colors touch-target"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => removeNotification(notification._id)}
                    className="p-1.5 flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors touch-target"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Link to event if applicable */}
                {notification.eventId && (
                  <Link
                    href={`/gig/${notification.eventId}`}
                    className="absolute inset-0"
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            hasNotifications={notifications && notifications.length > 0}
            filter={activeFilter}
          />
        )}
      </div>
    </div>
  );
}

function EmptyState({
  hasNotifications,
  filter,
}: {
  hasNotifications: boolean;
  filter: FilterOption;
}) {
  const getMessage = () => {
    if (!hasNotifications) {
      return {
        title: "No notifications yet",
        description: "We'll notify you about events, updates, and more",
      };
    }

    switch (filter) {
      case "unread":
        return {
          title: "All caught up!",
          description: "You've read all your notifications",
        };
      case "event_reminder":
        return {
          title: "No reminders",
          description: "You don't have any event reminders",
        };
      case "new_event_followed_artist":
        return {
          title: "No artist updates",
          description: "Follow artists to get notified about their new events",
        };
      case "new_event_nearby":
        return {
          title: "No nearby events",
          description: "Enable location to get notified about events near you",
        };
      case "lineup_change":
        return {
          title: "No updates",
          description: "You don't have any lineup change notifications",
        };
      default:
        return {
          title: "No notifications",
          description: "Nothing to show in this category",
        };
    }
  };

  const { title, description } = getMessage();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg">
      <div className="w-16 h-16 bg-muted border border-border rounded-lg flex items-center justify-center mb-4">
        <Bell className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-[250px] text-sm">{description}</p>
    </div>
  );
}
