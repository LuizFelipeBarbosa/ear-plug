"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, Check } from "lucide-react";
import { EventImage } from "@/components/ui/OptimizedImage";
import { EventPollPrompt } from "@/components/events/EventPollPrompt";
import { formatEventDate, formatEventTime } from "@ear-plug/shared/constants";
import type { SpotifyPersonalizationReason } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";
import type { RoleTone } from "@/lib/ui/roleTone";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useEventInteraction } from "@/hooks/useEvents";
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
    personalizationReason?: SpotifyPersonalizationReason;
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
  const {
    hasLiked,
    hasRsvp,
    pollPrompt,
    selectedPollOptionId,
    rsvp,
    toggleLike,
    submitPollResponse,
    dismissPollPrompt,
  } = useEventInteraction(allowFanActions ? event._id : undefined);
  const [isPollSubmitting, setIsPollSubmitting] = useState(false);
  const handleLikeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleLike();
  };
  const handleRsvpClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await rsvp();
  };
  const isLiked = allowFanActions ? hasLiked : false;
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
    <>
      <Link href={`/gig/${event._id}`} className="block group">
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
          <EventImage
            src={event.image}
            alt={displayTitle}
            className={cn(imageSizeClass, "flex-shrink-0 rounded-md")}
          />
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "truncate text-sm font-medium",
                compact ? "mb-0.5" : "mb-1",
                "text-foreground",
              )}
            >
              {displayTitle}
            </h3>
            {event.venue ? (
              <div className="relative mt-0.5 overflow-hidden rounded-sm">
                <p
                  className={cn(
                    "text-xs truncate transition-all duration-200",
                    event.isVenueAddressHidden
                      ? "text-muted-foreground blur-[2px] opacity-30 select-none"
                      : "text-muted-foreground",
                  )}
                >
                  {event.venue.name}
                </p>
                {event.isVenueAddressHidden && (
                  <div className="absolute inset-0 flex items-center bg-background/80 px-2 backdrop-blur-sm">
                    <p className="w-full truncate text-[10px] font-medium text-foreground">
                      RSVP to reveal location
                    </p>
                  </div>
                )}
              </div>
            ) : null}
            <p
              className={cn(
                "mt-1 text-xs",
                isPast ? "text-muted-foreground" : accentTextClass,
              )}
            >
              {displayDate} • {displayTime}
            </p>
            {event.personalizationReason ? (
              <span className="mt-2 inline-flex rounded-full border border-fan/20 bg-fan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fan">
                {event.personalizationReason === "spotify_artist_match"
                  ? "Spotify pick: artist match"
                  : "Spotify pick: genre match"}
              </span>
            ) : null}
            {showAttendanceStatus && (
              <span
                className={cn(
                  "mt-2 inline-flex rounded-md border px-2 py-1 text-[10px] font-medium",
                  event.attendanceStatus === "attended"
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {event.attendanceStatus === "attended"
                  ? "Attended"
                  : "No check-in"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isPast || !allowFanActions ? (
              <span className="rounded-md border border-border bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                {isPast ? "Completed" : "View only"}
              </span>
            ) : (
              <button
                onClick={handleRsvpClick}
                className={cn(
                  "touch-target flex items-center justify-center rounded-md border p-2 transition-colors",
                  hasRsvp
                    ? "border-success bg-success text-white"
                    : cn("border-border bg-transparent", accentTextClass),
                )}
                title={hasRsvp ? "Cancel RSVP" : "RSVP to event"}
              >
                <Check className={cn("h-4 w-4", hasRsvp && "stroke-[3]")} />
              </button>
            )}
            {showLikeButton && !isPast && allowFanActions && (
              <button
                onClick={handleLikeClick}
                className="touch-target flex items-center justify-center rounded-md border border-border p-2 transition-colors hover:border-like/50"
              >
                <Heart
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isLiked
                      ? "fill-like text-like"
                      : "text-muted-foreground hover:text-like",
                  )}
                />
              </button>
            )}
          </div>
        </div>
      </Link>

      {pollPrompt ? (
        <EventPollPrompt
          isOpen
          eventTitle={pollPrompt.eventTitle}
          question={pollPrompt.question}
          options={pollPrompt.options}
          initialSelectedOptionId={selectedPollOptionId}
          isSubmitting={isPollSubmitting}
          onClose={dismissPollPrompt}
          onSubmit={async (optionId) => {
            setIsPollSubmitting(true);
            try {
              await submitPollResponse(optionId);
            } finally {
              setIsPollSubmitting(false);
            }
          }}
        />
      ) : null}
    </>
  );
}
