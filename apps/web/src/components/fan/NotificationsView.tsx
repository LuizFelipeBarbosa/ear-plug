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
  Filter,
  Inbox,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { getRelativeTime } from "@ear-plug/shared/constants";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { panelFade, presenceSyncNoInitial } from "@/lib/motion/presets";
import type { NotificationType } from "@ear-plug/shared/types";

type FilterOption = "all" | "unread" | NotificationType;

const FILTER_OPTIONS: { value: FilterOption; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Inbox },
  { value: "unread", label: "Unread", icon: AlertCircle },
  { value: "event_reminder", label: "Reminders", icon: Clock },
  { value: "new_event_followed_artist", label: "Artists", icon: Music },
  { value: "new_event_nearby", label: "Nearby", icon: MapPin },
  { value: "lineup_change", label: "Updates", icon: RefreshCw },
];

interface Notification {
  _id: string;
  _creationTime: number;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  read: boolean;
  timestamp: number;
  eventId?: string;
  bandId?: string;
  venueId?: string;
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Group notifications by time period
  const groupedNotifications = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { title: string; notifications: Notification[] }[] = [
      { title: "Today", notifications: [] },
      { title: "Yesterday", notifications: [] },
      { title: "This Week", notifications: [] },
      { title: "Earlier", notifications: [] },
    ];

    filteredNotifications.forEach((notification: Notification) => {
      const notifDate = new Date(notification.timestamp);
      const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

      if (notifDay.getTime() === today.getTime()) {
        groups[0].notifications.push(notification);
      } else if (notifDay.getTime() === yesterday.getTime()) {
        groups[1].notifications.push(notification);
      } else if (notifDate.getTime() > lastWeek.getTime()) {
        groups[2].notifications.push(notification);
      } else {
        groups[3].notifications.push(notification);
      }
    });

    return groups.filter((g) => g.notifications.length > 0);
  }, [filteredNotifications]);

  // Calculate stats per category
  const stats = useMemo(() => {
    if (!notifications) return { all: 0, unread: 0, reminders: 0, artists: 0, nearby: 0, updates: 0 };
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      reminders: notifications.filter((n) => n.type === "event_reminder").length,
      artists: notifications.filter((n) => n.type === "new_event_followed_artist").length,
      nearby: notifications.filter((n) => n.type === "new_event_nearby").length,
      updates: notifications.filter((n) => n.type === "lineup_change").length,
    };
  }, [notifications]);

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

  const getIconBg = (type: NotificationType, read: boolean) => {
    if (read) return "bg-muted text-muted-foreground border-border";
    
    switch (type) {
      case "event_reminder":
        return "bg-fan/15 text-fan border-fan/30";
      case "new_event_followed_artist":
        return "bg-band/15 text-band border-band/30";
      case "new_event_nearby":
        return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
      case "lineup_change":
        return "bg-amber-500/15 text-amber-500 border-amber-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await removeNotification(id as any);
    setDeletingId(null);
  };

  const unreadPercentage = stats.all > 0 ? Math.round((stats.unread / stats.all) * 100) : 0;

  return (
    <div className="min-h-screen pb-24 bg-background overflow-x-hidden">
      {/* Header Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-fan/5 via-fan/2 to-transparent h-48" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-fan/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      </div>

      {/* Header */}
      <header className="relative px-4 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Stay updated on your events and artists
            </p>
          </div>
          {unreadCount > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}

              onClick={() => markAllAsRead()}
              className="flex items-center gap-1.5 px-3 py-2 bg-fan/10 text-fan text-xs font-medium rounded-xl hover:bg-fan/20 transition-colors border border-fan/20"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </motion.button>
          )}
        </motion.div>

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mt-5"
        >
          {/* Progress Bar */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-fan/10 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-fan" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {unreadCount === 0 ? "All caught up!" : `${unreadCount} unread`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.all} total notifications
                  </p>
                </div>
              </div>
              {unreadCount > 0 && (
                <span className="text-2xl font-bold text-fan">{unreadPercentage}%</span>
              )}
            </div>
            
            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${100 - unreadPercentage}%` }}
                transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-fan to-fan/70 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      </header>

      {/* Filter Pills */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <div className="flex items-center gap-1.5 pr-2 border-r border-border">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Filter
              </span>
            </div>
            {FILTER_OPTIONS.map((option) => {
              const count =
                option.value === "all"
                  ? stats.all
                  : option.value === "unread"
                  ? stats.unread
                  : option.value === "event_reminder"
                  ? stats.reminders
                  : option.value === "new_event_followed_artist"
                  ? stats.artists
                  : option.value === "new_event_nearby"
                  ? stats.nearby
                  : option.value === "lineup_change"
                  ? stats.updates
                  : 0;

              return (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap rounded-xl transition-colors transition-shadow border touch-target-sm",
                    activeFilter === option.value
                      ? "bg-fan text-white border-fan shadow-md shadow-fan/20"
                      : "bg-card border-border text-muted-foreground hover:border-fan/30 hover:text-foreground"
                  )}
                >
                  <option.icon className="w-3.5 h-3.5" />
                  {option.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full font-semibold",
                        activeFilter === option.value
                          ? "bg-white/20 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <main className="px-4 pt-4">
        <AnimatePresence {...presenceSyncNoInitial}>
          {isLoading ? (
            <LoadingState key="loading" />
          ) : groupedNotifications.length > 0 ? (
            <motion.div
              key={activeFilter}
              variants={panelFade}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              {groupedNotifications.map((group) => (
                <section key={group.title}>
                  {/* Section Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.title}
                    </h2>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {group.notifications.length}
                    </span>
                  </div>

                  {/* Notifications */}
                  <div className="space-y-2">
                    {group.notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={cn(
                          "group relative flex gap-3 p-4 border rounded-xl transition-colors",
                          notification.read
                            ? "bg-card border-border"
                            : "bg-fan/[0.02] border-fan/30 shadow-sm shadow-fan/5"
                        )}
                      >
                        {/* Unread indicator */}
                        {!notification.read && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-fan rounded-r-full" />
                        )}

                        {/* Icon */}
                        <div
                          className={cn(
                            "w-11 h-11 flex items-center justify-center flex-shrink-0 border rounded-xl transition-colors",
                            getIconBg(notification.type, notification.read)
                          )}
                        >
                          {getIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className={cn(
                                "text-sm leading-tight",
                                notification.read
                                  ? "text-foreground"
                                  : "font-semibold text-foreground"
                              )}
                            >
                              {notification.title}
                            </h3>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {getRelativeTime(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {notification.content}
                          </p>

                          {notification.eventId ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Link
                                href={`/gig/${notification.eventId}`}
                                onClick={() => {
                                  if (!notification.read) {
                                    markAsRead(notification._id as any);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-fan/20 bg-fan/10 px-2.5 py-1.5 text-xs font-medium text-fan transition-colors hover:bg-fan/15"
                              >
                                View event
                                <ChevronRight className="w-3 h-3" />
                              </Link>
                            </div>
                          ) : null}
                        </div>

                        {/* Actions */}
                        <div className="ml-auto flex shrink-0 flex-row gap-1 opacity-100 transition-opacity sm:flex-col sm:self-start sm:opacity-0 sm:group-hover:opacity-100">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification._id as any)}
                              className="p-2 flex items-center justify-center text-muted-foreground hover:text-fan hover:bg-fan/10 transition-colors rounded-lg touch-target-sm"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification._id)}
                            disabled={deletingId === notification._id}
                            className="p-2 flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-lg touch-target-sm disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </motion.div>
          ) : (
            <EmptyState
              key="empty"
              hasNotifications={(notifications?.length || 0) > 0}
              filter={activeFilter}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Loading State
function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Section header skeleton */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-4 w-16 bg-muted rounded animate-shimmer" />
          <div className="flex-1 h-px bg-border" />
          <div className="h-3 w-6 bg-muted rounded animate-shimmer" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex gap-3 p-4 bg-card border border-border rounded-xl animate-shimmer"
            >
              <div className="w-11 h-11 bg-muted rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Empty State
function EmptyState({
  hasNotifications,
  filter,
}: {
  hasNotifications: boolean;
  filter: FilterOption;
}) {
  const getConfig = () => {
    if (!hasNotifications) {
      return {
        icon: Bell,
        title: "No notifications yet",
        description: "We'll notify you about events, artist updates, and reminders",
        action: null,
      };
    }

    switch (filter) {
      case "unread":
        return {
          icon: Check,
          title: "All caught up!",
          description: "You've read all your notifications. Great job!",
          action: null,
        };
      case "event_reminder":
        return {
          icon: Clock,
          title: "No reminders",
          description: "Event reminders will appear here before your shows",
          action: null,
        };
      case "new_event_followed_artist":
        return {
          icon: Music,
          title: "No artist updates",
          description: "Follow your favorite artists to get notified about their new events",
          action: { href: "/home", label: "Discover Artists" },
        };
      case "new_event_nearby":
        return {
          icon: MapPin,
          title: "No nearby events",
          description: "Enable location services to find events near you",
          action: null,
        };
      case "lineup_change":
        return {
          icon: RefreshCw,
          title: "No lineup updates",
          description: "You'll be notified here if there are changes to events you're attending",
          action: null,
        };
      default:
        return {
          icon: Inbox,
          title: "No notifications",
          description: "Nothing to show in this category",
          action: null,
        };
    }
  };

  const { icon: Icon, title, description, action } = getConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="w-20 h-20 bg-muted/50 border border-dashed border-border rounded-2xl flex items-center justify-center mb-5"
      >
        <Icon className="w-8 h-8 text-muted-foreground" />
      </motion.div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[260px] mb-6">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-fan text-white font-medium text-sm rounded-xl hover:bg-fan/90 transition-colors shadow-lg shadow-fan/20"
        >
          <Music className="w-4 h-4" />
          {action.label}
        </Link>
      )}
    </motion.div>
  );
}
