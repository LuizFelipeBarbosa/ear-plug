"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useNotifications(options?: { limit?: number; unreadOnly?: boolean }) {
  const notifications = useQuery(api.notifications.list, {
    limit: options?.limit,
    unreadOnly: options?.unreadOnly,
  });
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const removeNotification = useMutation(api.notifications.remove);

  return {
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
    isLoading: notifications === undefined,
    markAsRead: (notificationId: Id<"notifications">) =>
      markAsRead({ notificationId }),
    markAllAsRead,
    removeNotification: (notificationId: Id<"notifications">) =>
      removeNotification({ notificationId }),
  };
}
