/**
 * Convex Query Patterns
 *
 * This file demonstrates common patterns for querying data from Convex
 * with proper TypeScript types and loading state handling.
 */

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { Genre } from "@ear-plug/shared/types";

// =============================================================================
// PATTERN 1: Basic Query with Loading State
// =============================================================================

/**
 * Basic query pattern with proper loading state handling.
 *
 * Key points:
 * - useQuery returns undefined while loading, then the actual data
 * - Check for undefined to show loading UI
 * - Check for null or empty to show empty state
 */
export function useUpcomingEvents(limit?: number) {
  // Query returns EventWithDetails[] | undefined
  const events = useQuery(api.events.listUpcoming, { limit: limit ?? 50 });

  return {
    events,
    // undefined means still loading
    isLoading: events === undefined,
    // Check if we have actual data
    hasData: events !== undefined && events.length > 0,
    // Count is safe because we check for undefined
    count: events?.length ?? 0,
  };
}

// =============================================================================
// PATTERN 2: Query with Required ID Parameter
// =============================================================================

/**
 * Query that depends on an ID parameter.
 * Uses conditional query with "skip" to handle undefined IDs.
 *
 * @param eventId - The event ID, or undefined to skip the query
 */
export function useEventById(eventId: Id<"events"> | undefined) {
  // Use "skip" as the second argument when ID is undefined
  // This prevents the query from running until we have a valid ID
  const event = useQuery(
    api.events.getById,
    eventId ? { eventId } : "skip"
  );

  return {
    event,
    // Only loading if we have an ID but no data yet
    isLoading: eventId !== undefined && event === undefined,
    // Not found if we have an ID but got null back
    notFound: eventId !== undefined && event === null,
  };
}

// =============================================================================
// PATTERN 3: Query with Multiple Optional Filters
// =============================================================================

/**
 * Query with multiple optional filter parameters.
 * Demonstrates building query args conditionally.
 */
export function useFilteredEvents(filters: {
  genre?: Genre;
  limit?: number;
  searchQuery?: string;
}) {
  const { genre, limit, searchQuery } = filters;

  // Choose which query to use based on filters
  // This is necessary because Convex queries have fixed argument shapes

  // If search query is provided, use search
  const searchResults = useQuery(
    api.events.search,
    searchQuery && searchQuery.length >= 2
      ? { query: searchQuery, limit }
      : "skip"
  );

  // If genre is provided, use genre filter
  const genreResults = useQuery(
    api.events.listByGenre,
    genre && !searchQuery
      ? { genre, limit }
      : "skip"
  );

  // Default to all events
  const allEvents = useQuery(
    api.events.listUpcoming,
    !genre && !searchQuery
      ? { limit }
      : "skip"
  );

  // Return the appropriate result
  if (searchQuery && searchQuery.length >= 2) {
    return {
      events: searchResults ?? [],
      isLoading: searchResults === undefined,
      activeFilter: "search" as const,
    };
  }

  if (genre) {
    return {
      events: genreResults ?? [],
      isLoading: genreResults === undefined,
      activeFilter: "genre" as const,
    };
  }

  return {
    events: allEvents ?? [],
    isLoading: allEvents === undefined,
    activeFilter: "none" as const,
  };
}

// =============================================================================
// PATTERN 4: Dependent Queries
// =============================================================================

/**
 * Pattern for queries that depend on each other.
 * The second query only runs after the first returns data.
 */
export function useUserWithBand() {
  // First query: get current user
  const user = useQuery(api.users.getCurrentUser);

  // Second query: only runs if user is a musician
  // Uses "skip" until we confirm user is a musician
  const band = useQuery(
    api.bands.getCurrentUserBand,
    user?.role === "musician" ? {} : "skip"
  );

  return {
    user,
    band,
    isLoading: user === undefined || (user?.role === "musician" && band === undefined),
    isMusician: user?.role === "musician",
    hasBand: band !== null && band !== undefined,
  };
}

// =============================================================================
// PATTERN 5: Parallel Queries
// =============================================================================

/**
 * Pattern for running multiple independent queries in parallel.
 * All queries run simultaneously for better performance.
 */
export function useDashboardData() {
  // These queries all run in parallel
  const upcomingEvents = useQuery(api.events.listUpcoming, { limit: 5 });
  const userRsvps = useQuery(api.events.getUserRsvps);
  const notifications = useQuery(api.notifications.list, { limit: 10 });
  const unreadCount = useQuery(api.notifications.getUnreadCount);

  // Combine loading states
  const isLoading =
    upcomingEvents === undefined ||
    userRsvps === undefined ||
    notifications === undefined ||
    unreadCount === undefined;

  return {
    upcomingEvents: upcomingEvents ?? [],
    userRsvps: userRsvps ?? [],
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
    isLoading,
    // Individual loading states for partial rendering
    loadingStates: {
      events: upcomingEvents === undefined,
      rsvps: userRsvps === undefined,
      notifications: notifications === undefined,
    },
  };
}

// =============================================================================
// PATTERN 6: Query with Transform
// =============================================================================

/**
 * Pattern for transforming query results.
 * Useful for deriving computed values from raw data.
 */
export function useEventsGroupedByDate() {
  const events = useQuery(api.events.listUpcoming, { limit: 50 });

  // Transform: group events by date
  const groupedEvents = events?.reduce(
    (groups, event) => {
      const date = new Date(event.dateTime).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    },
    {} as Record<string, typeof events>
  );

  // Transform: get date keys sorted
  const dates = groupedEvents
    ? Object.keys(groupedEvents).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      )
    : [];

  return {
    groupedEvents,
    dates,
    totalEvents: events?.length ?? 0,
    isLoading: events === undefined,
  };
}

// =============================================================================
// PATTERN 7: Pagination with Cursor
// =============================================================================

/**
 * Pattern for paginated queries using cursors.
 * Note: This is a conceptual example - actual implementation depends on backend.
 */
export function usePaginatedEvents(pageSize: number = 20) {
  // In a real implementation, you would:
  // 1. Store the cursor in state
  // 2. Pass cursor to query
  // 3. Update cursor when loading more

  const events = useQuery(api.events.listUpcoming, { limit: pageSize });

  return {
    events: events ?? [],
    isLoading: events === undefined,
    // Pagination helpers would go here
    hasMore: events ? events.length >= pageSize : false,
    loadMore: () => {
      // Implementation would depend on backend cursor support
      console.log("Load more events");
    },
  };
}

// =============================================================================
// TYPE HELPERS
// =============================================================================

/**
 * Helper type to extract the return type of a query.
 * Useful when you need to type a variable with query results.
 */
type QueryResult<T> = T extends undefined ? never : T;

/**
 * Type for event with full details (band + venue).
 * Extracted from the API for type safety.
 */
type EventWithDetails = NonNullable<
  ReturnType<typeof useEventById>["event"]
>;

// Export types for use in components
export type { EventWithDetails, QueryResult };
