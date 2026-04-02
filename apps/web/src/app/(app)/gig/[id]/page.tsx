"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Calendar,
  CalendarPlus,
  Clock,
  Users,
  DollarSign,
  Ticket,
  QrCode,
  ChevronRight,
  MoreHorizontal,
  Edit3,
  Sparkles,
  Info,
  Music,
} from "lucide-react";
import {
  useEvent,
  useEventCheckinAccess,
  useEventGuestListSummary,
  useMyEventTicket,
} from "@/hooks/useEvents";
import { useProfileContext } from "@/hooks/useProfileContext";
import { EditGigModal } from "@/components/band/EditGigModal";
import { GuestListCard } from "@/components/band/GuestListCard";
import { GuestControlPanelModal } from "@/components/band/GuestControlPanelModal";
import { EventPollPrompt } from "@/components/events/EventPollPrompt";
import { EventTicketPanel } from "@/components/events/EventTicketPanel";
import { EventUnrsvpConfirmModal } from "@/components/events/EventUnrsvpConfirmModal";
import { downloadCalendarInvite } from "@/lib/calendar";
import {
  formatEventTime,
  formatFullDate,
  formatPrice,
} from "@ear-plug/shared/constants";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { resolveAuthReturnTo } from "@/lib/auth/sso";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

interface PageProps {
  params: { id: string };
}

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  },
};

const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export default function EventDetailsPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGuestPanelOpen, setIsGuestPanelOpen] = useState(false);
  const [showMoreBands, setShowMoreBands] = useState(false);
  const [isPollSubmitting, setIsPollSubmitting] = useState(false);
  const [isRsvpSubmitting, setIsRsvpSubmitting] = useState(false);
  const [isTicketQrOpen, setIsTicketQrOpen] = useState(false);
  const [isUnrsvpConfirmOpen, setIsUnrsvpConfirmOpen] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const eventId = id as Id<"events">;
  const backHref = resolveAuthReturnTo(searchParams, "/home");
  const handleBack = () => {
    router.replace(backHref);
  };

  const submitRsvpToggle = async () => {
    setIsRsvpSubmitting(true);

    try {
      await rsvp();
    } finally {
      setIsRsvpSubmitting(false);
    }
  };

  const handleRsvpClick = async () => {
    if (hasRsvp) {
      setIsUnrsvpConfirmOpen(true);
      return;
    }

    await submitRsvpToggle();
  };

  const {
    event,
    hasRsvp,
    hasLiked,
    hasPendingPoll,
    selectedPollOptionId,
    isLoading,
    pollPrompt,
    rsvp,
    toggleLike,
    submitPollResponse,
    dismissPollPrompt,
    openPendingPollPrompt,
  } = useEvent(eventId);
  const { mode, bandId, bands } = useProfileContext();
  const inBandMode = mode === "band";
  const activeBandMembership = bands.find((entry) => entry.band._id === bandId);
  const { canScan } = useEventCheckinAccess(eventId);
  const {
    ticket,
    isLoading: isTicketLoading,
    ensureTicket,
  } = useMyEventTicket(!inBandMode && hasRsvp ? eventId : undefined);
  const isBandParticipant =
    mode === "band" &&
    !!bandId &&
    !!event &&
    (event.bandId === bandId ||
      (event.cohostBands ?? []).some(
        (cohostBand: any) => cohostBand._id === bandId
      ));
  const canViewGuestList = !!activeBandMembership && isBandParticipant;
  const { summary: guestListSummary } = useEventGuestListSummary(
    canViewGuestList && event ? eventId : undefined,
    canViewGuestList && bandId ? bandId : undefined
  );

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: `Check out ${event?.title} at ${event?.venue?.name}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      // Could show toast here
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-64 bg-muted animate-shimmer" />
        <div className="px-4 py-6 space-y-4">
          <div className="h-8 bg-muted rounded-xl w-3/4 animate-shimmer" />
          <div className="h-4 bg-muted rounded-lg w-1/2 animate-shimmer" />
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="h-20 bg-muted rounded-xl animate-shimmer" />
            <div className="h-20 bg-muted rounded-xl animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Event not found
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            This event may have been removed or is no longer available
          </p>
          <button
            onClick={handleBack}
            className="px-5 py-2.5 bg-fan text-white font-medium text-sm rounded-xl hover:bg-fan/90 transition-colors"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  const spotsLeft = event.capacity - event.rsvpCount;
  const fillPercentage = Math.min((event.rsvpCount / event.capacity) * 100, 100);
  const isPast = event.dateTime < Date.now();
  const shouldHideRsvpInsights = !inBandMode && !hasRsvp && !isPast;
  const lockedPreviewFillPercentage = 92;
  const canManageEvent =
    !isPast &&
    isBandParticipant &&
    (activeBandMembership?.membership.role === "owner" ||
      activeBandMembership?.membership.role === "admin");

  // Get display genres
  const displayGenres =
    event.genres && event.genres.length > 0
      ? event.genres
      : event.genre
        ? [event.genre]
        : [];

  // Lineup bands (host + cohosts)
  const lineupBands = event.lineupBands || [];
  const hostBand = lineupBands.find((b: any) => b._id === event.bandId) || event.band;
  const cohostBands = lineupBands.filter((b: any) => b._id !== event.bandId);
  const visibleCohosts = showMoreBands ? cohostBands : cohostBands.slice(0, 2);
  const hasMoreCohosts = cohostBands.length > 2;
  const calendarLocation = event.venue
    ? [
      event.venue.name,
      event.isVenueAddressHidden ? undefined : event.venue.address,
      event.venue.city,
    ]
      .filter(Boolean)
      .join(" • ")
    : "";
  const calendarDescription = [
    event.description,
    hostBand?.name ? `Lineup: ${[hostBand.name, ...cohostBands.map((band: any) => band.name)].join(", ")}` : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");

  const handleAddToCalendar = () => {
    try {
      downloadCalendarInvite(
        {
          title: event.title,
          startsAt: event.dateTime,
          description: calendarDescription,
          location: calendarLocation,
          url: window.location.href,
        },
        event.title
      );
      setCalendarError(null);
    } catch (error) {
      setCalendarError(
        error instanceof Error
          ? error.message
          : "Unable to create a calendar invite for this show."
      );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-40 overflow-x-hidden">
      {/* Hero Image Section */}
      <div className="relative h-72 sm:h-80">
        {event.image ? (
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-band/30 via-fan/20 to-background" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Navigation Actions */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <motion.button

            onClick={handleBack}
            className="p-3 bg-background/80 backdrop-blur-xl border border-border rounded-xl text-foreground hover:bg-background transition-colors touch-target shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>

          <div className="flex items-center gap-2">
            <motion.button

              onClick={handleShare}
              className="p-3 bg-background/80 backdrop-blur-xl border border-border rounded-xl text-foreground hover:bg-background transition-colors touch-target shadow-lg"
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
            {!isPast && !inBandMode && (
              <motion.button

                onClick={() => toggleLike()}
                className={cn(
                  "p-3 backdrop-blur-xl border rounded-xl transition-colors touch-target shadow-lg",
                  hasLiked
                    ? "bg-like/90 border-like text-white"
                    : "bg-background/80 border-border text-foreground hover:bg-background"
                )}
              >
                <Heart className={cn("w-5 h-5", hasLiked && "fill-current")} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Genre Tags */}
        {displayGenres.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
            {displayGenres.slice(0, 3).map((genre: string) => (
              <span
                key={genre}
                className="px-3 py-1 bg-background/90 backdrop-blur-xl border border-border text-xs font-medium text-foreground rounded-full"
              >
                {genre.charAt(0).toUpperCase() + genre.slice(1)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-4 -mt-4 relative z-10"
      >
        {/* Title Section */}
        <motion.div variants={itemVariants} className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            {event.title}
          </h1>

          {/* Host Band */}
          {hostBand && (
            <Link
              href={`/bands/${hostBand._id || event.bandId}`}
              className="inline-flex items-center gap-2 mt-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center">
                {hostBand.image ? (
                  <Image
                    src={hostBand.image}
                    alt={hostBand.name}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <Music className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm font-medium text-foreground group-hover:text-fan transition-colors">
                {hostBand.name}
              </span>
              <span className="text-xs text-muted-foreground">• Host</span>
            </Link>
          )}
        </motion.div>

        {/* Quick Info Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-6">
          <InfoCard
            icon={<Calendar className="w-5 h-5" />}
            label="Date"
            value={formatFullDate(event.dateTime)}
            color="fan"
          />
          <InfoCard
            icon={<Clock className="w-5 h-5" />}
            label="Time"
            value={formatEventTime(event.dateTime)}
            color="fan"
          />
          <InfoCard
            icon={<Users className="w-5 h-5" />}
            label="Capacity"
            value={
              shouldHideRsvpInsights
                ? `${Math.max(event.capacity - 3, 0)} / ${event.capacity}`
                : `${event.rsvpCount} / ${event.capacity}`
            }
            color="band"
            highlight={
              shouldHideRsvpInsights
                ? undefined
                : spotsLeft <= 10 && !isPast
                  ? `${spotsLeft} left`
                  : undefined
            }
            obscured={shouldHideRsvpInsights}
            obscuredLabel="RSVP to reveal"
          />
          <InfoCard
            icon={<DollarSign className="w-5 h-5" />}
            label={event.price ? "Price" : "Free Entry"}
            value={event.price ? formatPrice(event.price) : "$0"}
            color="band"
          />
        </motion.div>

        {!isPast && typeof event.dateTime === "number" ? (
          <motion.div variants={itemVariants} className="mb-6">
            <button
              type="button"
              onClick={handleAddToCalendar}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-fan/30 hover:bg-fan/5"
            >
              <CalendarPlus
                className={cn("h-4 w-4", inBandMode ? "text-band" : "text-fan")}
              />
              Add to Calendar
            </button>
            {calendarError ? (
              <p className="mt-2 text-xs text-red-500">{calendarError}</p>
            ) : null}
          </motion.div>
        ) : null}

        {/* RSVP Progress */}
        {!isPast && (
          <motion.div variants={itemVariants} className="mb-6">
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border border-border bg-card p-4",
                shouldHideRsvpInsights && "border-dashed"
              )}
            >
              <div
                className={cn(
                  "transition-all duration-200",
                  shouldHideRsvpInsights && "blur-[7px] opacity-45"
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {shouldHideRsvpInsights
                      ? "Crowd building fast"
                      : spotsLeft > 0
                        ? `${spotsLeft} spots remaining`
                        : "Sold Out"}
                  </span>
                  <span className="text-sm font-bold text-fan">
                    {shouldHideRsvpInsights
                      ? `${lockedPreviewFillPercentage}%`
                      : `${Math.round(fillPercentage)}%`}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${shouldHideRsvpInsights
                          ? lockedPreviewFillPercentage
                          : fillPercentage
                        }%`,
                    }}
                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      (shouldHideRsvpInsights
                        ? lockedPreviewFillPercentage
                        : fillPercentage) >= 90
                        ? "bg-gradient-to-r from-fan to-red-500"
                        : "bg-gradient-to-r from-fan to-band"
                    )}
                  />
                </div>
              </div>

              {shouldHideRsvpInsights ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                  <span className="rounded-full border border-fan/20 bg-background/90 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-fan shadow-sm">
                    RSVP TO REVEAL
                  </span>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}

        {/* Lineup Section */}
        {lineupBands.length > 1 && (
          <motion.div variants={itemVariants} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Lineup
              </h2>
              <span className="text-xs text-muted-foreground">
                {lineupBands.length} artists
              </span>
            </div>
            <div className="space-y-2">
              {/* Host */}
              {hostBand && (
                <Link
                  href={`/bands/${hostBand._id || event.bandId}`}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-fan/30 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted border border-border overflow-hidden flex items-center justify-center">
                    {hostBand.image ? (
                      <Image
                        src={hostBand.image}
                        alt={hostBand.name}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <Music className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate group-hover:text-fan transition-colors">
                      {hostBand.name}
                    </p>
                    <p className="text-xs text-fan">Host</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )}

              {/* Cohosts */}
              {visibleCohosts.map((band: any, index: number) => (
                <motion.div
                  key={band._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Link
                    href={`/bands/${band._id}`}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-band/30 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-muted border border-border overflow-hidden flex items-center justify-center">
                      {band.image ? (
                        <Image
                          src={band.image}
                          alt={band.name}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <Music className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-band transition-colors">
                        {band.name}
                      </p>
                      <p className="text-xs text-muted-foreground">Co-host</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </motion.div>
              ))}

              {/* Show More */}
              {hasMoreCohosts && (
                <button
                  onClick={() => setShowMoreBands(!showMoreBands)}
                  className="w-full py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showMoreBands
                    ? "Show less"
                    : `+${cohostBands.length - 2} more`}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Description */}
        {event.description && (
          <motion.div variants={itemVariants} className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              About
            </h2>
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-muted-foreground leading-relaxed text-sm">
                {event.description}
              </p>
            </div>
          </motion.div>
        )}

        {/* Band Bio */}
        {event.band?.bio && (
          <motion.div variants={itemVariants} className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              About {event.band.name}
            </h2>
            <div className="bg-gradient-to-br from-fan/5 to-transparent border border-fan/10 rounded-2xl p-4">
              <p className="text-muted-foreground leading-relaxed text-sm line-clamp-4">
                {event.band.bio}
              </p>
              <Link
                href={`/bands/${event.bandId}`}
                className="inline-flex items-center gap-1 text-xs text-fan font-medium mt-2 hover:underline"
              >
                Read more <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* Ticket Panel (if RSVP'd) */}
        {!inBandMode && hasRsvp && (
          <motion.div variants={itemVariants}>
            <EventTicketPanel
              eventId={eventId}
              ticketPayload={ticket}
              isLoading={isTicketLoading}
              onEnsureTicket={ensureTicket}
              onQrExpandedChange={setIsTicketQrOpen}
            />
          </motion.div>
        )}

        {!inBandMode && hasRsvp && hasPendingPoll && event.poll ? (
          <motion.div variants={itemVariants} className="mb-6">
            <div className="rounded-2xl border border-band/20 bg-band/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold  tracking-[0.18em] text-band">
                    RSVP Poll Pending
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {event.poll.question}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Optional. Answer now or come back before the show starts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openPendingPollPrompt(event)}
                  className="rounded-xl bg-band px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-band/90"
                >
                  Answer Poll
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Venue Info */}
        {event.venue && (
          <motion.div variants={itemVariants} className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              Venue
            </h2>
            <div
              className={cn(
                "relative bg-card border rounded-2xl p-4 overflow-hidden transition-all",
                event.isVenueAddressHidden
                  ? "border-dashed border-border"
                  : "border-border"
              )}
            >
              <div
                className={cn(
                  "flex items-start gap-3 transition-all duration-200",
                  event.isVenueAddressHidden && "blur-sm opacity-30"
                )}
              >
                <div className="w-10 h-10 bg-fan/10 border border-fan/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-fan" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">
                    {event.venue.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {event.venue.address}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.venue.city} • Capacity: {event.venue.capacity}
                  </p>
                </div>
              </div>

              {event.isVenueAddressHidden && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm p-4">
                  <MapPin className="w-6 h-6 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground text-center">
                    Venue address hidden
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    RSVP to reveal location
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Guest List Preview (for band members) */}
        {canViewGuestList &&
          (guestListSummary ? (
            <motion.div variants={itemVariants} className="mb-6">
              <GuestListCard
                totalCount={guestListSummary.totalCount}
                previewGuests={guestListSummary.previewGuests}
                canManage={guestListSummary.canManage}
                onOpen={() => setIsGuestPanelOpen(true)}
              />
            </motion.div>
          ) : (
            <div className="mb-6 h-32 bg-muted border border-border rounded-2xl animate-shimmer" />
          ))}

        {/* Band Management Actions */}
        {canManageEvent && (
          <motion.div variants={itemVariants} className="mb-6 space-y-3">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-band/10 border border-band/30 text-band font-medium rounded-xl hover:bg-band/20 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Manage Event
            </button>
          </motion.div>
        )}

        {canScan && (
          <motion.div variants={itemVariants} className="mb-6">
            <Link
              href={`/gig/${eventId}/check-in`}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-fan/10 border border-fan/30 text-fan font-medium rounded-xl hover:bg-fan/20 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              Open Check-in Scanner
            </Link>
          </motion.div>
        )}
      </motion.div>

      {/* Sticky Bottom Action */}
      <AnimatePresence>
        {!isPast && !isTicketQrOpen && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border p-4 z-30"
            style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
          >
            {inBandMode ? (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Info className="w-4 h-4" />
                Band workspace view (RSVP/Like disabled)
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Price info */}
                <div className="flex-shrink-0 text-right pr-3 border-r border-border">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="text-lg font-bold text-foreground">
                    {event.price ? formatPrice(event.price) : "Free"}
                  </p>
                </div>

                {/* RSVP Button */}
                <button
                  onClick={() => void handleRsvpClick()}
                  disabled={(spotsLeft <= 0 && !hasRsvp) || isRsvpSubmitting}
                  className={cn(
                    "flex-1 py-3.5 font-semibold text-base rounded-xl transition-all touch-target",
                    hasRsvp
                      ? "bg-success text-white shadow-lg shadow-success/20"
                      : spotsLeft <= 0
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-fan text-white shadow-lg shadow-fan/25 hover:bg-fan/90",
                    isRsvpSubmitting && "cursor-not-allowed opacity-60",
                  )}
                >
                  {hasRsvp ? (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      You&apos;re Going!
                    </span>
                  ) : spotsLeft <= 0 ? (
                    "Sold Out"
                    ) : (
                      "RSVP to Event"
                    )}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <EditGigModal
        isOpen={canManageEvent && isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        event={event}
      />

      {canViewGuestList && (
        <GuestControlPanelModal
          isOpen={isGuestPanelOpen}
          onClose={() => setIsGuestPanelOpen(false)}
          eventId={eventId}
          bandId={bandId!}
          eventTitle={event.title}
        />
      )}

      <EventUnrsvpConfirmModal
        isOpen={isUnrsvpConfirmOpen}
        eventTitle={event.title?.trim() || "Untitled Gig"}
        isSubmitting={isRsvpSubmitting}
        onClose={() => setIsUnrsvpConfirmOpen(false)}
        onConfirm={async () => {
          await submitRsvpToggle();
          setIsUnrsvpConfirmOpen(false);
        }}
      />

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
    </div>
  );
}

// Info Card Component
function InfoCard({
  icon,
  label,
  value,
  color,
  highlight,
  obscured = false,
  obscuredLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "fan" | "band";
  highlight?: string;
  obscured?: boolean;
  obscuredLabel?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-3",
        obscured && "border-dashed"
      )}
    >
      <div
        className={cn(
          obscured && "select-none blur-[6px] opacity-45"
        )}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className={color === "fan" ? "text-fan" : "text-band"}>
            {icon}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-semibold text-foreground">{value}</p>
          {highlight && (
            <span className="rounded-full bg-fan/10 px-2 py-0.5 text-[10px] font-bold text-fan">
              {highlight}
            </span>
          )}
        </div>
      </div>

      {obscured && obscuredLabel ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full border border-fan/20 bg-background/90 px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-fan shadow-sm">
            {obscuredLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}
