"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Calendar, Clock } from "lucide-react";
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

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleLike({ eventId: event._id });
  };

  const isLiked = eventStatus?.hasLiked ?? false;
  const hasRsvp = eventStatus?.hasRsvp ?? false;

  if (variant === "compact") {
    return (
      <Link href={`/gig/${event._id}`} className="block">
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-surface-dark-secondary rounded-xl hover:shadow-md transition-shadow">
          {/* Event Image */}
          <EventImage
            src={event.image}
            alt={event.title}
            className="w-16 h-16 rounded-lg flex-shrink-0"
          />

          {/* Event Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {event.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {event.venue?.name}
            </p>
            <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
              {formatEventDate(event.dateTime)} • {formatEventTime(event.dateTime)}
            </p>
          </div>

          {/* Like Button */}
          {showLikeButton && (
            <button
              onClick={handleLikeClick}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Heart
                className={cn(
                  "w-5 h-5 transition-colors",
                  isLiked
                    ? "fill-accent-500 text-accent-500"
                    : "text-gray-400"
                )}
              />
            </button>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/gig/${event._id}`} className="block group">
      <div className="bg-white dark:bg-surface-dark-secondary rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        {/* Event Image */}
        <div className="relative aspect-[16/9]">
          <EventImage
            src={event.image}
            alt={event.title}
            className="absolute inset-0 group-hover:scale-105 transition-transform duration-300"
          />

          {/* RSVP Badge */}
          {hasRsvp && (
            <div className="absolute top-3 left-3 px-3 py-1 bg-success-500 text-white text-xs font-semibold rounded-full">
              You&apos;re Going!
            </div>
          )}

          {/* Like Button */}
          {showLikeButton && (
            <button
              onClick={handleLikeClick}
              className={cn(
                "absolute top-3 right-3 p-2 rounded-full transition-all",
                isLiked
                  ? "bg-accent-500 text-white"
                  : "bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-white"
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
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {event.band.name}
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-1">
            {event.title}
          </h3>

          {/* Venue */}
          {event.venue && (
            <div className="flex items-start gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-2">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="block truncate font-medium text-gray-600 dark:text-gray-300">
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
            <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{formatEventDate(event.dateTime)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{formatEventTime(event.dateTime)}</span>
            </div>
          </div>

          {/* RSVP Progress */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-500 dark:text-gray-400">
                {event.rsvpCount} going
              </span>
              <span className="text-gray-400 dark:text-gray-500">
                {event.capacity - event.rsvpCount} spots left
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min((event.rsvpCount / event.capacity) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
