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
