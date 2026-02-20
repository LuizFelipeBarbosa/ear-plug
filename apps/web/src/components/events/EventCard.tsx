"use client";

import Link from "next/link";
import { Heart, Check } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { EventImage } from "@/components/ui/OptimizedImage";
import { formatEventDate, formatEventTime } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useProfileContext } from "@/hooks/useProfileContext";

interface EventCardProps {
  event: {
    _id: Id<"events">;
    title: string;
    dateTime: number;
    image?: string;
    rsvpCount: number;
    capacity: number;
    band?: { name: string; image?: string } | null;
    venue?: { name: string; city: string; address: string } | null;
    isVenueAddressHidden?: boolean;
    attendanceStatus?: "on_list" | "attended";
    attendedAt?: number;
  };
  variant?: "default" | "compact";
  showLikeButton?: boolean;
  showAttendanceStatus?: boolean;
}

export function EventCard({
  event,
  variant = "default",
  showLikeButton = true,
  showAttendanceStatus = false,
}: EventCardProps) {
  const { mode } = useProfileContext();
  const allowFanActions = mode === "personal";
  const eventStatus = useQuery(
    api.events.getUserEventStatus,
    allowFanActions ? { eventId: event._id } : "skip"
  );
  const toggleLike = useMutation(api.events.toggleLike);
  const rsvp = useMutation(api.events.rsvp);

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

  const isLiked = allowFanActions ? eventStatus?.hasLiked ?? false : false;
  const hasRsvp = allowFanActions ? eventStatus?.hasRsvp ?? false : false;
  const isPast = event.dateTime < Date.now();

  if (variant === "compact") {
    return (
      <Link href={`/gig/${event._id}`} className="block group">
        <div className={cn(
          "flex items-center gap-3 p-3 bg-night-tertiary/80 backdrop-blur-sm border border-zinc-800 hover:border-lime/50 transition-all duration-200",
          isPast && "opacity-75"
        )}>
          {/* Event Image */}
          <EventImage
            src={event.image}
            alt={event.title}
            className="w-16 h-16 flex-shrink-0"
          />

          {/* Event Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate group-hover:text-lime transition-colors">
              {event.title}
            </h3>
            {event.venue ? (
              <div className="relative mt-0.5 overflow-hidden rounded-sm">
                <p
                  className={cn(
                    "text-sm truncate transition-all duration-200",
                    event.isVenueAddressHidden
                      ? "text-zinc-500 blur-sm opacity-20 select-none"
                      : "text-zinc-400"
                  )}
                >
                  {event.venue.name}
                </p>
                {event.isVenueAddressHidden && (
                  <div className="absolute inset-0 flex items-center bg-night/80 backdrop-blur-sm px-2">
                    <p className="w-full truncate text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-200">
                      RSVP to reveal location
                    </p>
                  </div>
                )}
              </div>
            ) : null}
            <p className={cn(
              "text-xs font-medium mt-1 uppercase tracking-wide",
              isPast ? "text-zinc-500" : "text-lime"
            )}>
              {formatEventDate(event.dateTime)} • {formatEventTime(event.dateTime)}
            </p>
            {showAttendanceStatus && (
              <span
                className={cn(
                  "inline-flex mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border",
                  event.attendanceStatus === "attended"
                    ? "border-lime/50 text-lime bg-lime/10"
                    : "border-zinc-700 text-zinc-400 bg-night-secondary"
                )}
              >
                {event.attendanceStatus === "attended" ? "Attended" : "No check-in"}
              </span>
            )}
          </div>

          {/* RSVP & Like Buttons */}
          <div className="flex items-center gap-1">
            {isPast || !allowFanActions ? (
              <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">
                {isPast ? "Completed" : "View only"}
              </span>
            ) : (
              <button
                onClick={handleRsvpClick}
                className={cn(
                  "p-2 flex items-center justify-center transition-colors touch-target",
                  hasRsvp
                    ? "bg-lime text-night"
                    : "hover:bg-zinc-800 text-zinc-500"
                )}
                title={hasRsvp ? "Cancel RSVP" : "RSVP to event"}
              >
                <Check className={cn("w-5 h-5", hasRsvp && "stroke-[3]")} />
              </button>
            )}
            {showLikeButton && !isPast && allowFanActions && (
              <button
                onClick={handleLikeClick}
                className="p-2 flex items-center justify-center hover:bg-zinc-800 transition-colors touch-target"
              >
                <Heart
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isLiked
                      ? "fill-lime text-lime"
                      : "text-zinc-500"
                  )}
                />
              </button>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Default horizontal layout (matches screenshot design)
  return (
    <Link href={`/gig/${event._id}`} className="block group">
      <div className={cn(
        "flex items-center gap-4 p-4 bg-night-tertiary/80 backdrop-blur-sm border border-zinc-800 rounded-xl hover:border-lime/50 transition-all duration-200",
        isPast && "opacity-75"
      )}>
        {/* Event Image - Square with rounded corners */}
        <EventImage
          src={event.image}
          alt={event.title}
          className="w-20 h-20 flex-shrink-0 rounded-lg"
        />

        {/* Event Info */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-bold text-white truncate group-hover:text-lime transition-colors">
            {event.title}
          </h3>

          {/* Venue */}
          {event.venue && (
            <div className="relative mt-0.5 overflow-hidden rounded-sm">
              <div
                className={cn(
                  "transition-all duration-200",
                  event.isVenueAddressHidden && "blur-sm opacity-20 select-none pointer-events-none"
                )}
              >
                <p className="text-sm text-zinc-300 truncate">
                  {event.venue.name}
                </p>
                {event.venue.address && (
                  <p
                    className={cn(
                      "text-sm truncate",
                      event.isVenueAddressHidden ? "text-zinc-500 italic" : "text-zinc-500"
                    )}
                  >
                    {event.isVenueAddressHidden
                      ? "Address revealed after RSVP"
                      : event.venue.address}
                  </p>
                )}
              </div>
              {event.isVenueAddressHidden && (
                <div className="absolute inset-0 flex items-center bg-night/80 backdrop-blur-sm px-2">
                  <p className="w-full truncate text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-200">
                    RSVP to reveal location
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Date */}
          <p className={cn(
            "text-sm mt-0.5",
            isPast ? "text-zinc-500" : "text-zinc-400"
          )}>
            {formatEventDate(event.dateTime)}
          </p>
          {showAttendanceStatus && (
            <span
              className={cn(
                "inline-flex mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border",
                event.attendanceStatus === "attended"
                  ? "border-lime/50 text-lime bg-lime/10"
                  : "border-zinc-700 text-zinc-400 bg-night-secondary"
              )}
            >
              {event.attendanceStatus === "attended" ? "Attended" : "No check-in"}
            </span>
          )}
        </div>

        {/* Completed badge or Like Button */}
        {isPast || !allowFanActions ? (
          <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700 flex-shrink-0">
            {isPast ? "Completed" : "View only"}
          </span>
        ) : showLikeButton ? (
          <button
            onClick={handleLikeClick}
            className="p-2 flex items-center justify-center hover:bg-zinc-800/50 rounded-full transition-colors touch-target flex-shrink-0"
          >
            <Heart
              className={cn(
                "w-6 h-6 transition-colors",
                isLiked
                  ? "fill-lime text-lime"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            />
          </button>
        ) : null}
      </div>
    </Link>
  );
}
