/**
 * @fileoverview Application constants and configuration values.
 * Contains UI display options, formatting helpers, and navigation configuration.
 * @module @ear-plug/shared/constants
 */

import type { Genre, MarketplaceEventType, BookingStatus, ListingStatus } from "../types";

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
  // Marketplace routes
  /** Hire a band marketplace (for fans) */
  HIRE: "/hire",
  /** Fan's bookings dashboard */
  MY_BOOKINGS: "/my-bookings",
  /** Musician's booking management */
  BOOKINGS: "/bookings",
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
    label: "Hold",
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
  // Booking marketplace notification types
  booking_request: {
    icon: "calendar-plus",
    title: "Booking Request",
  },
  booking_accepted: {
    icon: "check-circle",
    title: "Booking Accepted",
  },
  booking_rejected: {
    icon: "x-circle",
    title: "Booking Declined",
  },
  booking_cancelled: {
    icon: "calendar-x",
    title: "Booking Cancelled",
  },
  deposit_received: {
    icon: "dollar-sign",
    title: "Deposit Received",
  },
  payment_received: {
    icon: "credit-card",
    title: "Payment Received",
  },
  booking_reminder: {
    icon: "bell",
    title: "Booking Reminder",
  },
  booking_message: {
    icon: "message-square",
    title: "New Message",
  },
} as const;

// ============================================================================
// MARKETPLACE CONSTANTS
// ============================================================================

/**
 * Marketplace event type options with display labels.
 * Maps internal event type values to human-readable labels.
 */
export const EVENT_TYPES: { value: MarketplaceEventType; label: string; icon: string }[] = [
  { value: "wedding", label: "Wedding", icon: "heart" },
  { value: "corporate", label: "Corporate Event", icon: "briefcase" },
  { value: "private_party", label: "Private Party", icon: "party-popper" },
  { value: "public_gig", label: "Public Gig", icon: "users" },
  { value: "festival", label: "Festival", icon: "tent" },
  { value: "other", label: "Other", icon: "sparkles" },
];

/**
 * Color mapping for each event type.
 * Used for visual differentiation in UI elements.
 */
export const EVENT_TYPE_COLORS: Record<MarketplaceEventType, string> = {
  wedding: "#ec4899",      // Pink
  corporate: "#6366f1",    // Indigo
  private_party: "#f59e0b", // Amber
  public_gig: "#22c55e",   // Green
  festival: "#8b5cf6",     // Violet
  other: "#06b6d4",        // Cyan
};

/**
 * Booking status display configuration.
 * Maps status values to labels, colors, and icons for UI rendering.
 */
export const BOOKING_STATUS_CONFIG: Record<BookingStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}> = {
  pending: {
    label: "Pending",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    icon: "clock",
    description: "Waiting for band response",
  },
  negotiating: {
    label: "Negotiating",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    icon: "message-circle",
    description: "Discussing terms with band",
  },
  accepted: {
    label: "Accepted",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    icon: "check",
    description: "Pay deposit to secure booking",
  },
  deposit_paid: {
    label: "Deposit Paid",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    icon: "dollar-sign",
    description: "Booking secured, pay balance before event",
  },
  confirmed: {
    label: "Confirmed",
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: "check-circle",
    description: "Fully paid and confirmed",
  },
  completed: {
    label: "Completed",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: "flag",
    description: "Event has taken place",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: "x-circle",
    description: "Booking was cancelled",
  },
  rejected: {
    label: "Declined",
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: "x",
    description: "Band declined the request",
  },
  expired: {
    label: "Expired",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: "clock",
    description: "Request expired without response",
  },
};

/**
 * Listing status display configuration.
 * Maps status values to labels and colors for UI rendering.
 */
export const LISTING_STATUS_CONFIG: Record<ListingStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  draft: {
    label: "Draft",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: "file-edit",
  },
  active: {
    label: "Active",
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: "check-circle",
  },
  paused: {
    label: "Paused",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    icon: "pause-circle",
  },
  archived: {
    label: "Archived",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    icon: "archive",
  },
};

/**
 * Default deposit percentage for new listings.
 */
export const DEFAULT_DEPOSIT_PERCENTAGE = 25;

/**
 * Minimum hourly rate in cents ($10/hour).
 */
export const MINIMUM_HOURLY_RATE = 1000;

/**
 * Default minimum booking hours.
 */
export const DEFAULT_MINIMUM_HOURS = 2;

/**
 * Refund policy thresholds.
 */
export const REFUND_POLICY = {
  /** Days before event for full refund */
  FULL_REFUND_DAYS: 30,
  /** Days before event for partial (50%) refund */
  PARTIAL_REFUND_DAYS: 14,
  /** Percentage for partial refund */
  PARTIAL_REFUND_PERCENTAGE: 50,
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
