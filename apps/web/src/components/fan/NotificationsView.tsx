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
  MessageSquare,
  Filter,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { getRelativeTime, NOTIFICATION_TYPE_CONFIG } from "@ear-plug/shared/constants";
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
        return "bg-yellow-100 text-yellow-600";
      case "new_event_followed_artist":
        return "bg-purple-100 text-purple-600";
      case "new_event_nearby":
        return "bg-blue-100 text-blue-600";
      case "lineup_change":
        return "bg-orange-100 text-orange-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {unreadCount} unread
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 text-primary-600 text-sm font-medium hover:text-primary-700"
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
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  activeFilter === option.value
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {option.label}
                {option.value === "unread" && unreadCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
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
                className="h-20 bg-gray-100 dark:bg-surface-dark-secondary rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={cn(
                  "relative flex gap-3 p-4 rounded-xl transition-colors",
                  notification.read
                    ? "bg-white dark:bg-surface-dark-secondary"
                    : "bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500"
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    getIconBg(notification.type)
                  )}
                >
                  {getIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {notification.content}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {getRelativeTime(notification.timestamp)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification._id)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => removeNotification(notification._id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
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
  filter 
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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-surface-dark-secondary flex items-center justify-center mb-4">
        <Bell className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-[250px]">
        {description}
      </p>
    </div>
  );
}
