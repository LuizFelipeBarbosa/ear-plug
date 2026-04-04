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
