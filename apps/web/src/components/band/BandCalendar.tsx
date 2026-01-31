"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useCurrentBand } from "@/hooks/useBand";
import {
  formatEventDate,
  formatEventTime,
  EVENT_STATUS_CONFIG,
} from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { EventStatus } from "@ear-plug/shared/types";

export function BandCalendarView() {
  const { band, isLoading: bandLoading } = useCurrentBand();
  const [viewMonth, setViewMonth] = useState(new Date());

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
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Shows & Availability
        </h1>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
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
                className="h-24 bg-gray-100 dark:bg-surface-dark-secondary rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
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
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EventItem({ event }: { event: any }) {
  const statusConfig = EVENT_STATUS_CONFIG[event.status as EventStatus];

  return (
    <Link
      href={`/gig/${event._id}`}
      className="block bg-white dark:bg-surface-dark-secondary rounded-xl p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                statusConfig.bgColor,
                statusConfig.color
              )}
            >
              {statusConfig.label}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {event.title}
          </h3>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatEventTime(event.dateTime)}
            </span>
            {event.venue && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                {event.venue.name}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <div className="text-lg font-bold text-primary-600">
            {event.rsvpCount}
          </div>
          <div className="text-xs text-gray-500">RSVPs</div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-surface-dark-secondary flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No upcoming shows
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-[250px]">
        Apply to open dates or create new events to fill your calendar
      </p>
    </div>
  );
}
