/**
 * Complete Event List Component
 *
 * A full-featured event listing component with:
 * - Genre filtering
 * - Loading states
 * - Empty states
 * - Error handling
 * - Responsive layout
 *
 * This component demonstrates production-ready patterns for listing data from Convex.
 */
"use client";

import { useState } from "react";
import { useEvents } from "@/hooks/useEvents";
import { EventCard } from "./EventCard";
import type { Genre } from "@ear-plug/shared/types";
import { GENRES } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";

interface EventListProps {
  /** Initial genre filter */
  initialGenre?: Genre;
  /** Maximum number of events to display */
  limit?: number;
  /** Show genre filter controls */
  showFilters?: boolean;
  /** Card variant to use */
  cardVariant?: "default" | "compact";
  /** CSS class for the container */
  className?: string;
}

/**
 * Event list component with genre filtering.
 *
 * @example
 * // Basic usage
 * <EventList />
 *
 * @example
 * // With pre-selected genre and limit
 * <EventList initialGenre="rock" limit={10} />
 *
 * @example
 * // Compact cards without filters
 * <EventList showFilters={false} cardVariant="compact" limit={5} />
 */
export function EventList({
  initialGenre,
  limit = 20,
  showFilters = true,
  cardVariant = "default",
  className,
}: EventListProps) {
  const [selectedGenre, setSelectedGenre] = useState<Genre | undefined>(
    initialGenre
  );

  // Use the events hook with optional genre filtering
  const { events, isLoading } = useEvents({
    genre: selectedGenre,
    limit,
  });

  return (
    <div className={cn("space-y-6", className)}>
      {/* Genre Filter Chips */}
      {showFilters && (
        <GenreFilter
          selectedGenre={selectedGenre}
          onGenreChange={setSelectedGenre}
        />
      )}

      {/* Events Grid/List */}
      <EventsContainer
        events={events}
        isLoading={isLoading}
        cardVariant={cardVariant}
        selectedGenre={selectedGenre}
      />
    </div>
  );
}

/**
 * Genre filter chip selector.
 */
function GenreFilter({
  selectedGenre,
  onGenreChange,
}: {
  selectedGenre: Genre | undefined;
  onGenreChange: (genre: Genre | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* "All" option */}
      <button
        onClick={() => onGenreChange(undefined)}
        className={cn(
          "px-4 py-2 text-sm font-medium transition-colors border",
          selectedGenre === undefined
            ? "bg-lime text-night border-lime"
            : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
        )}
      >
        All
      </button>

      {/* Genre chips */}
      {GENRES.map((genre) => (
        <button
          key={genre.value}
          onClick={() => onGenreChange(genre.value)}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border",
            selectedGenre === genre.value
              ? "bg-lime text-night border-lime"
              : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
          )}
        >
          {genre.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Events container with loading/empty states.
 */
function EventsContainer({
  events,
  isLoading,
  cardVariant,
  selectedGenre,
}: {
  events: ReturnType<typeof useEvents>["events"];
  isLoading: boolean;
  cardVariant: "default" | "compact";
  selectedGenre: Genre | undefined;
}) {
  // Loading state with skeleton cards
  if (isLoading) {
    return (
      <div className={cn(
        cardVariant === "compact" ? "space-y-2" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      )}>
        {Array.from({ length: 6 }).map((_, i) => (
          <EventCardSkeleton key={i} variant={cardVariant} />
        ))}
      </div>
    );
  }

  // Empty state
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-night-tertiary flex items-center justify-center">
          <svg
            className="w-8 h-8 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No events found</h3>
        <p className="text-zinc-400 max-w-sm">
          {selectedGenre
            ? `No upcoming ${selectedGenre} events. Try another genre or check back later.`
            : "No upcoming events at the moment. Check back soon!"}
        </p>
      </div>
    );
  }

  // Events list/grid
  return (
    <div
      className={cn(
        cardVariant === "compact"
          ? "space-y-2"
          : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {events.map((event) => (
        <EventCard
          key={event._id}
          event={event}
          variant={cardVariant}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton loader for event cards.
 */
function EventCardSkeleton({ variant }: { variant: "default" | "compact" }) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 p-3 bg-night-tertiary border border-zinc-800 animate-pulse">
        <div className="w-16 h-16 bg-zinc-800 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
          <div className="h-3 bg-zinc-800 rounded w-1/2" />
          <div className="h-3 bg-zinc-800 rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-night-tertiary border border-zinc-800 rounded-xl animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-zinc-800 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
          <div className="h-3 bg-zinc-800 rounded w-1/2" />
          <div className="h-3 bg-zinc-800 rounded w-2/3" />
          <div className="h-3 bg-zinc-800 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

/**
 * Export for use in pages that need just the filter component.
 */
export { GenreFilter };
