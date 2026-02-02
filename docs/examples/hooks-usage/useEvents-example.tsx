/**
 * useEvents Hook Usage Examples
 *
 * Complete examples demonstrating all features of the events-related hooks.
 * These examples show real-world usage patterns for discovering, filtering,
 * and interacting with events.
 */
"use client";

import { useState, useMemo } from "react";
import {
  useEvents,
  useEvent,
  useUserEvents,
  useSearchEvents,
  useNearbyEvents,
} from "@/hooks/useEvents";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { Genre } from "@ear-plug/shared/types";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { GENRES, formatEventDate, formatEventTime } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";

// =============================================================================
// EXAMPLE 1: Basic Event List with Filtering
// =============================================================================

/**
 * Complete event discovery page with genre filtering.
 * Demonstrates useEvents hook with optional genre parameter.
 */
export function EventDiscoveryExample() {
  const [selectedGenre, setSelectedGenre] = useState<Genre | undefined>();

  // The useEvents hook automatically switches between listUpcoming and listByGenre
  const { events, isLoading } = useEvents({
    genre: selectedGenre,
    limit: 20,
  });

  return (
    <div className="space-y-6">
      {/* Genre Filter Bar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedGenre(undefined)}
          className={cn(
            "px-4 py-2 text-sm font-medium border transition-colors",
            !selectedGenre
              ? "bg-lime text-night border-lime"
              : "text-zinc-400 border-zinc-700 hover:border-zinc-500"
          )}
        >
          All Genres
        </button>
        {GENRES.map((genre) => (
          <button
            key={genre.value}
            onClick={() => setSelectedGenre(genre.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium border transition-colors",
              selectedGenre === genre.value
                ? "bg-lime text-night border-lime"
                : "text-zinc-400 border-zinc-700 hover:border-zinc-500"
            )}
          >
            {genre.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-32 bg-night-tertiary border border-zinc-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && events?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-400">
            {selectedGenre
              ? `No ${selectedGenre} events found`
              : "No upcoming events"}
          </p>
        </div>
      )}

      {/* Events Grid */}
      {!isLoading && events && events.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXAMPLE 2: Event Detail with RSVP/Like
// =============================================================================

/**
 * Event detail view with RSVP and like functionality.
 * Demonstrates useEvent hook with user interaction state.
 */
export function EventDetailExample({ eventId }: { eventId: Id<"events"> }) {
  const {
    event,
    hasRsvp,
    hasLiked,
    isLoading,
    rsvp,
    toggleLike,
  } = useEvent(eventId);

  const [isRsvping, setIsRsvping] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const handleRsvp = async () => {
    setIsRsvping(true);
    try {
      await rsvp();
    } finally {
      setIsRsvping(false);
    }
  };

  const handleLike = async () => {
    setIsLiking(true);
    try {
      await toggleLike();
    } finally {
      setIsLiking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-64 bg-zinc-800" />
        <div className="h-8 w-3/4 bg-zinc-800 rounded" />
        <div className="h-4 w-1/2 bg-zinc-800 rounded" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-white mb-2">Event Not Found</h2>
        <p className="text-zinc-400">This event may have been removed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Event Image */}
      {event.image && (
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-64 object-cover"
        />
      )}

      {/* Event Info */}
      <div>
        <h1 className="text-3xl font-bold text-white">{event.title}</h1>
        <p className="text-lg text-lime mt-1">
          {formatEventDate(event.dateTime)} at {formatEventTime(event.dateTime)}
        </p>
      </div>

      {/* Band & Venue */}
      <div className="flex flex-col gap-2">
        {event.band && (
          <p className="text-zinc-300">
            <span className="text-zinc-500">Band:</span> {event.band.name}
          </p>
        )}
        {event.venue && (
          <p className="text-zinc-300">
            <span className="text-zinc-500">Venue:</span> {event.venue.name},{" "}
            {event.venue.city}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleRsvp}
          disabled={isRsvping}
          className={cn(
            "flex-1 py-3 font-bold transition-colors",
            hasRsvp
              ? "bg-lime text-night"
              : "bg-night-tertiary text-white border border-zinc-800 hover:border-lime"
          )}
        >
          {isRsvping ? "Processing..." : hasRsvp ? "Going!" : "RSVP"}
        </button>

        <button
          onClick={handleLike}
          disabled={isLiking}
          className={cn(
            "px-6 py-3 font-bold transition-colors border",
            hasLiked
              ? "bg-lime/10 text-lime border-lime"
              : "bg-night-tertiary text-white border-zinc-800 hover:border-lime"
          )}
        >
          {isLiking ? "..." : hasLiked ? "Liked" : "Like"}
        </button>
      </div>

      {/* Event Stats */}
      <div className="flex gap-6 text-sm text-zinc-400">
        <span>{event.rsvpCount} RSVPs</span>
        <span>Capacity: {event.capacity}</span>
      </div>
    </div>
  );
}

// =============================================================================
// EXAMPLE 3: User's Events (Calendar)
// =============================================================================

/**
 * User's event calendar showing RSVPs, likes, and past events.
 * Demonstrates useUserEvents hook for personalized content.
 */
export function UserEventsCalendarExample() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "saved" | "past">("upcoming");
  const { rsvps, likes, pastRsvps, isLoading } = useUserEvents();

  // Determine which events to show based on active tab
  const displayEvents = useMemo(() => {
    switch (activeTab) {
      case "upcoming":
        return rsvps;
      case "saved":
        return likes;
      case "past":
        return pastRsvps;
      default:
        return [];
    }
  }, [activeTab, rsvps, likes, pastRsvps]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">My Events</h1>

      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-800">
        <TabButton
          active={activeTab === "upcoming"}
          onClick={() => setActiveTab("upcoming")}
          count={rsvps.length}
        >
          Upcoming
        </TabButton>
        <TabButton
          active={activeTab === "saved"}
          onClick={() => setActiveTab("saved")}
          count={likes.length}
        >
          Saved
        </TabButton>
        <TabButton
          active={activeTab === "past"}
          onClick={() => setActiveTab("past")}
          count={pastRsvps.length}
        >
          Past
        </TabButton>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-night-tertiary border border-zinc-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayEvents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-400">
            {activeTab === "upcoming" && "No upcoming RSVPs"}
            {activeTab === "saved" && "No saved events"}
            {activeTab === "past" && "No past events"}
          </p>
        </div>
      )}

      {/* Events List */}
      {!isLoading && displayEvents.length > 0 && (
        <div className="space-y-3">
          {displayEvents.map((event) => (
            <CompactEventCard
              key={event._id}
              event={event}
              isPast={activeTab === "past"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXAMPLE 4: Event Search
// =============================================================================

/**
 * Event search with debounced input.
 * Demonstrates useSearchEvents hook with minimum query length.
 */
export function EventSearchExample() {
  const [query, setQuery] = useState("");
  const { results, isLoading } = useSearchEvents(query);

  // The hook automatically skips queries under 2 characters
  const showResults = query.length >= 2;
  const showPrompt = query.length > 0 && query.length < 2;

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events, bands, or venues..."
          className="w-full px-4 py-3 pl-10 bg-night-tertiary border border-zinc-800 text-white placeholder-zinc-500 focus:border-lime outline-none"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Minimum Length Prompt */}
      {showPrompt && (
        <p className="text-sm text-zinc-500">
          Type at least 2 characters to search
        </p>
      )}

      {/* Loading State */}
      {showResults && isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-night-tertiary animate-pulse rounded"
            />
          ))}
        </div>
      )}

      {/* Search Results */}
      {showResults && !isLoading && (
        <>
          <p className="text-sm text-zinc-400">
            {results.length} result{results.length !== 1 && "s"} for "{query}"
          </p>
          {results.length === 0 ? (
            <p className="text-zinc-500 py-8 text-center">
              No events found matching your search.
            </p>
          ) : (
            <div className="space-y-3">
              {results.map((event) => (
                <CompactEventCard key={event._id} event={event} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// EXAMPLE 5: Nearby Events with Geolocation
// =============================================================================

/**
 * Location-based event discovery.
 * Demonstrates useNearbyEvents + useGeolocation integration.
 */
export function NearbyEventsExample() {
  const [radius, setRadius] = useState(10);
  const [selectedGenre, setSelectedGenre] = useState<Genre | undefined>();

  // Get user's location
  const {
    latitude,
    longitude,
    loading: locationLoading,
    error: locationError,
    requestPosition,
    hasLocation,
  } = useGeolocation();

  // Fetch nearby events when location is available
  const { events, isLoading: eventsLoading } = useNearbyEvents({
    latitude,
    longitude,
    radiusMiles: radius,
    genre: selectedGenre,
    limit: 30,
    enabled: hasLocation, // Only fetch when we have location
  });

  // Combined loading state
  const isLoading = locationLoading || eventsLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Events Near You</h1>

      {/* Location Permission Request */}
      {!hasLocation && !locationLoading && (
        <div className="p-6 bg-night-tertiary border border-zinc-800 text-center">
          {locationError ? (
            <>
              <p className="text-red-400 mb-4">
                Unable to access your location: {locationError.message}
              </p>
              <button
                onClick={requestPosition}
                className="px-4 py-2 bg-lime text-night font-bold"
              >
                Try Again
              </button>
            </>
          ) : (
            <>
              <p className="text-zinc-400 mb-4">
                Allow location access to find events near you
              </p>
              <button
                onClick={requestPosition}
                className="px-4 py-2 bg-lime text-night font-bold"
              >
                Enable Location
              </button>
            </>
          )}
        </div>
      )}

      {/* Filters (only show when location is available) */}
      {hasLocation && (
        <div className="flex flex-wrap gap-4 items-center">
          {/* Distance Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400">Distance:</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="px-3 py-2 bg-night-tertiary border border-zinc-800 text-white"
            >
              <option value={5}>5 miles</option>
              <option value={10}>10 miles</option>
              <option value={25}>25 miles</option>
              <option value={50}>50 miles</option>
            </select>
          </div>

          {/* Genre Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400">Genre:</label>
            <select
              value={selectedGenre ?? ""}
              onChange={(e) =>
                setSelectedGenre((e.target.value as Genre) || undefined)
              }
              className="px-3 py-2 bg-night-tertiary border border-zinc-800 text-white"
            >
              <option value="">All Genres</option>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-night-tertiary animate-pulse rounded"
            />
          ))}
        </div>
      )}

      {/* Events with Distance */}
      {hasLocation && !isLoading && (
        <>
          <p className="text-sm text-zinc-400">
            {events.length} event{events.length !== 1 && "s"} within {radius}{" "}
            miles
          </p>
          {events.length === 0 ? (
            <p className="text-zinc-500 py-8 text-center">
              No events found nearby. Try increasing the distance.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((event: { _id: Id<"events">; title: string; dateTime: number; distance?: number; venue?: { name: string; city: string } | null; band?: { name: string } | null }) => (
                <div
                  key={event._id}
                  className="flex items-center gap-4 p-4 bg-night-tertiary border border-zinc-800"
                >
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{event.title}</h3>
                    <p className="text-sm text-zinc-400">
                      {event.venue?.name}, {event.venue?.city}
                    </p>
                    <p className="text-sm text-lime">
                      {formatEventDate(event.dateTime)}
                    </p>
                  </div>
                  {event.distance !== undefined && (
                    <div className="text-right">
                      <span className="text-lg font-bold text-lime">
                        {event.distance.toFixed(1)}
                      </span>
                      <span className="text-sm text-zinc-400 ml-1">mi</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface EventData {
  _id: Id<"events">;
  title: string;
  dateTime: number;
  image?: string;
  band?: { name: string } | null;
  venue?: { name: string; city: string } | null;
}

function EventCard({ event }: { event: EventData }) {
  return (
    <div className="p-4 bg-night-tertiary border border-zinc-800 hover:border-lime/50 transition-colors">
      {event.image && (
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-32 object-cover mb-3"
        />
      )}
      <h3 className="font-bold text-white truncate">{event.title}</h3>
      <p className="text-sm text-zinc-400 truncate">
        {event.band?.name} at {event.venue?.name}
      </p>
      <p className="text-sm text-lime mt-1">{formatEventDate(event.dateTime)}</p>
    </div>
  );
}

function CompactEventCard({
  event,
  isPast = false,
}: {
  event: EventData;
  isPast?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 bg-night-tertiary border border-zinc-800",
        isPast && "opacity-75"
      )}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white truncate">{event.title}</h3>
        <p className="text-sm text-zinc-400 truncate">
          {event.venue?.name}, {event.venue?.city}
        </p>
        <p className={cn("text-sm mt-1", isPast ? "text-zinc-500" : "text-lime")}>
          {formatEventDate(event.dateTime)}
        </p>
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-3 font-medium transition-colors relative",
        active
          ? "text-lime border-b-2 border-lime"
          : "text-zinc-400 hover:text-white"
      )}
    >
      {children}
      {count > 0 && (
        <span
          className={cn(
            "ml-2 px-2 py-0.5 text-xs rounded-full",
            active ? "bg-lime text-night" : "bg-zinc-800 text-zinc-400"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
