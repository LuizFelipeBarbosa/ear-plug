"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Calendar, Clock, Check } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { EventImage, AvatarImage } from "@/components/ui/OptimizedImage";
import { formatEventDate, formatEventTime } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";

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
  };
  variant?: "default" | "compact";
  showLikeButton?: boolean;
}

export function EventCard({
  event,
  variant = "default",
  showLikeButton = true,
}: EventCardProps) {
  const eventStatus = useQuery(api.events.getUserEventStatus, {
    eventId: event._id,
  });
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

  const isLiked = eventStatus?.hasLiked ?? false;
  const hasRsvp = eventStatus?.hasRsvp ?? false;

  if (variant === "compact") {
    return (
      <Link href={`/gig/${event._id}`} className="block group">
        <div className="flex items-center gap-3 p-3 bg-night-tertiary/80 backdrop-blur-sm border border-zinc-800 hover:border-lime/50 transition-all duration-200">
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
            <p className="text-sm text-zinc-400 truncate">
              {event.venue?.name}
            </p>
            <p className="text-xs text-lime font-medium mt-1 uppercase tracking-wide">
              {formatEventDate(event.dateTime)} • {formatEventTime(event.dateTime)}
            </p>
          </div>

          {/* RSVP & Like Buttons */}
          <div className="flex items-center gap-1">
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
            {showLikeButton && (
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

  return (
    <Link href={`/gig/${event._id}`} className="block group">
      <div className="bg-night-tertiary/80 backdrop-blur-sm border-2 border-zinc-800 overflow-hidden transition-all duration-300 hover:border-lime/50 hover:shadow-glow-lime">
        {/* Event Image */}
        <div className="relative aspect-[16/9]">
          <EventImage
            src={event.image}
            alt={event.title}
            className="absolute inset-0 group-hover:scale-105 transition-transform duration-500"
          />

          {/* RSVP Badge - Lime */}
          {hasRsvp && (
            <div className="absolute top-3 left-3 px-3 py-1.5 bg-lime text-night text-xs font-bold uppercase tracking-wider">
              You&apos;re Going!
            </div>
          )}

          {/* Like Button */}
          {showLikeButton && (
            <button
              onClick={handleLikeClick}
              className={cn(
                "absolute top-3 right-3 p-2.5 transition-all touch-target",
                isLiked
                  ? "bg-lime text-night"
                  : "bg-night-secondary/80 backdrop-blur-sm text-zinc-400 hover:text-lime"
              )}
            >
              <Heart
                className={cn("w-5 h-5", isLiked && "fill-current")}
              />
            </button>
          )}
        </div>

        {/* Event Details */}
        <div className="p-4">
          {/* Band Info */}
          {event.band && (
            <div className="flex items-center gap-2 mb-2">
              <AvatarImage
                src={event.band.image}
                alt={event.band.name}
                size={24}
                fallbackText={event.band.name}
              />
              <span className="text-sm font-medium text-zinc-400">
                {event.band.name}
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="font-bold text-lg text-white mb-2 line-clamp-1 group-hover:text-lime transition-colors">
            {event.title}
          </h3>

          {/* Venue */}
          {event.venue && (
            <div className="flex items-start gap-1.5 text-sm text-zinc-400 mb-2">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="block truncate font-medium text-zinc-300">
                  {event.venue.name}
                </span>
                <span className="block truncate text-xs">
                  {event.venue.address}
                </span>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-lime">
              <Calendar className="w-4 h-4" />
              <span className="font-medium uppercase text-xs tracking-wide">{formatEventDate(event.dateTime)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Clock className="w-4 h-4" />
              <span className="text-xs">{formatEventTime(event.dateTime)}</span>
            </div>
          </div>

          {/* RSVP Progress - Violet accent */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-zinc-400 text-xs uppercase tracking-wider">
                {event.rsvpCount} going
              </span>
              <span className="text-zinc-600 text-xs">
                {event.capacity - event.rsvpCount} spots left
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-800 overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-lime to-violet transition-all duration-500"
                style={{
                  width: `${Math.min((event.rsvpCount / event.capacity) * 100, 100)}%`,
                }}
              />
            </div>

            {/* RSVP Button */}
            <button
              onClick={handleRsvpClick}
              className={cn(
                "w-full py-3 font-bold text-sm uppercase tracking-wider transition-all border-2 touch-target",
                hasRsvp
                  ? "bg-lime text-night border-lime"
                  : "bg-transparent text-lime border-lime hover:bg-lime hover:text-night"
              )}
            >
              {hasRsvp ? "You're Going! ✓" : "RSVP to Event"}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
