"use client";
import Link from "next/link";
import { Heart, Check } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { EventImage } from "@/components/ui/OptimizedImage";
import { formatEventDate, formatEventTime } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { RoleTone } from "@/lib/ui/roleTone";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useProfileContext } from "@/hooks/useProfileContext";
interface EventCardProps {
  event: {
    _id: Id<"events">;
    title?: string;
    dateTime?: number;
    image?: string;
    rsvpCount: number;
    capacity?: number;
    band?: { name: string; image?: string } | null;
    venue?: { name?: string; city?: string; address?: string } | null;
    isVenueAddressHidden?: boolean;
    attendanceStatus?: "on_list" | "attended";
    attendedAt?: number;
  };
  variant?: "default" | "compact";
  density?: "comfortable" | "dense";
  tone?: RoleTone;
  showLikeButton?: boolean;
  showAttendanceStatus?: boolean;
}
export function EventCard({
  event,
  variant = "default",
  density = "comfortable",
  tone,
  showLikeButton = true,
  showAttendanceStatus = false,
}: EventCardProps) {
  const { mode } = useProfileContext();
  const resolvedTone: RoleTone = tone ?? (mode === "personal" ? "fan" : "band");
  const allowFanActions = mode === "personal";
  const eventStatus = useQuery(
    api.events.getUserEventStatus,
    allowFanActions ? { eventId: event._id } : "skip",
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
  const isLiked = allowFanActions ? (eventStatus?.hasLiked ?? false) : false;
  const hasRsvp = allowFanActions ? (eventStatus?.hasRsvp ?? false) : false;
  const displayTitle = event.title?.trim() || "Untitled Gig";
  const eventDateTime =
    typeof event.dateTime === "number" ? event.dateTime : null;
  const displayDate =
    eventDateTime !== null ? formatEventDate(eventDateTime) : "Date TBD";
  const displayTime =
    eventDateTime !== null ? formatEventTime(eventDateTime) : "Time TBD";
  const isPast = eventDateTime !== null ? eventDateTime < Date.now() : false;
  const accentTextClass = resolvedTone === "fan" ? "text-fan" : "text-band";
  const compact = variant === "compact";
  const paddingClass = compact
    ? density === "dense"
      ? "p-2.5"
      : "p-3"
    : "p-4";
  const imageSizeClass = compact ? "w-16 h-16" : "w-20 h-20";
  return (
    <Link href={`/gig/${event._id}`} className="block group">
      {" "}
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border bg-card transition-colors",
          paddingClass,
          isPast
            ? "opacity-75 border-border"
            : resolvedTone === "fan"
              ? "border-border hover:border-fan/40"
              : "border-border hover:border-band/40",
        )}
      >
        {" "}
        <EventImage
          src={event.image}
          alt={displayTitle}
          className={cn(imageSizeClass, "flex-shrink-0 rounded-md")}
        />{" "}
        <div className="flex-1 min-w-0">
          {" "}
          <h3
            className={cn(
              "truncate text-sm font-medium",
              compact ? "mb-0.5" : "mb-1",
              "text-foreground",
            )}
          >
            {displayTitle}
          </h3>{" "}
          {event.venue ? (
            <div className="relative mt-0.5 overflow-hidden rounded-sm">
              {" "}
              <p
                className={cn(
                  "text-xs truncate transition-all duration-200",
                  event.isVenueAddressHidden
                    ? "text-muted-foreground blur-[2px] opacity-30 select-none"
                    : "text-muted-foreground",
                )}
              >
                {" "}
                {event.venue.name}{" "}
              </p>{" "}
              {event.isVenueAddressHidden && (
                <div className="absolute inset-0 flex items-center bg-background/80 backdrop-blur-sm px-2">
                  {" "}
                  <p className="w-full truncate text-[10px] font-medium text-foreground">
                    {" "}
                    RSVP to reveal location{" "}
                  </p>{" "}
                </div>
              )}{" "}
            </div>
          ) : null}{" "}
          <p
            className={cn(
              "text-xs mt-1",
              isPast ? "text-muted-foreground" : accentTextClass,
            )}
          >
            {" "}
            {displayDate} • {displayTime}{" "}
          </p>{" "}
          {showAttendanceStatus && (
            <span
              className={cn(
                "inline-flex mt-2 rounded-md px-2 py-1 text-[10px] font-medium border",
                event.attendanceStatus === "attended"
                  ? "border-success/40 text-success bg-success/10"
                  : "border-border text-muted-foreground bg-muted",
              )}
            >
              {" "}
              {event.attendanceStatus === "attended"
                ? "Attended"
                : "No check-in"}{" "}
            </span>
          )}{" "}
        </div>{" "}
        <div className="flex items-center gap-1">
          {" "}
          {isPast || !allowFanActions ? (
            <span className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-muted text-muted-foreground border border-border">
              {" "}
              {isPast ? "Completed" : "View only"}{" "}
            </span>
          ) : (
            <button
              onClick={handleRsvpClick}
              className={cn(
                "flex items-center justify-center p-2 rounded-md border transition-colors touch-target",
                hasRsvp
                  ? "bg-success border-success text-white"
                  : cn("bg-transparent border-border", accentTextClass),
              )}
              title={hasRsvp ? "Cancel RSVP" : "RSVP to event"}
            >
              <Check className={cn("w-4 h-4", hasRsvp && "stroke-[3]")} />
            </button>
          )}{" "}
          {showLikeButton && !isPast && allowFanActions && (
            <button
              onClick={handleLikeClick}
              className="flex items-center justify-center p-2 rounded-md border border-border hover:border-like/50 transition-colors touch-target"
            >
              <Heart
                className={cn(
                  "w-4 h-4 transition-colors",
                  isLiked
                    ? "fill-like text-like"
                    : "text-muted-foreground hover:text-like",
                )}
              />
            </button>
          )}{" "}
        </div>{" "}
      </div>{" "}
    </Link>
  );
}
