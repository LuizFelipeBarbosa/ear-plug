"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
} from "lucide-react";
import { useEvent, useEventGuestListSummary } from "@/hooks/useEvents";
import { useProfileContext } from "@/hooks/useProfileContext";
import { EditGigModal } from "@/components/band/EditGigModal";
import { GuestListCard } from "@/components/band/GuestListCard";
import { GuestControlPanelModal } from "@/components/band/GuestControlPanelModal";
import {
  formatEventTime,
  formatFullDate,
  formatPrice,
} from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../../../convex/_generated/dataModel";

interface PageProps {
  params: { id: string };
}

export default function EventDetailsPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGuestPanelOpen, setIsGuestPanelOpen] = useState(false);
  const eventId = id as Id<"events">;

  const { event, hasRsvp, hasLiked, isLoading, rsvp, toggleLike } =
    useEvent(eventId);
  const { mode, bandId, bands } = useProfileContext();
  const activeBandMembership = bands.find((entry) => entry.band._id === bandId);
  const isBandParticipant =
    mode === "band" &&
    !!bandId &&
    !!event &&
    (event.bandId === bandId ||
      (event.cohostBands ?? []).some((cohostBand) => cohostBand._id === bandId));
  const canViewGuestList =
    !!activeBandMembership && isBandParticipant;
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
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-night">
        <div className="animate-shimmer">
          <div className="h-64 bg-night-tertiary" />
          <div className="p-6 space-y-4">
            <div className="h-8 bg-night-tertiary w-3/4" />
            <div className="h-4 bg-night-tertiary w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-2">
            Event not found
          </h2>
          <button
            onClick={() => router.back()}
            className="text-lime hover:text-lime-dark uppercase text-xs font-bold tracking-wider"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const spotsLeft = event.capacity - event.rsvpCount;
  const fillPercentage = Math.min((event.rsvpCount / event.capacity) * 100, 100);
  const isPast = event.dateTime < Date.now();
  const inBandMode = mode === "band";
  const canManageEvent =
    !isPast &&
    isBandParticipant &&
    (activeBandMembership?.membership.role === "owner" ||
      activeBandMembership?.membership.role === "admin");

  return (
    <div className="min-h-screen bg-night pb-28">
      {/* Header Image */}
      <div className="relative h-72">
        {event.image ? (
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet/30 to-lime/30" />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/50 to-transparent" />

        {/* Actions */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-3 flex items-center justify-center bg-night-secondary/80 backdrop-blur-sm border border-zinc-800 text-white hover:border-lime/30 transition-colors touch-target"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-3 flex items-center justify-center bg-night-secondary/80 backdrop-blur-sm border border-zinc-800 text-white hover:border-lime/30 transition-colors touch-target"
            >
              <Share2 className="w-5 h-5" />
            </button>
            {!isPast && !inBandMode && (
              <button
                onClick={() => toggleLike()}
                className={cn(
                  "p-3 flex items-center justify-center transition-colors border touch-target",
                  hasLiked
                    ? "bg-lime border-lime text-night"
                    : "bg-night-secondary/80 backdrop-blur-sm border-zinc-800 text-white hover:border-lime/30"
                )}
              >
                <Heart className={cn("w-5 h-5", hasLiked && "fill-current")} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 -mt-8 relative z-10">
        {/* Band Info */}
        {event.band && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 overflow-hidden bg-night-tertiary border-2 border-lime/30">
              {event.band.image ? (
                <Image
                  src={event.band.image}
                  alt={event.band.name}
                  width={56}
                  height={56}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet/30 to-lime/30" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-white uppercase tracking-wide">
                {event.band.name}
              </h3>
              <p className="text-xs text-lime font-bold uppercase tracking-wider">
                {/* Display genres (handle both new and legacy format) */}
                {(event.genres && event.genres.length > 0
                  ? event.genres
                  : event.genre ? [event.genre] : []
                ).map((g: string) => g.charAt(0).toUpperCase() + g.slice(1)).join(" • ")}
              </p>
            </div>
            <Link
              href={`/bands/${event.bandId}`}
              className="ml-auto px-3 py-2 border border-lime/40 text-lime text-[10px] font-bold uppercase tracking-wider hover:bg-lime hover:text-night transition-colors"
            >
              View Band Profile
            </Link>
          </div>
        )}

        {event.lineupBands && event.lineupBands.length > 0 && (
          <div className="mb-6 p-4 bg-night-tertiary border-2 border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
              Lineup
            </h2>
            <div className="space-y-2">
              {event.lineupBands.map((lineupBand) => (
                <div
                  key={lineupBand._id}
                  className="flex items-center justify-between gap-3 border border-zinc-800 bg-night-secondary px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white uppercase tracking-wide truncate">
                      {lineupBand.name}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {lineupBand._id === event.bandId ? "Host band" : "Co-host band"}
                    </p>
                  </div>
                  <Link
                    href={`/bands/${lineupBand._id}`}
                    className="px-3 py-1.5 border border-lime/40 text-lime text-[10px] font-bold uppercase tracking-wider hover:bg-lime hover:text-night transition-colors"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-white uppercase tracking-tight mb-4">
          {event.title}
        </h1>

        {/* Band Bio */}
        {event.band?.bio && (
          <div className="mb-6 p-4 bg-night-tertiary border-l-2 border-lime">
            <p className="text-sm text-zinc-400 leading-relaxed">
              {event.band.bio}
            </p>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <DetailCard
            icon={<Calendar className="w-5 h-5 text-lime" />}
            label="Date"
            value={formatFullDate(event.dateTime)}
          />
          <DetailCard
            icon={<Clock className="w-5 h-5 text-lime" />}
            label="Time"
            value={formatEventTime(event.dateTime)}
          />
          <DetailCard
            icon={<Users className="w-5 h-5 text-violet" />}
            label="RSVPs"
            value={`${event.rsvpCount} / ${event.capacity}`}
          />
          <DetailCard
            icon={<DollarSign className="w-5 h-5 text-violet" />}
            label="Ticket"
            value={event.price ? formatPrice(event.price) : "Free"}
          />
        </div>

        {/* RSVP Progress */}
        <div className="mb-6 p-4 bg-night-tertiary border-2 border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {isPast ? `${event.rsvpCount} attended` : `${spotsLeft} spots remaining`}
            </span>
            <span className={cn("text-xs font-bold", isPast ? "text-zinc-400" : "text-lime")}>
              {Math.round(fillPercentage)}% {isPast ? "capacity" : "full"}
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-800 overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500",
                isPast ? "bg-zinc-600" : "bg-gradient-to-r from-lime to-violet"
              )}
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
              About
            </h2>
            <p className="text-zinc-400 leading-relaxed">
              {event.description}
            </p>
          </div>
        )}

        {canManageEvent && (
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="block mb-6 w-full py-3 text-center font-bold text-xs uppercase tracking-wider border-2 border-violet text-violet hover:bg-violet hover:text-white transition-colors"
          >
            Manage This Event
          </button>
        )}

        {canViewGuestList && (
          guestListSummary ? (
            <GuestListCard
              totalCount={guestListSummary.totalCount}
              previewGuests={guestListSummary.previewGuests}
              canManage={guestListSummary.canManage}
              onOpen={() => setIsGuestPanelOpen(true)}
            />
          ) : (
            <div className="mb-6 h-40 bg-night-tertiary border-2 border-zinc-800 animate-shimmer" />
          )
        )}

        {/* Venue Info */}
        {event.venue && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
              Venue
            </h2>
            <div className="relative overflow-hidden p-4 bg-night-tertiary border-2 border-zinc-800">
              <div
                className={cn(
                  "flex items-start gap-3 transition-all duration-200",
                  event.isVenueAddressHidden && "blur-md opacity-25 select-none pointer-events-none"
                )}
              >
                <MapPin className="w-5 h-5 text-lime mt-0.5" />
                <div>
                  <h3 className="font-bold text-white uppercase tracking-wide">
                    {event.venue.name}
                  </h3>
                  <p
                    className={cn(
                      "text-sm",
                      event.isVenueAddressHidden ? "text-zinc-500 italic" : "text-zinc-400"
                    )}
                  >
                    {event.isVenueAddressHidden
                      ? "Address revealed after RSVP"
                      : event.venue.address}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {event.venue.city} • Capacity: {event.venue.capacity}
                  </p>
                </div>
              </div>
              {event.isVenueAddressHidden && (
                <div className="absolute inset-0 flex items-center justify-center bg-night/80 backdrop-blur-sm">
                  <p className="px-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-zinc-200">
                    RSVP to reveal venue details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RSVP Button - Hidden for past events */}
        {!isPast && (
          <div className="mb-6 p-4 bg-night-secondary border-2 border-zinc-800">
            {inBandMode ? (
              <div className="w-full py-4 font-bold text-sm uppercase tracking-wider border-2 border-zinc-700 bg-zinc-800 text-zinc-300 text-center">
                Band workspace view (RSVP/Like disabled)
              </div>
            ) : (
              <button
                onClick={() => rsvp()}
                disabled={spotsLeft <= 0 && !hasRsvp}
                className={cn(
                  "w-full py-4 font-bold text-lg uppercase tracking-wider transition-all border-2 touch-target",
                  hasRsvp
                    ? "bg-lime text-night border-lime"
                    : spotsLeft <= 0
                      ? "bg-zinc-800 text-zinc-500 border-zinc-800 cursor-not-allowed"
                      : "bg-lime text-night border-lime hover:bg-transparent hover:text-lime"
                )}
              >
                {hasRsvp ? "You're Going! ✓" : spotsLeft <= 0 ? "Sold Out" : "RSVP to Event"}
              </button>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 bg-night-tertiary border-2 border-zinc-800">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-bold text-white text-sm">{value}</p>
    </div>
  );
}
