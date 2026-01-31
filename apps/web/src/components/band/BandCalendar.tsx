"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  Music,
  Users,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useCurrentBand } from "@/hooks/useBand";
import { CreateGigModal } from "./CreateGigModal";
import {
  formatEventDate,
  formatEventTime,
  EVENT_STATUS_CONFIG,
  GENRE_COLORS,
} from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { EventStatus, Genre } from "@ear-plug/shared/types";

export function BandCalendarView() {
  const { band, isLoading: bandLoading } = useCurrentBand();
  const [viewMonth, setViewMonth] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get events from Convex database
  const events = useQuery(
    api.events.listByBand,
    band ? { bandId: band._id, includesPast: false } : "skip"
  );

  const isLoading = bandLoading || events === undefined;

  const prevMonth = () => {
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)
    );
  };

  const monthName = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Group events by date
  const groupedEvents: Record<string, typeof events> = {};
  events?.forEach((event) => {
    const dateKey = new Date(event.dateTime).toDateString();
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = [];
    }
    groupedEvents[dateKey].push(event);
  });

  return (
    <div className="min-h-screen bg-night">
      {/* Header */}
      <header className="bg-night-secondary border-b-2 border-lime/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
            Shows & Availability
          </h1>
          {band && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-lime text-night font-bold uppercase tracking-wider text-xs border-2 border-lime hover:bg-transparent hover:text-lime transition-all touch-target"
            >
              <Plus className="w-4 h-4" />
              Create Gig
            </button>
          )}
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-night-tertiary border border-zinc-800 hover:border-lime/30 transition-colors touch-target"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <span className="text-lg font-bold text-white uppercase tracking-wide">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-night-tertiary border border-zinc-800 hover:border-lime/30 transition-colors touch-target"
          >
            <ChevronRight className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </header>

      {/* Events List */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-night-tertiary border-2 border-zinc-800 animate-shimmer"
              />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-lime mb-3">
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </h3>
                <div className="space-y-3">
                  {dateEvents?.map((event) => (
                    <EventItem key={event._id} event={event} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState onCreateClick={() => setIsModalOpen(true)} band={band} />
        )}
      </div>

      {/* Create Gig Modal */}
      {band && (
        <CreateGigModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          bandId={band._id}
          bandName={band.name}
          onSuccess={() => {
            // Event will appear automatically via Convex real-time sync
          }}
        />
      )}
    </div>
  );
}

interface EventItemProps {
  event: any;
}

function EventItem({ event }: EventItemProps) {
  const statusConfig = EVENT_STATUS_CONFIG[event.status as EventStatus];
  const genreColor = GENRE_COLORS[event.genre as keyof typeof GENRE_COLORS] || "#71717A";

  return (
    <Link
      href={`/gig/${event._id}`}
      className="block bg-night-tertiary border-2 border-zinc-800 p-4 hover:border-lime/30 transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {/* Status Badge */}
            <span
              className={cn(
                "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                event.status === "confirmed" &&
                  "bg-lime/10 border-lime/30 text-lime",
                event.status === "hold" &&
                  "bg-violet/10 border-violet/30 text-violet",
                event.status === "available" &&
                  "bg-zinc-800 border-zinc-700 text-zinc-400"
              )}
            >
              {statusConfig.label}
            </span>
            {/* Genre Badge */}
            <span
              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border"
              style={{
                color: genreColor,
                borderColor: `${genreColor}40`,
                backgroundColor: `${genreColor}10`,
              }}
            >
              {event.genre}
            </span>
          </div>
          <h3 className="font-bold text-white uppercase tracking-wide text-sm group-hover:text-lime transition-colors">
            {event.title}
          </h3>
          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-lime" />
              {formatEventTime(event.dateTime)}
            </span>
            {event.venue && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-violet flex-shrink-0" />
                {event.venue.name}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <div className="text-xl font-bold text-lime">{event.rsvpCount}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
            RSVPs
          </div>
        </div>
      </div>
      {/* Capacity indicator if available */}
      {event.capacity && (
        <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-zinc-600" />
          <div className="flex-1 h-1.5 bg-night-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-violet rounded-full"
              style={{
                width: `${Math.min(
                  (event.rsvpCount / event.capacity) * 100,
                  100
                )}%`,
              }}
            />
          </div>
          <span className="text-[10px] text-zinc-500">
            {event.rsvpCount}/{event.capacity}
          </span>
        </div>
      )}
    </Link>
  );
}

function EmptyState({
  onCreateClick,
  band,
}: {
  onCreateClick: () => void;
  band: any;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-zinc-800">
      <div className="w-16 h-16 bg-night-tertiary border-2 border-zinc-800 flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 text-zinc-600" />
      </div>
      <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-2">
        No upcoming shows
      </h3>
      <p className="text-zinc-500 max-w-[250px] text-sm mb-6">
        {band
          ? "Create your first gig to get started building your calendar"
          : "Create your band profile to start managing shows"}
      </p>
      {band ? (
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-6 py-3 bg-lime text-night font-bold uppercase tracking-wider text-sm border-2 border-lime hover:bg-transparent hover:text-lime transition-all"
        >
          <Plus className="w-4 h-4" />
          Create First Gig
        </button>
      ) : (
        <div className="flex items-center gap-2 text-zinc-600">
          <Music className="w-5 h-5" />
          <span className="text-sm">Create your band profile first</span>
        </div>
      )}
    </div>
  );
}
