"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarDays,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  Music,
  Users,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useCurrentBand } from "@/hooks/useBand";
import { useProfileContext } from "@/hooks/useProfileContext";
import { CreateGigModal } from "./CreateGigModal";
import { CreateGigTypeModal } from "./CreateGigTypeModal";
import { EditGigModal } from "./EditGigModal";
import {
  formatEventTime,
  EVENT_STATUS_CONFIG,
  GENRE_COLORS,
} from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { EventStatus } from "@ear-plug/shared/types";

type CreationKind = "tentative" | "confirmed";
type ViewMode = "list" | "month";

interface CalendarCell {
  dateKey: string | null;
  dayNumber: number | null;
  isCurrentMonth: boolean;
}

const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

function toLocalDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateHeadingFromKey(dateKey: string): string {
  return parseLocalDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function isInViewMonth(timestamp: number, viewMonth: Date): boolean {
  const date = new Date(timestamp);
  return (
    date.getFullYear() === viewMonth.getFullYear() &&
    date.getMonth() === viewMonth.getMonth()
  );
}

function buildMonthCells(viewMonth: Date): CalendarCell[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({
      dateKey: null,
      dayNumber: null,
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({
      dateKey: toLocalDateKey(date.getTime()),
      dayNumber: day,
      isCurrentMonth: true,
    });
  }

  while (cells.length < totalCells) {
    cells.push({
      dateKey: null,
      dayNumber: null,
      isCurrentMonth: false,
    });
  }

  return cells;
}

export function BandCalendarView() {
  const { band, isLoading: bandLoading } = useCurrentBand();
  const { bands } = useProfileContext();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") {
      return "list";
    }

    const stored = window.localStorage.getItem("band-calendar-view-mode");
    return stored === "month" ? "month" : "list";
  });
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creationKind, setCreationKind] = useState<CreationKind>("confirmed");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const activeMembership = bands.find((entry) => entry.band._id === band?._id);
  const canManageShows =
    activeMembership?.membership.role === "owner" ||
    activeMembership?.membership.role === "admin";

  // Get events from Convex database
  const events = useQuery(
    api.events.listByBand,
    band ? { bandId: band._id, includesPast: false } : "skip",
  );

  const isLoading = bandLoading || events === undefined;

  const prevMonth = () => {
    setSelectedDateKey(null);
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setSelectedDateKey(null);
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
    );
  };

  const monthName = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const scheduledEvents = useMemo<any[]>(
    () => (events ?? []).filter((event) => typeof event.dateTime === "number"),
    [events],
  );

  const scheduledEventsInViewMonth = useMemo(
    () =>
      scheduledEvents.filter((event) =>
        isInViewMonth(event.dateTime as number, viewMonth),
      ),
    [scheduledEvents, viewMonth],
  );

  const unscheduledTentatives = useMemo(
    () =>
      (events ?? []).filter(
        (event) => event.status === "hold" && event.dateTime === undefined,
      ),
    [events],
  );

  const groupedEvents = useMemo(() => {
    const grouped: Record<string, any[]> = {};

    scheduledEventsInViewMonth.forEach((event) => {
      const dateKey = toLocalDateKey(event.dateTime as number);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  }, [scheduledEventsInViewMonth]);

  const eventsByDateKey = useMemo(() => {
    const byDate: Record<string, any[]> = {};

    scheduledEventsInViewMonth.forEach((event) => {
      const dateKey = toLocalDateKey(event.dateTime as number);
      if (!byDate[dateKey]) {
        byDate[dateKey] = [];
      }
      byDate[dateKey].push(event);
    });

    return byDate;
  }, [scheduledEventsInViewMonth]);

  const monthCells = useMemo(() => buildMonthCells(viewMonth), [viewMonth]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDateKey) {
      return [];
    }

    const dayEvents = eventsByDateKey[selectedDateKey] ?? [];
    return [...dayEvents].sort(
      (a, b) => (a.dateTime as number) - (b.dateTime as number),
    );
  }, [eventsByDateKey, selectedDateKey]);

  const hasListEvents =
    Object.keys(groupedEvents).length > 0 || unscheduledTentatives.length > 0;
  const hasMonthEvents = scheduledEventsInViewMonth.length > 0;

  const openCreateChooser = () => {
    setIsCreateTypeModalOpen(true);
  };

  const handleCreateTypeSelect = (kind: CreationKind) => {
    setCreationKind(kind);
    setIsCreateTypeModalOpen(false);
    setIsCreateModalOpen(true);
  };

  const openTentativeEditor = (event: any) => {
    setSelectedEvent(event);
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    window.localStorage.setItem("band-calendar-view-mode", viewMode);
  }, [viewMode]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="bg-card border-b border-band/20 p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">
            Shows & Availability
          </h1>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex border border-border bg-muted p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium border transition-all flex items-center gap-1.5 sm:gap-2 rounded-md",
                  viewMode === "list"
                    ? "bg-band text-foreground border-band"
                    : "bg-card border-transparent text-muted-foreground hover:text-band",
                )}
              >
                <List className="w-3 h-3 sm:w-4 sm:h-4" />
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode("month")}
                aria-pressed={viewMode === "month"}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium border transition-all flex items-center gap-1.5 sm:gap-2 rounded-md ml-1",
                  viewMode === "month"
                    ? "bg-band text-foreground border-band"
                    : "bg-card border-transparent text-muted-foreground hover:text-band",
                )}
              >
                <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4" />
                Month
              </button>
            </div>

            {band && canManageShows && (
              <button
                onClick={openCreateChooser}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-band text-foreground font-medium text-xs border border-band hover:bg-transparent hover:text-band transition-all touch-target rounded-lg"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Create Gig
              </button>
            )}
          </div>
        </div>
        {band && !canManageShows && (
          <p className="text-xs text-muted-foreground">
            Member access: owners/admins create gigs.
          </p>
        )}

        {/* Month Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={prevMonth}
            className="shrink-0 flex items-center justify-center p-2 sm:p-2.5 hover:bg-muted border border-border hover:border-band/30 transition-colors touch-target rounded-lg"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </button>
          <span className="min-w-0 flex-1 text-center truncate text-sm sm:text-lg font-semibold text-foreground">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="shrink-0 flex items-center justify-center p-2 sm:p-2.5 hover:bg-muted border border-border hover:border-band/30 transition-colors touch-target rounded-lg"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="mt-3 sm:mt-4 border border-border bg-muted/70 p-3 sm:p-4 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground">
            Calendar Color Key
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 border border-band/40 bg-band/10 px-3 py-2 rounded">
              <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-band">
                <span className="h-2.5 w-2.5 rounded-full bg-band" />
                Confirmed
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Scheduled Gig
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border border-band/40 bg-band/10 px-3 py-2 rounded">
              <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-band">
                <span className="h-2.5 w-2.5 rounded-full bg-band" />
                Tentative
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Hold / Draft Gig
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Events List */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-muted border border-border rounded-lg animate-shimmer"
              />
            ))}
          </div>
        ) : viewMode === "month" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
              {WEEKDAY_LABELS.map((weekday) => (
                <div
                  key={weekday}
                  className="text-xs font-medium text-muted-foreground text-center py-1.5 sm:py-2"
                >
                  <span className="sm:hidden">{weekday[0]}</span>
                  <span className="hidden sm:inline">{weekday}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
              {monthCells.map((cell, index) => {
                if (
                  !cell.isCurrentMonth ||
                  !cell.dateKey ||
                  cell.dayNumber === null
                ) {
                  return (
                    <div
                      key={`placeholder-${index}`}
                      className="h-24 sm:h-28 bg-muted/40 border border-border/50 rounded"
                    />
                  );
                }

                const dayEvents = eventsByDateKey[cell.dateKey] ?? [];
                const sortedDayEvents = [...dayEvents].sort(
                  (a, b) => (a.dateTime as number) - (b.dateTime as number),
                );
                const tentativeCount = dayEvents.filter(
                  (event) => event.status === "hold",
                ).length;
                const confirmedCount = dayEvents.filter(
                  (event) => event.status === "confirmed",
                ).length;
                const previewEvents = sortedDayEvents.slice(0, 1);
                const hiddenEventCount =
                  sortedDayEvents.length - previewEvents.length;
                const hasDayEvents = tentativeCount + confirmedCount > 0;
                const hasMixedStatus = tentativeCount > 0 && confirmedCount > 0;
                const isSelected = selectedDateKey === cell.dateKey;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => setSelectedDateKey(cell.dateKey)}
                    className={cn(
                      "h-20 sm:h-24 p-1 sm:p-2 border text-left transition-all overflow-hidden rounded",
                      isSelected
                        ? "border-foreground bg-card"
                        : "border-border bg-muted hover:border-muted-foreground/50",
                      hasDayEvents &&
                        !hasMixedStatus &&
                        confirmedCount > 0 &&
                        "border-band/50 bg-band/5",
                      hasDayEvents &&
                        !hasMixedStatus &&
                        tentativeCount > 0 &&
                        "border-band/60 bg-band/10",
                      hasMixedStatus && "border-muted-foreground/50 bg-muted/80",
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-medium leading-none",
                          hasDayEvents ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {cell.dayNumber}
                      </span>
                      {hasDayEvents && (
                        <span className="text-xs font-medium text-muted-foreground">
                          {tentativeCount + confirmedCount}
                        </span>
                      )}
                    </div>

                    {hasDayEvents && (
                      <>
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          {confirmedCount > 0 && (
                            <span className="px-1 py-0.5 text-xs font-medium border border-band/40 bg-band/10 text-band rounded">
                              {confirmedCount} C
                            </span>
                          )}
                          {tentativeCount > 0 && (
                            <span className="px-1 py-0.5 text-xs font-medium border border-band/40 bg-band/10 text-band rounded">
                              {tentativeCount} T
                            </span>
                          )}
                        </div>
                        <ol className="mt-1 space-y-0.5 list-decimal list-inside overflow-hidden">
                          {previewEvents.map((event) => (
                            <li
                              key={event._id}
                              className="text-xs font-medium truncate leading-4 text-band"
                            >
                              {getEventDisplayTitle(event)}
                            </li>
                          ))}
                        </ol>
                        <div className="mt-0.5 overflow-hidden">
                          {hiddenEventCount > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                              +{hiddenEventCount} more
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="bg-muted border border-border p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-band mb-3">
                {selectedDateKey
                  ? formatDateHeadingFromKey(selectedDateKey)
                  : `Select A Date In ${monthName}`}
              </h3>

              {!hasMonthEvents ? (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  No scheduled gigs in {monthName}.
                </p>
              ) : selectedDateKey === null ? (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Select a date to view gigs.
                </p>
              ) : selectedDateEvents.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  No gigs for this date.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <EventItem
                      key={event._id}
                      event={event}
                      onOpenTentative={openTentativeEditor}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : hasListEvents ? (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => {
              return (
                <div key={date}>
                  <h3 className="text-xs font-medium text-band mb-3">
                    {formatDateHeadingFromKey(date)}
                  </h3>
                  <div className="space-y-3">
                    {dateEvents.map((event) => (
                      <EventItem
                        key={event._id}
                        event={event}
                        onOpenTentative={openTentativeEditor}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {unscheduledTentatives.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-band mb-3">
                  Unscheduled Tentative
                </h3>
                <div className="space-y-3">
                  {unscheduledTentatives.map((event) => (
                    <EventItem
                      key={event._id}
                      event={event}
                      onOpenTentative={openTentativeEditor}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            onCreateClick={openCreateChooser}
            band={band}
            canManageShows={canManageShows}
          />
        )}
      </div>

      <CreateGigTypeModal
        isOpen={isCreateTypeModalOpen}
        onClose={() => setIsCreateTypeModalOpen(false)}
        onSelect={handleCreateTypeSelect}
      />

      {/* Create Gig Modal */}
      {band && canManageShows && (
        <CreateGigModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          bandId={band._id}
          bandName={band.name}
          creationKind={creationKind}
          onSuccess={() => {
            // Event will appear automatically via Convex real-time sync
          }}
        />
      )}

      <EditGigModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
      />
    </div>
  );
}

interface EventItemProps {
  event: any;
  onOpenTentative: (event: any) => void;
}

// Helper function to get genres from event (handles both new and legacy format)
function getEventGenres(event: any): string[] {
  if (event.genres && event.genres.length > 0) {
    return event.genres;
  }
  if (event.genre) {
    return [event.genre];
  }
  return [];
}

function getEventDisplayTitle(event: any): string {
  const title = event.title?.trim();
  if (title) {
    return title;
  }

  return event.status === "hold" ? "Untitled Tentative Gig" : "Untitled Gig";
}

function EventItem({ event, onOpenTentative }: EventItemProps) {
  const statusConfig = EVENT_STATUS_CONFIG[event.status as EventStatus];
  const genres = getEventGenres(event);
  const isTentative = event.status === "hold";
  const displayTitle = event.title?.trim() || "Untitled Tentative Gig";
  const displayTime =
    typeof event.dateTime === "number"
      ? formatEventTime(event.dateTime)
      : "Time TBD";
  const displayVenue = event.venue?.name || "Venue TBD";

  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Status Badge */}
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-medium border rounded",
                event.status === "confirmed" &&
                  "bg-band/10 border-band/30 text-band",
                event.status === "hold" &&
                  "bg-band/10 border-band/30 text-band",
                event.status === "available" &&
                  "bg-muted border-border text-muted-foreground",
              )}
            >
              {statusConfig.label}
            </span>
            {/* Genre Badges */}
            {genres.map((genre) => {
              const genreColor =
                GENRE_COLORS[genre as keyof typeof GENRE_COLORS] || "#71717A";
              return (
                <span
                  key={genre}
                  className="px-2 py-0.5 text-xs font-medium border rounded"
                  style={{
                    color: genreColor,
                    borderColor: `${genreColor}40`,
                    backgroundColor: `${genreColor}10`,
                  }}
                >
                  {genre}
                </span>
              );
            })}
          </div>
          <h3 className="font-medium text-foreground text-sm group-hover:text-band transition-colors">
            {displayTitle}
          </h3>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-band" />
              {displayTime}
            </span>
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-band flex-shrink-0" />
              {displayVenue}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <div className="text-xl font-semibold text-band">{event.rsvpCount}</div>
          <div className="text-xs text-muted-foreground">RSVPs</div>
        </div>
      </div>
      {/* Capacity indicator if available */}
      {event.capacity && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex-1 h-1.5 bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-band rounded-full"
              style={{
                width: `${Math.min((event.rsvpCount / event.capacity) * 100, 100)}%`,
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {event.rsvpCount}/{event.capacity}
          </span>
        </div>
      )}
    </>
  );

  if (isTentative) {
    return (
      <button
        type="button"
        onClick={() => onOpenTentative(event)}
        className="w-full text-left block bg-muted border border-border p-4 hover:border-band/50 transition-all group rounded-lg"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={`/gig/${event._id}`}
      className="block bg-muted border border-border p-4 hover:border-band/30 transition-all group rounded-lg"
    >
      {content}
    </Link>
  );
}

function EmptyState({
  onCreateClick,
  band,
  canManageShows,
}: {
  onCreateClick: () => void;
  band: any;
  canManageShows: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg">
      <div className="w-16 h-16 bg-muted border border-border flex items-center justify-center mb-4 rounded-lg">
        <Calendar className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">No upcoming shows</h3>
      <p className="text-muted-foreground max-w-[250px] text-sm mb-6">
        {band
          ? "Create your first gig to get started building your calendar"
          : "Create your band profile to start managing shows"}
      </p>
      {band && canManageShows ? (
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-6 py-3 bg-band text-foreground font-medium text-sm border border-band hover:bg-transparent hover:text-band transition-all rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Create First Gig
        </button>
      ) : band ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-5 h-5" />
          <span className="text-sm">Only owners/admins can create gigs</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Music className="w-5 h-5" />
          <span className="text-sm">Create your band profile first</span>
        </div>
      )}
    </div>
  );
}
