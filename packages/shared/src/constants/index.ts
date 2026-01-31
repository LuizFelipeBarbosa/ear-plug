import type { Genre } from "../types";

// Genre options with display labels
export const GENRES: { value: Genre; label: string }[] = [
  { value: "indie", label: "Indie" },
  { value: "rock", label: "Rock" },
  { value: "jazz", label: "Jazz" },
  { value: "electronic", label: "Electronic" },
  { value: "folk", label: "Folk" },
  { value: "pop", label: "Pop" },
  { value: "alternative", label: "Alternative" },
];

// Genre color mapping for UI
export const GENRE_COLORS: Record<Genre, string> = {
  indie: "#f59e0b", // Amber
  rock: "#ef4444", // Red
  jazz: "#6366f1", // Indigo
  electronic: "#8b5cf6", // Violet
  folk: "#22c55e", // Green
  pop: "#ec4899", // Pink
  alternative: "#06b6d4", // Cyan
};

// Default map center (San Francisco Bay Area)
export const DEFAULT_MAP_CENTER = {
  lat: 37.8044,
  lng: -122.2712, // Oakland/Berkeley area
};

// Default map zoom level
export const DEFAULT_MAP_ZOOM = 12;

// Distance filter options (in miles)
export const DISTANCE_OPTIONS = [1, 5, 10, 25, 50];

// Default distance filter
export const DEFAULT_RADIUS_MILES = 25;

// Navigation routes
export const ROUTES = {
  HOME: "/home",
  CALENDAR: "/calendar",
  MESSAGES: "/messages",
  PROFILE: "/profile",
  GIG: "/gig",
  ONBOARDING: "/",
} as const;

// Bottom navigation items for fans
export const FAN_NAV_ITEMS = [
  { href: ROUTES.HOME, label: "Discover", icon: "map" },
  { href: ROUTES.CALENDAR, label: "My Events", icon: "calendar" },
  { href: ROUTES.MESSAGES, label: "Notifications", icon: "bell" },
  { href: ROUTES.PROFILE, label: "Profile", icon: "user" },
] as const;

// Bottom navigation items for musicians
export const MUSICIAN_NAV_ITEMS = [
  { href: ROUTES.HOME, label: "Dashboard", icon: "layout-dashboard" },
  { href: ROUTES.CALENDAR, label: "Shows", icon: "calendar" },
  { href: ROUTES.MESSAGES, label: "Messages", icon: "message-circle" },
  { href: ROUTES.PROFILE, label: "Profile", icon: "user" },
] as const;

// Event status display config
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

// Application status display config
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

// Notification type display config
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

// Date/time formatting options
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
};

export const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

export const FULL_DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

// Price formatting
export const formatPrice = (cents: number): string => {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
};

// Date formatting helpers
export const formatEventDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString("en-US", DATE_FORMAT_OPTIONS);
};

export const formatEventTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString("en-US", TIME_FORMAT_OPTIONS);
};

export const formatFullDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString(
    "en-US",
    FULL_DATE_FORMAT_OPTIONS
  );
};

// Relative time formatting
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
