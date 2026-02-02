/**
 * Event Card Component
 *
 * A reusable card component for displaying event information.
 * Supports two variants: default (grid) and compact (list).
 *
 * Features:
 * - RSVP and Like buttons with real-time state
 * - Past event detection and styling
 * - Responsive layout
 * - Accessible button interactions
 */
"use client";

import Link from "next/link";
import { Heart, Check } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { formatEventDate, formatEventTime } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../../convex/_generated/dataModel";

/**
 * Event data expected by the EventCard component.
 * This interface matches the EventWithDetails type from the API.
 */
export interface EventCardData {
  _id: Id<"events">;
  title: string;
  dateTime: number;
  image?: string;
  rsvpCount: number;
  capacity: number;
  band?: { name: string; image?: string } | null;
  venue?: { name: string; city: string; address: string } | null;
}

interface EventCardProps {
  /** Event data to display */
  event: EventCardData;
  /** Card display variant */
  variant?: "default" | "compact";
  /** Show the like button (default: true) */
  showLikeButton?: boolean;
  /** Show the RSVP button (default: true for compact) */
  showRsvpButton?: boolean;
}

/**
 * Event card component with RSVP and like functionality.
 *
 * @example
 * // Default card for grid layouts
 * <EventCard event={event} />
 *
 * @example
 * // Compact card for list views
 * <EventCard event={event} variant="compact" />
 *
 * @example
 * // Without interaction buttons (view-only)
 * <EventCard event={event} showLikeButton={false} showRsvpButton={false} />
 */
export function EventCard({
  event,
  variant = "default",
  showLikeButton = true,
  showRsvpButton = variant === "compact",
}: EventCardProps) {
  // Fetch user's interaction status with this event
  const eventStatus = useQuery(api.events.getUserEventStatus, {
    eventId: event._id,
  });

  // Mutation hooks for interactions
  const toggleLike = useMutation(api.events.toggleLike);
  const rsvp = useMutation(api.events.rsvp);

  // Derive state from query
  const isLiked = eventStatus?.hasLiked ?? false;
  const hasRsvp = eventStatus?.hasRsvp ?? false;
  const isPast = event.dateTime < Date.now();

  // Event handlers with proper event propagation handling
  const handleLikeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleLike({ eventId: event._id });
  };

  const handleRsvpClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await rsvp({ eventId: event._id });
  };

  // Render compact variant
  if (variant === "compact") {
    return (
      <Link href={`/gig/${event._id}`} className="block group">
        <div
          className={cn(
            "flex items-center gap-3 p-3",
            "bg-night-tertiary/80 backdrop-blur-sm",
            "border border-zinc-800 hover:border-lime/50",
            "transition-all duration-200",
            isPast && "opacity-75"
          )}
        >
          {/* Event Image */}
          <div className="w-16 h-16 flex-shrink-0 bg-zinc-800 overflow-hidden">
            {event.image ? (
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-night-tertiary">
                <span className="text-2xl">🎵</span>
              </div>
            )}
          </div>

          {/* Event Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate group-hover:text-lime transition-colors">
              {event.title}
            </h3>
            <p className="text-sm text-zinc-400 truncate">{event.venue?.name}</p>
            <p
              className={cn(
                "text-xs font-medium mt-1 uppercase tracking-wide",
                isPast ? "text-zinc-500" : "text-lime"
              )}
            >
              {formatEventDate(event.dateTime)} • {formatEventTime(event.dateTime)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {isPast ? (
              <CompletedBadge />
            ) : (
              <>
                {showRsvpButton && (
                  <RsvpButton
                    hasRsvp={hasRsvp}
                    onClick={handleRsvpClick}
                    compact
                  />
                )}
                {showLikeButton && (
                  <LikeButton
                    isLiked={isLiked}
                    onClick={handleLikeClick}
                    compact
                  />
                )}
              </>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Render default variant
  return (
    <Link href={`/gig/${event._id}`} className="block group">
      <div
        className={cn(
          "flex items-center gap-4 p-4",
          "bg-night-tertiary/80 backdrop-blur-sm",
          "border border-zinc-800 rounded-xl",
          "hover:border-lime/50 transition-all duration-200",
          isPast && "opacity-75"
        )}
      >
        {/* Event Image */}
        <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
          {event.image ? (
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-night-tertiary">
              <span className="text-3xl">🎵</span>
            </div>
          )}
        </div>

        {/* Event Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate group-hover:text-lime transition-colors">
            {event.title}
          </h3>
          {event.venue && (
            <p className="text-sm text-zinc-300 truncate mt-0.5">
              {event.venue.name}
            </p>
          )}
          {event.venue?.address && (
            <p className="text-sm text-zinc-500 truncate">{event.venue.address}</p>
          )}
          <p className={cn("text-sm mt-0.5", isPast ? "text-zinc-500" : "text-zinc-400")}>
            {formatEventDate(event.dateTime)}
          </p>
        </div>

        {/* Action Button */}
        {isPast ? (
          <CompletedBadge />
        ) : showLikeButton ? (
          <LikeButton isLiked={isLiked} onClick={handleLikeClick} />
        ) : null}
      </div>
    </Link>
  );
}

/**
 * Like button sub-component.
 */
function LikeButton({
  isLiked,
  onClick,
  compact = false,
}: {
  isLiked: boolean;
  onClick: (e: React.MouseEvent) => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center transition-colors touch-target",
        compact
          ? "p-2 hover:bg-zinc-800"
          : "p-2 hover:bg-zinc-800/50 rounded-full flex-shrink-0"
      )}
      aria-label={isLiked ? "Unlike event" : "Like event"}
    >
      <Heart
        className={cn(
          "transition-colors",
          compact ? "w-5 h-5" : "w-6 h-6",
          isLiked ? "fill-lime text-lime" : "text-zinc-500 hover:text-zinc-300"
        )}
      />
    </button>
  );
}

/**
 * RSVP button sub-component.
 */
function RsvpButton({
  hasRsvp,
  onClick,
  compact = false,
}: {
  hasRsvp: boolean;
  onClick: (e: React.MouseEvent) => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center transition-colors touch-target",
        compact ? "p-2" : "px-4 py-2",
        hasRsvp ? "bg-lime text-night" : "hover:bg-zinc-800 text-zinc-500"
      )}
      aria-label={hasRsvp ? "Cancel RSVP" : "RSVP to event"}
    >
      <Check className={cn(compact ? "w-5 h-5" : "w-5 h-5", hasRsvp && "stroke-[3]")} />
    </button>
  );
}

/**
 * Completed badge for past events.
 */
function CompletedBadge() {
  return (
    <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700 flex-shrink-0">
      Completed
    </span>
  );
}

export type { EventCardProps };
