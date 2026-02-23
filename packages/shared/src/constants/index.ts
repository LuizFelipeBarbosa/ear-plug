/**
 * @fileoverview Application constants and configuration values.
 * Contains UI display options, formatting helpers, and navigation configuration.
 * @module @ear-plug/shared/constants
 */

import type { Genre } from "../types";

/**
 * Genre options with display labels for UI dropdowns and filters.
 * Maps internal genre values to human-readable labels.
 */
export const GENRES: { value: Genre; label: string }[] = [
  { value: "indie", label: "Indie" },
  { value: "rock", label: "Rock" },
  { value: "jazz", label: "Jazz" },
  { value: "electronic", label: "Electronic" },
  { value: "folk", label: "Folk" },
  { value: "pop", label: "Pop" },
  { value: "alternative", label: "Alternative" },
];

/**
 * Color mapping for each genre.
 * Used for visual differentiation in UI elements like badges and map markers.
 */
export const GENRE_COLORS: Record<Genre, string> = {
  indie: "#f59e0b",      // Amber
  rock: "#ef4444",       // Red
  jazz: "#6366f1",       // Indigo
  electronic: "#8b5cf6", // Violet
  folk: "#22c55e",       // Green
  pop: "#ec4899",        // Pink
  alternative: "#06b6d4", // Cyan
};

/**
 * Default map center coordinates.
 * Centers on the Oakland/Berkeley area of San Francisco Bay Area.
 */
export const DEFAULT_MAP_CENTER = {
  lat: 37.8044,
  lng: -122.2712,
};

/**
 * Default zoom level for the map.
 * Provides a neighborhood-level view.
 */
export const DEFAULT_MAP_ZOOM = 12;

/**
 * Available distance filter options in miles.
 * Used for "events near me" radius filtering.
 */
export const DISTANCE_OPTIONS = [1, 5, 10, 25, 50];

/**
 * Default radius for filtering nearby events in miles.
 */
export const DEFAULT_RADIUS_MILES = 25;

/**
 * Application route paths.
 * Centralized route definitions for consistent navigation.
 */
export const ROUTES = {
  /** Home/discover page (map view for fans, dashboard for musicians) */
  HOME: "/home",
  /** Calendar/events page */
  CALENDAR: "/calendar",
  /** Messages/notifications page */
  MESSAGES: "/messages",
  /** User profile page */
  PROFILE: "/profile",
  /** Gig finder page (for musicians) */
  GIG: "/gig",
  /** Onboarding/landing page */
  ONBOARDING: "/",
} as const;

/**
 * Bottom navigation items for fan users.
 * Defines the tab bar structure with routes, labels, and icon names.
 */
export const FAN_NAV_ITEMS = [
  { href: ROUTES.HOME, label: "Discover", icon: "map" },
  { href: ROUTES.CALENDAR, label: "My Events", icon: "calendar" },
  { href: ROUTES.MESSAGES, label: "Notifications", icon: "bell" },
  { href: ROUTES.PROFILE, label: "Profile", icon: "user" },
] as const;

/**
 * Bottom navigation items for musician users.
 * Defines the tab bar structure with routes, labels, and icon names.
 */
export const MUSICIAN_NAV_ITEMS = [
  { href: ROUTES.HOME, label: "Dashboard", icon: "layout-dashboard" },
  { href: ROUTES.CALENDAR, label: "Shows", icon: "calendar" },
  { href: ROUTES.MESSAGES, label: "Messages", icon: "message-circle" },
  { href: ROUTES.PROFILE, label: "Profile", icon: "user" },
] as const;

/**
 * Event status display configuration.
 * Maps status values to labels and color classes for UI rendering.
 */
export const EVENT_STATUS_CONFIG = {
  confirmed: {
    label: "Confirmed",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  hold: {
    label: "Tentative",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  available: {
    label: "Available",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
} as const;

/**
 * Application status display configuration.
 * Maps status values to labels and color classes for UI rendering.
 */
export const APPLICATION_STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  accepted: {
    label: "Accepted",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
} as const;

/**
 * Notification type display configuration.
 * Maps notification types to icons and titles for UI rendering.
 */
export const NOTIFICATION_TYPE_CONFIG = {
  event_reminder: {
    icon: "clock",
    title: "Event Reminder",
  },
  lineup_change: {
    icon: "refresh-cw",
    title: "Lineup Change",
  },
  new_event_followed_artist: {
    icon: "music",
    title: "New Show",
  },
  new_event_nearby: {
    icon: "map-pin",
    title: "Nearby Event",
  },
  application_update: {
    icon: "file-text",
    title: "Application Update",
  },
  message: {
    icon: "message-circle",
    title: "New Message",
  },
} as const;

/**
 * Date formatting options for short date display.
 * Example output: "Mon, Jan 15"
 */
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
};

/**
 * Time formatting options for time display.
 * Example output: "8:00 PM"
 */
export const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

/**
 * Full date formatting options for detailed date display.
 * Example output: "Monday, January 15, 2024"
 */
export const FULL_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

/**
 * Formats a price in cents to a display string.
 * Returns "Free" for zero-price events.
 *
 * @param cents - Price in cents
 * @returns Formatted price string (e.g., "Free", "$10.00", "$25.50")
 *
 * @example
 * formatPrice(0);    // "Free"
 * formatPrice(1000); // "$10.00"
 * formatPrice(2550); // "$25.50"
 */
export const formatPrice = (cents: number): string => {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
};

/**
 * Formats a Unix timestamp to a short date string.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Mon, Jan 15")
 *
 * @example
 * formatEventDate(1705363200000); // "Mon, Jan 15"
 */
export const formatEventDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString("en-US", DATE_FORMAT_OPTIONS);
};

/**
 * Formats a Unix timestamp to a time string.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted time string (e.g., "8:00 PM")
 *
 * @example
 * formatEventTime(1705363200000); // "8:00 PM"
 */
export const formatEventTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString("en-US", TIME_FORMAT_OPTIONS);
};

/**
 * Formats a Unix timestamp to a full date string.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted full date string (e.g., "Monday, January 15, 2024")
 *
 * @example
 * formatFullDate(1705363200000); // "Monday, January 15, 2024"
 */
export const formatFullDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString(
    "en-US",
    FULL_DATE_FORMAT_OPTIONS
  );
};

/**
 * Formats a timestamp as a relative time string.
 * Shows human-readable time differences (e.g., "5m ago", "2h ago", "3d ago").
 * Falls back to formatted date for timestamps older than 7 days.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Relative time string or formatted date
 *
 * @example
 * getRelativeTime(Date.now() - 60000);      // "1m ago"
 * getRelativeTime(Date.now() - 3600000);    // "1h ago"
 * getRelativeTime(Date.now() - 86400000);   // "1d ago"
 * getRelativeTime(Date.now() - 1000);       // "Just now"
 */
export const getRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return formatEventDate(timestamp);
  } else if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return "Just now";
  }
};
