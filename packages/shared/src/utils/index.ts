/**
 * @fileoverview Utility functions for the Ear-Plug platform.
 * Contains helper functions for calculations, formatting, and data manipulation.
 * @module @ear-plug/shared/utils
 */

/**
 * Calculates the distance between two geographic coordinates using the Haversine formula.
 * This formula accounts for the Earth's curvature to provide accurate distance measurements.
 *
 * @param lat1 - Latitude of the first point in decimal degrees
 * @param lng1 - Longitude of the first point in decimal degrees
 * @param lat2 - Latitude of the second point in decimal degrees
 * @param lng2 - Longitude of the second point in decimal degrees
 * @returns Distance between the two points in miles
 *
 * @example
 * // Distance from San Francisco to Oakland
 * calculateDistance(37.7749, -122.4194, 37.8044, -122.2712); // ~8.4 miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts degrees to radians.
 * Internal helper function for geographic calculations.
 *
 * @param deg - Angle in degrees
 * @returns Angle in radians
 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Clamps a number between a minimum and maximum value.
 * Useful for ensuring values stay within valid bounds.
 *
 * @param value - The value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns The clamped value
 *
 * @example
 * clamp(5, 0, 10);  // 5
 * clamp(-5, 0, 10); // 0
 * clamp(15, 0, 10); // 10
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generates a random alphanumeric ID.
 * Useful for creating temporary client-side identifiers.
 * Note: Not cryptographically secure - use UUID for production IDs.
 *
 * @returns A random 13-character alphanumeric string
 *
 * @example
 * generateId(); // "k9x2m8n4p1q7y"
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Creates a debounced version of a function.
 * The debounced function delays invoking the provided function until after
 * the specified wait time has elapsed since the last call.
 *
 * @template T - The function type
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function
 *
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   console.log("Searching for:", query);
 * }, 300);
 *
 * debouncedSearch("a");   // Cancelled by next call
 * debouncedSearch("ab");  // Cancelled by next call
 * debouncedSearch("abc"); // Executes after 300ms
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Creates a throttled version of a function.
 * The throttled function is invoked at most once per specified time period.
 *
 * @template T - The function type
 * @param func - The function to throttle
 * @param limit - The time period in milliseconds
 * @returns A throttled version of the function
 *
 * @example
 * const throttledScroll = throttle(() => {
 *   console.log("Scroll event processed");
 * }, 100);
 *
 * // Called rapidly, but only executes once per 100ms
 * window.addEventListener("scroll", throttledScroll);
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Returns the grammatically correct singular or plural form of a word.
 *
 * @param count - The number to check
 * @param singular - The singular form of the word
 * @param plural - The plural form (optional, defaults to singular + "s")
 * @returns The appropriate form of the word
 *
 * @example
 * pluralize(1, "event");           // "event"
 * pluralize(5, "event");           // "events"
 * pluralize(1, "person", "people"); // "person"
 * pluralize(3, "person", "people"); // "people"
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  if (count === 1) {
    return singular;
  }
  return plural || `${singular}s`;
}

/**
 * Truncates text to a maximum length with an ellipsis.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length including the ellipsis
 * @returns The truncated text with "..." if it exceeded maxLength
 *
 * @example
 * truncate("Hello World", 8);  // "Hello..."
 * truncate("Hi", 10);          // "Hi"
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Formats large numbers with K/M suffixes for compact display.
 *
 * @param num - The number to format
 * @returns Formatted string with K (thousands) or M (millions) suffix
 *
 * @example
 * formatNumber(500);      // "500"
 * formatNumber(1500);     // "1.5K"
 * formatNumber(1000000);  // "1M"
 * formatNumber(2500000);  // "2.5M"
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

/**
 * Checks if a timestamp represents today's date.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns True if the timestamp is today
 *
 * @example
 * isToday(Date.now()); // true
 * isToday(Date.now() - 86400000); // false (yesterday)
 */
export function isToday(timestamp: number): boolean {
  const today = new Date();
  const date = new Date(timestamp);
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Checks if a timestamp falls within the current week (Sunday to Saturday).
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns True if the timestamp is within this week
 *
 * @example
 * isThisWeek(Date.now()); // true
 */
export function isThisWeek(timestamp: number): boolean {
  const now = new Date();
  const date = new Date(timestamp);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return date >= weekStart && date < weekEnd;
}

/**
 * Extracts initials from a name (first letter of first two words).
 *
 * @param name - Full name to extract initials from
 * @returns Uppercase initials (1-2 characters)
 *
 * @example
 * getInitials("John Doe");     // "JD"
 * getInitials("Madonna");      // "M"
 * getInitials("John Paul II"); // "JP"
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Validates an email address format using a simple regex pattern.
 * Note: This is a basic check, not fully RFC 5322 compliant.
 *
 * @param email - Email address to validate
 * @returns True if the email format is valid
 *
 * @example
 * isValidEmail("user@example.com"); // true
 * isValidEmail("invalid-email");    // false
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates if a string is a properly formatted URL.
 *
 * @param url - URL string to validate
 * @returns True if the URL is valid
 *
 * @example
 * isValidUrl("https://example.com");  // true
 * isValidUrl("not-a-url");            // false
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Combines multiple class name strings, filtering out falsy values.
 * A simplified version of the popular `classnames`/`clsx` libraries.
 *
 * @param classes - Class name strings, undefined, false, or null values
 * @returns Combined class names string
 *
 * @example
 * cn("btn", "btn-primary");                    // "btn btn-primary"
 * cn("btn", isActive && "active", isBig && "large"); // "btn active" (if isActive=true, isBig=false)
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Groups an array of items by a key derived from each item.
 *
 * @template T - The item type
 * @template K - The key type (string or number)
 * @param items - Array of items to group
 * @param keyFn - Function that extracts the grouping key from each item
 * @returns Object with keys mapping to arrays of items
 *
 * @example
 * const events = [
 *   { id: 1, genre: "rock" },
 *   { id: 2, genre: "jazz" },
 *   { id: 3, genre: "rock" }
 * ];
 * groupBy(events, e => e.genre);
 * // { rock: [{ id: 1, ... }, { id: 3, ... }], jazz: [{ id: 2, ... }] }
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}

/**
 * Sorts an array of items by their dateTime property.
 * Creates a new sorted array without mutating the original.
 *
 * @template T - Item type that must have a dateTime property
 * @param items - Array of items to sort
 * @param ascending - Sort direction (true for oldest first, false for newest first)
 * @returns New sorted array
 *
 * @example
 * const events = [
 *   { title: "A", dateTime: 1000 },
 *   { title: "B", dateTime: 500 }
 * ];
 * sortByDate(events, true);  // [{ title: "B", ... }, { title: "A", ... }]
 * sortByDate(events, false); // [{ title: "A", ... }, { title: "B", ... }]
 */
export function sortByDate<T extends { dateTime: number }>(
  items: T[],
  ascending = true
): T[] {
  return [...items].sort((a, b) =>
    ascending ? a.dateTime - b.dateTime : b.dateTime - a.dateTime
  );
}
