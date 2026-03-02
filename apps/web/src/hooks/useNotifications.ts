/**
 * @fileoverview Custom hook for user notifications.
 * Provides notification listing, read status management, and deletion.
 * @module hooks/useNotifications
 */

"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Hook for accessing and managing user notifications.
 * Provides notifications list, unread count, and management functions.
 *
 * @param options - Optional filter parameters
 * @param options.limit - Maximum number of notifications to fetch
 * @param options.unreadOnly - If true, only fetch unread notifications
 * @returns Object containing notifications, count, and action functions
 *
 * @example
 * function NotificationsPage() {
 *   const {
 *     notifications,
 *     unreadCount,
 *     isLoading,
 *     markAsRead,
 *     markAllAsRead,
 *     removeNotification
 *   } = useNotifications();
 *
 *   return (
 *     <div>
 *       <header>
 *         <h1>Notifications {unreadCount > 0 && `(${unreadCount})`}</h1>
 *         <button onClick={() => markAllAsRead()}>Mark all as read</button>
 *       </header>
 *       {notifications.map(notif => (
 *         <NotificationCard
 *           key={notif._id}
 *           notification={notif}
 *           onRead={() => markAsRead(notif._id)}
 *           onDelete={() => removeNotification(notif._id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 *
 * @example
 * // Show unread count in navigation badge
 * function NavBadge() {
 *   const { unreadCount } = useNotifications();
 *
 *   return unreadCount > 0 ? (
 *     <span className="badge">{unreadCount}</span>
 *   ) : null;
 * }
 */
export function useNotifications(options?: {
  limit?: number;
  unreadOnly?: boolean;
}) {
  /** Array of notifications with related entity data */
  const notifications = useQuery(api.notifications.list, {
    limit: options?.limit,
    unreadOnly: options?.unreadOnly,
  });

  /** Count of unread notifications */
  const unreadCount = useQuery(api.notifications.getUnreadCount);

  /** Mutation to mark a single notification as read */
  const markAsRead = useMutation(api.notifications.markAsRead);

  /** Mutation to mark all notifications as read */
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  /** Mutation to delete a notification */
  const removeNotification = useMutation(api.notifications.remove);

  return {
    /** Array of notification documents with event, band, and venue data */
    notifications: notifications ?? [],
    /** Total count of unread notifications */
    unreadCount: unreadCount ?? 0,
    /** True while notifications are loading */
    isLoading: notifications === undefined,
    /**
     * Marks a single notification as read.
     *
     * @param notificationId - The Convex ID of the notification
     * @returns Promise that resolves when marked
     */
    markAsRead: (notificationId: Id<"notifications">) =>
      markAsRead({ notificationId }),
    /** Marks all notifications as read */
    markAllAsRead,
    /**
     * Deletes a notification.
     *
     * @param notificationId - The Convex ID of the notification to delete
     * @returns Promise that resolves when deleted
     */
    removeNotification: (notificationId: Id<"notifications">) =>
      removeNotification({ notificationId }),
  };
}
