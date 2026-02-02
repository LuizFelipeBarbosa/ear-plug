/**
 * Minimal Convex Query Example
 *
 * This is the simplest example of fetching data from Convex in the Ear-Plug app.
 * It demonstrates the basic pattern for real-time queries using the useQuery hook.
 *
 * Key concepts:
 * - "use client" directive is required for components using Convex hooks
 * - useQuery returns undefined while loading, then the actual data or null
 * - Data is automatically kept in sync with the backend (real-time updates)
 */
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

/**
 * A minimal component that fetches and displays upcoming events.
 * Copy this pattern as a starting point for any data-fetching component.
 */
export function MinimalQueryExample() {
  // Fetch upcoming events from the Convex backend
  // Returns: EventWithDetails[] | undefined (undefined while loading)
  const events = useQuery(api.events.listUpcoming, { limit: 5 });

  // Handle loading state - events is undefined while the query is in flight
  if (events === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-zinc-400">Loading events...</div>
      </div>
    );
  }

  // Handle empty state - events array is empty
  if (events.length === 0) {
    return (
      <div className="text-center p-8 text-zinc-500">
        No upcoming events found.
      </div>
    );
  }

  // Render the data
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Upcoming Events</h2>
      <ul className="space-y-2">
        {events.map((event) => (
          <li
            key={event._id}
            className="p-4 bg-night-tertiary border border-zinc-800 rounded-lg"
          >
            <h3 className="font-semibold text-white">{event.title}</h3>
            <p className="text-sm text-zinc-400">
              {event.band?.name} at {event.venue?.name}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Query with optional arguments example.
 * Shows how to pass arguments to Convex queries.
 */
export function QueryWithArgsExample({ genre }: { genre?: string }) {
  // Pass arguments as the second parameter to useQuery
  // The query will re-run whenever the arguments change
  const events = useQuery(
    api.events.listByGenre,
    genre ? { genre: genre as "rock" | "indie" | "jazz" | "electronic" | "folk" | "pop" | "alternative" } : "skip"
  );

  // Using "skip" as the second argument skips the query entirely
  // This is useful for conditional queries

  if (events === undefined) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold">
        {genre ? `${genre} Events` : "All Events"}
      </h2>
      <p className="text-zinc-400">{events.length} events found</p>
    </div>
  );
}
