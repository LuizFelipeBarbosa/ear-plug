"use client";

import Link from "next/link";
import { EventImage } from "@/components/ui/OptimizedImage";
import { formatEventDate } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";

export interface PastShowFlyerItem {
  eventId: Id<"events">;
  title: string;
  dateTime: number;
  image?: string;
  venueName: string;
  venueCity: string;
  bandName?: string | null;
}

interface PastShowFlyerSectionProps {
  shows: PastShowFlyerItem[];
  emptyMessage: string;
  maxItems?: number;
  className?: string;
  title?: string;
  isLoading?: boolean;
}

export function PastShowFlyerSection({
  shows,
  emptyMessage,
  maxItems = 6,
  className,
  title = "Past Shows",
  isLoading = false,
}: PastShowFlyerSectionProps) {
  const visibleShows = shows.slice(0, maxItems);

  return (
    <section className={className}>
      <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
        {title}
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="border border-zinc-800 bg-night-tertiary overflow-hidden"
            >
              <div className="h-40 bg-night-secondary animate-shimmer" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-night-secondary animate-shimmer" />
                <div className="h-3 w-2/3 bg-night-secondary animate-shimmer" />
                <div className="h-3 w-4/5 bg-night-secondary animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleShows.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleShows.map((show) => (
            <Link
              key={show.eventId}
              href={`/gig/${show.eventId}`}
              className={cn(
                "group block border border-zinc-800 bg-night-tertiary overflow-hidden transition-colors",
                "hover:border-lime/40"
              )}
            >
              <div className="h-40">
                <EventImage src={show.image} alt={show.title} className="h-full w-full" />
              </div>
              <div className="p-3 space-y-1">
                <p className="text-sm font-bold text-white truncate group-hover:text-lime transition-colors">
                  {show.title}
                </p>
                <p className="text-xs text-zinc-500">{formatEventDate(show.dateTime)}</p>
                <p className="text-xs text-zinc-400 truncate">
                  {show.venueName} · {show.venueCity}
                </p>
                {show.bandName ? (
                  <p className="text-xs uppercase tracking-wider text-lime truncate">{show.bandName}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      )}
    </section>
  );
}
