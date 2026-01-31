"use client";

import Link from "next/link";
import { Heart, Ticket } from "lucide-react";
import { useUserEvents } from "@/hooks/useEvents";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { EventImage } from "@/components/ui/OptimizedImage";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface CalendarEventCardProps {
  event: {
    _id: Id<"events">;
    title: string;
    dateTime: number;
    image?: string;
    venue?: { name: string; city: string; address: string } | null;
  };
}

function CalendarEventCard({ event }: CalendarEventCardProps) {
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

  // Format date as "Jan 14"
  const formatShortDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Link href={`/gig/${event._id}`} className="block">
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-surface-dark-secondary rounded-xl hover:shadow-md transition-shadow">
        {/* Square Event Image */}
        <EventImage
          src={event.image}
          alt={event.title}
          className="w-16 h-16 rounded-lg flex-shrink-0 object-cover"
        />

        {/* Event Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
            {event.title}
          </h3>
          {event.venue && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {event.venue.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                {event.venue.address}
              </p>
            </>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
            {formatShortDate(event.dateTime)}
          </p>
        </div>

        {/* Like Button */}
        <button
          onClick={handleLikeClick}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
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
      </div>
    </Link>
  );
}

function EventListSection({
  title,
  events,
  isLoading,
  emptyTitle,
  emptySubtitle,
}: {
  title: string;
  events: CalendarEventCardProps["event"][] | undefined;
  isLoading: boolean;
  emptyTitle: string;
  emptySubtitle: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-surface-dark rounded-2xl p-4 mb-4">
      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">
        {title}
      </h2>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 dark:bg-surface-dark-secondary rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : events && events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event) => (
            <CalendarEventCard key={event._id} event={event} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {emptyTitle}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {emptySubtitle}
          </p>
        </div>
      )}
    </div>
  );
}

export function FanCalendarView() {
  const { rsvps, likes, isLoading } = useUserEvents();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Events
        </h1>
      </header>

      {/* Content */}
      <div className="p-4">
        {/* RSVPs Section */}
        <EventListSection
          title="RSVPs"
          events={rsvps}
          isLoading={isLoading}
          emptyTitle="No RSVPs yet"
          emptySubtitle="RSVP to events to see them here"
        />

        {/* Liked Events Section */}
        <EventListSection
          title="Liked Events"
          events={likes}
          isLoading={isLoading}
          emptyTitle="No liked events yet"
          emptySubtitle="Like events to see them here"
        />
      </div>
    </div>
  );
}
