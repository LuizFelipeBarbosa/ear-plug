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
