"use client";
import Link from "next/link";
import { EventImage } from "@/components/ui/OptimizedImage";
import { formatEventDate } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { RoleTone } from "@/lib/ui/roleTone";
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
  tone?: RoleTone;
}
export function PastShowFlyerSection({
  shows,
  emptyMessage,
  maxItems = 6,
  className,
  title = "Past Shows",
  isLoading = false,
  tone = "band",
}: PastShowFlyerSectionProps) {
  const visibleShows = shows.slice(0, maxItems);
  const accentClass =
    tone === "fan" ? "hover:border-fan/40" : "hover:border-band/40";
  const accentText = tone === "fan" ? "text-fan" : "text-band";
  return (
    <section className={className}>
      {" "}
      <h2 className="text-sm font-medium text-muted-foreground mb-3">
        {title}
      </h2>{" "}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {" "}
          {[0, 1].map((index) => (
            <div
              key={index}
              className="border border-border bg-card rounded-lg overflow-hidden"
            >
              {" "}
              <div className="h-40 bg-muted animate-shimmer" />{" "}
              <div className="p-3 space-y-2">
                {" "}
                <div className="h-4 bg-muted animate-shimmer rounded" />{" "}
                <div className="h-3 w-2/3 bg-muted animate-shimmer rounded" />{" "}
                <div className="h-3 w-4/5 bg-muted animate-shimmer rounded" />{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>
      ) : visibleShows.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {" "}
          {visibleShows.map((show) => (
            <Link
              key={show.eventId}
              href={`/gig/${show.eventId}`}
              className={cn(
                "group block border border-border bg-card rounded-lg overflow-hidden transition-colors",
                accentClass,
              )}
            >
              {" "}
              <div className="h-40">
                {" "}
                <EventImage
                  src={show.image}
                  alt={show.title}
                  className="h-full w-full"
                />{" "}
              </div>{" "}
              <div className="p-3 space-y-1">
                {" "}
                <p className="text-sm font-medium text-foreground truncate">
                  {show.title}
                </p>{" "}
                <p className="text-xs text-muted-foreground">
                  {formatEventDate(show.dateTime)}
                </p>{" "}
                <p className="text-xs text-muted-foreground truncate">
                  {" "}
                  {show.venueName} · {show.venueCity}{" "}
                </p>{" "}
                {show.bandName ? (
                  <p className={cn("text-xs truncate", accentText)}>
                    {show.bandName}
                  </p>
                ) : null}{" "}
              </div>{" "}
            </Link>
          ))}{" "}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      )}{" "}
    </section>
  );
}
