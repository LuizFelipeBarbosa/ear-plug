"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
  CheckCircle2,
  HelpCircle,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useCurrentBand } from "@/hooks/useBand";
import { useProfileContext } from "@/hooks/useProfileContext";
import { CreateGigModal } from "./CreateGigModal";
import { CreateGigTypeModal } from "./CreateGigTypeModal";
import { EditGigModal } from "./EditGigModal";
import { TabPanel } from "@/components/ui/TabPanel";
import {
  formatEventTime,
  EVENT_STATUS_CONFIG,
  GENRE_COLORS,
} from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import {
  buildHrefWithReturnTo,
  useCurrentReturnTo,
} from "@/hooks/useReturnToHref";
import { panelFade, presenceSyncNoInitial } from "@/lib/motion/presets";
import type { EventStatus } from "@ear-plug/shared/types";

type CreationKind = "tentative" | "confirmed";
type ViewMode = "list" | "month";
type FilterStatus = "all" | "confirmed" | "tentative";

interface CalendarCell {
  dateKey: string | null;
  dayNumber: number | null;
  isCurrentMonth: boolean;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// Color themes for different statuses
const STATUS_COLORS = {
  confirmed: {
    bg: "bg-emerald-500",
    bgLight: "bg-emerald-500/10",
    bgHover: "hover:bg-emerald-500/20",
    border: "border-emerald-500/40",
    borderStrong: "border-emerald-500",
    text: "text-emerald-500",
    textDark: "text-emerald-600",
    ring: "ring-emerald-500/30",
  },
  tentative: {
    bg: "bg-amber-500",
    bgLight: "bg-amber-500/10",
    bgHover: "hover:bg-amber-500/20",
    border: "border-amber-500/40",
    borderStrong: "border-amber-500",
    text: "text-amber-500",
    textDark: "text-amber-600",
    ring: "ring-amber-500/30",
  },
};

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
    if (typeof window === "undefined") return "list";
    const stored = window.localStorage.getItem("band-calendar-view-mode");
    return stored === "month" ? "month" : "list";
  });
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creationKind, setCreationKind] = useState<CreationKind>("confirmed");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const openCreateModalTimerRef = useRef<number | null>(null);
  const initializedMonthForBandRef = useRef<string | null>(null);

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
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setSelectedDateKey(null);
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  };

  const monthName = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Filter and organize events
  const { scheduledEvents, unscheduledTentatives, filteredEvents } = useMemo(() => {
    const allEvents = events ?? [];
    const scheduled = allEvents.filter((event) => typeof event.dateTime === "number");
    const unscheduled = allEvents.filter(
      (event) => event.status === "hold" && event.dateTime === undefined,
    );

    let filtered = scheduled;
    if (filterStatus === "confirmed") {
      filtered = scheduled.filter((e) => e.status === "confirmed");
    } else if (filterStatus === "tentative") {
      filtered = scheduled.filter((e) => e.status === "hold");
    }

    return {
      scheduledEvents: scheduled,
      unscheduledTentatives: unscheduled,
      filteredEvents: filtered,
    };
  }, [events, filterStatus]);

  const scheduledEventsInViewMonth = useMemo(
    () =>
      filteredEvents.filter((event) =>
        isInViewMonth(event.dateTime as number, viewMonth),
      ),
    [filteredEvents, viewMonth],
  );

  const groupedEvents = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    scheduledEventsInViewMonth.forEach((event) => {
      const dateKey = toLocalDateKey(event.dateTime as number);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [scheduledEventsInViewMonth]);

  const eventsByDateKey = useMemo(() => {
    const byDate: Record<string, any[]> = {};
    scheduledEventsInViewMonth.forEach((event) => {
      const dateKey = toLocalDateKey(event.dateTime as number);
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(event);
    });
    return byDate;
  }, [scheduledEventsInViewMonth]);

  const monthCells = useMemo(() => buildMonthCells(viewMonth), [viewMonth]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDateKey) return [];
    const dayEvents = eventsByDateKey[selectedDateKey] ?? [];
    return [...dayEvents].sort(
      (a, b) => (a.dateTime as number) - (b.dateTime as number),
    );
  }, [eventsByDateKey, selectedDateKey]);

  const eventCounts = useMemo(() => {
    const confirmed = scheduledEvents.filter((e) => e.status === "confirmed").length;
    const tentative =
      scheduledEvents.filter((e) => e.status === "hold").length + unscheduledTentatives.length;
    return { confirmed, tentative, total: confirmed + tentative };
  }, [scheduledEvents, unscheduledTentatives]);

  const earliestScheduledEvent = useMemo(() => {
    if (scheduledEvents.length === 0) {
      return null;
    }
    return [...scheduledEvents].sort(
      (a, b) => (a.dateTime as number) - (b.dateTime as number),
    )[0] ?? null;
  }, [scheduledEvents]);

  const hasListEvents =
    Object.keys(groupedEvents).length > 0 || unscheduledTentatives.length > 0;
  const hasMonthEvents = scheduledEventsInViewMonth.length > 0;

  const openCreateChooser = () => setIsCreateTypeModalOpen(true);

  const handleCreateTypeSelect = (kind: CreationKind) => {
    setCreationKind(kind);
    setIsCreateTypeModalOpen(false);
    if (openCreateModalTimerRef.current !== null) {
      window.clearTimeout(openCreateModalTimerRef.current);
    }
    openCreateModalTimerRef.current = window.setTimeout(() => {
      setIsCreateModalOpen(true);
    }, 120);
  };

  const openTentativeEditor = (event: any) => {
    setSelectedEvent(event);
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    window.localStorage.setItem("band-calendar-view-mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    return () => {
      if (openCreateModalTimerRef.current !== null) {
        window.clearTimeout(openCreateModalTimerRef.current);
        openCreateModalTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!band?._id) {
      initializedMonthForBandRef.current = null;
      return;
    }
    if (events === undefined) {
      return;
    }
    if (initializedMonthForBandRef.current === band._id) {
      return;
    }
    initializedMonthForBandRef.current = band._id;
    if (!earliestScheduledEvent?.dateTime) {
      setSelectedDateKey(null);
      return;
    }

    const earliestDate = new Date(earliestScheduledEvent.dateTime as number);
    setViewMonth(new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1));
    setSelectedDateKey(toLocalDateKey(earliestDate.getTime()));
  }, [band?._id, earliestScheduledEvent, events]);

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="min-h-screen pb-8 bg-background">
      {/* Header */}
      <header className="relative bg-gradient-to-br from-band/10 via-background to-background border-b border-border overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-band/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="relative px-4 pt-5 pb-4">
          {/* Top row: Title + Actions */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="min-w-0"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-band/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-band" />
                </div>
                <span className="text-xs font-medium text-muted-foreground  ">
                  Band Workspace
                </span>
              </div>
              <h1 className="text-xl font-bold text-foreground">Shows & Events</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your gigs, holds, and availability
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex w-full items-center gap-2 sm:w-auto"
            >
              {band && canManageShows && (
                <button
                  onClick={openCreateChooser}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-band px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors transition-shadow hover:bg-band/90 hover:shadow-md active:scale-95 sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Gig</span>
                </button>
              )}
            </motion.div>
          </div>

          {/* View Mode Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-2 mb-4"
          >
            <div className="flex-1 flex items-center justify-center bg-muted/70 border border-border p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors transition-shadow",
                  viewMode === "list"
                    ? "bg-card text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors transition-shadow",
                  viewMode === "month"
                    ? "bg-card text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Calendar
              </button>
            </div>
          </motion.div>

          {/* Month Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 sm:gap-3"
          >
            <button
              onClick={prevMonth}
              className="shrink-0 rounded-lg border border-border p-2 transition-colors hover:bg-muted hover:border-band/30 active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="flex-1 text-center text-sm font-semibold text-foreground">
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              className="shrink-0 rounded-lg border border-border p-2 transition-colors hover:bg-muted hover:border-band/30 active:scale-95"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>

          {/* Stats + Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-4 -mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex w-max items-center gap-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors transition-shadow",
                  filterStatus === "all"
                    ? "border-border bg-card text-foreground shadow-sm"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-muted",
                )}
              >
                <span className="h-2 w-2 rounded-full bg-foreground" />
                All ({eventCounts.total})
              </button>
              <button
                onClick={() => setFilterStatus("confirmed")}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors transition-shadow",
                  filterStatus === "confirmed"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 shadow-sm"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-emerald-500/5",
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirmed ({eventCounts.confirmed})
              </button>
              <button
                onClick={() => setFilterStatus("tentative")}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors transition-shadow",
                  filterStatus === "tentative"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600 shadow-sm"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-amber-500/5",
                )}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Tentative ({eventCounts.tentative})
              </button>
            </div>
          </motion.div>

          {/* Legend */}
          {band && !canManageShows && (
            <p className="mt-3 text-xs text-muted-foreground">
              Member access: owners/admins can create and edit gigs.
            </p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <motion.main
        variants={panelFade}
        initial="hidden"
        animate="visible"
        className="px-4 pt-4"
      >
        <TabPanel isActive={viewMode === "month"}>
          <motion.div variants={panelFade} initial="hidden" animate="visible">
            <MonthView
              monthCells={monthCells}
              eventsByDateKey={eventsByDateKey}
              selectedDateKey={selectedDateKey}
              onSelectDate={setSelectedDateKey}
              selectedDateEvents={selectedDateEvents}
              hasMonthEvents={hasMonthEvents}
              monthName={monthName}
              onOpenTentative={openTentativeEditor}
            />
          </motion.div>
        </TabPanel>
        <TabPanel isActive={viewMode === "list" && hasListEvents}>
          <motion.div variants={panelFade} initial="hidden" animate="visible">
            <ListView
              groupedEvents={groupedEvents}
              unscheduledTentatives={unscheduledTentatives}
              onOpenTentative={openTentativeEditor}
            />
          </motion.div>
        </TabPanel>
        <TabPanel isActive={viewMode === "list" && !hasListEvents}>
          <motion.div variants={panelFade} initial="hidden" animate="visible">
            <EmptyState
              onCreateClick={openCreateChooser}
              band={band}
              canManageShows={canManageShows}
            />
          </motion.div>
        </TabPanel>
      </motion.main>

      {/* Modals */}
      <CreateGigTypeModal
        isOpen={isCreateTypeModalOpen}
        onClose={() => setIsCreateTypeModalOpen(false)}
        onSelect={handleCreateTypeSelect}
      />

      {band && canManageShows && (
        <CreateGigModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          bandId={band._id}
          bandName={band.name}
          creationKind={creationKind}
          onSuccess={() => {}}
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

// Sub-components

function MonthView({
  monthCells,
  eventsByDateKey,
  selectedDateKey,
  onSelectDate,
  selectedDateEvents,
  hasMonthEvents,
  monthName,
  onOpenTentative,
}: {
  monthCells: CalendarCell[];
  eventsByDateKey: Record<string, any[]>;
  selectedDateKey: string | null;
  onSelectDate: (key: string | null) => void;
  selectedDateEvents: any[];
  hasMonthEvents: boolean;
  monthName: string;
  onOpenTentative: (event: any) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((weekday) => (
          <div
            key={weekday}
            className="text-xs font-medium text-muted-foreground text-center py-2"
          >
            <span className="sm:hidden">{weekday[0]}</span>
            <span className="hidden sm:inline">{weekday}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthCells.map((cell, index) => {
          if (!cell.isCurrentMonth || !cell.dateKey || cell.dayNumber === null) {
            return (
              <div
                key={`placeholder-${index}`}
                className="aspect-square bg-muted/30 border border-border/30 rounded-lg"
              />
            );
          }

          const dayEvents = eventsByDateKey[cell.dateKey] ?? [];
          const sortedDayEvents = [...dayEvents].sort(
            (a, b) => (a.dateTime as number) - (b.dateTime as number),
          );
          const tentativeCount = dayEvents.filter((e) => e.status === "hold").length;
          const confirmedCount = dayEvents.filter((e) => e.status === "confirmed").length;
          const hasEvents = tentativeCount + confirmedCount > 0;
          const isSelected = selectedDateKey === cell.dateKey;

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => onSelectDate(isSelected ? null : cell.dateKey)}

              className={cn(
                "aspect-square p-1.5 sm:p-2 border text-left transition-colors rounded-lg relative overflow-hidden",
                isSelected
                  ? "border-band ring-2 ring-band/30 bg-card"
                  : "border-border bg-card hover:border-muted-foreground/50",
                hasEvents && !isSelected && "border-band/30",
              )}
            >
              {/* Day Number */}
              <span
                className={cn(
                  "text-xs sm:text-sm font-medium",
                  hasEvents ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {cell.dayNumber}
              </span>

              {/* Event Dots */}
              {hasEvents && (
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-wrap gap-1">
                  {confirmedCount > 0 && (
                    <div className="flex items-center gap-0.5">
                      {[...Array(Math.min(confirmedCount, 3))].map((_, i) => (
                        <span
                          key={`c-${i}`}
                          className="w-2 h-2 rounded-full bg-emerald-500"
                        />
                      ))}
                      {confirmedCount > 3 && (
                        <span className="text-[8px] text-emerald-500 font-medium">
                          +{confirmedCount - 3}
                        </span>
                      )}
                    </div>
                  )}
                  {tentativeCount > 0 && (
                    <div className="flex items-center gap-0.5">
                      {[...Array(Math.min(tentativeCount, 2))].map((_, i) => (
                        <span
                          key={`t-${i}`}
                          className="w-2 h-2 rounded-full bg-amber-500"
                        />
                      ))}
                      {tentativeCount > 2 && (
                        <span className="text-[8px] text-amber-500 font-medium">
                          +{tentativeCount - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Preview of first event */}
              {sortedDayEvents.length > 0 && (
                <div className="hidden sm:block mt-4 pr-1">
                  <p className="text-[10px] font-medium text-muted-foreground truncate">
                    {getEventDisplayTitle(sortedDayEvents[0])}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Date Events Panel */}
      <AnimatePresence {...presenceSyncNoInitial}>
        {selectedDateKey && (
          <motion.div
            variants={panelFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-band" />
                <h3 className="text-sm font-semibold text-foreground">
                  {formatDateHeadingFromKey(selectedDateKey)}
                </h3>
              </div>
              <button
                onClick={() => onSelectDate(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              {!hasMonthEvents ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No scheduled gigs in {monthName}.
                </p>
              ) : selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No gigs scheduled for this date.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div key={event._id}>
                      <EventItem event={event} onOpenTentative={onOpenTentative} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ListView({
  groupedEvents,
  unscheduledTentatives,
  onOpenTentative,
}: {
  groupedEvents: Record<string, any[]>;
  unscheduledTentatives: any[];
  onOpenTentative: (event: any) => void;
}) {
  const sortedDates = Object.keys(groupedEvents).sort();

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-band/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-band" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {formatDateHeadingFromKey(date)}
              </h3>
              <p className="text-xs text-muted-foreground">
                {groupedEvents[date].length} event
                {groupedEvents[date].length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {groupedEvents[date].map((event) => (
              <div key={event._id}>
                <EventItem event={event} onOpenTentative={onOpenTentative} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Unscheduled Tentatives Section */}
      <AnimatePresence {...presenceSyncNoInitial}>
        {unscheduledTentatives.length > 0 && (
          <motion.div
            variants={panelFade}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Unscheduled Tentatives
                </h3>
                <p className="text-xs text-muted-foreground">
                  {unscheduledTentatives.length} pending
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {unscheduledTentatives.map((event) => (
                <div key={event._id}>
                  <EventItem event={event} onOpenTentative={onOpenTentative} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EventItem({
  event,
  onOpenTentative,
}: {
  event: any;
  onOpenTentative: (event: any) => void;
}) {
  const currentReturnTo = useCurrentReturnTo("/calendar");
  const statusConfig = EVENT_STATUS_CONFIG[event.status as EventStatus];
  const genres = getEventGenres(event);
  const isTentative = event.status === "hold";
  const isConfirmed = event.status === "confirmed";
  const colors = isConfirmed ? STATUS_COLORS.confirmed : STATUS_COLORS.tentative;

  const displayTitle = getEventDisplayTitle(event);
  const displayTime =
    typeof event.dateTime === "number" ? formatEventTime(event.dateTime) : "Time TBD";
  const displayVenue = event.venue?.name || "Venue TBD";

  const cardContent = (
    <>
      {/* Top Row: Status + Genres */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border",
            colors.bgLight,
            colors.border,
            colors.text,
          )}
        >
          {isConfirmed ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <HelpCircle className="w-3 h-3" />
          )}
          {statusConfig.label}
        </span>

        {genres.slice(0, 2).map((genre) => {
          const genreColor = GENRE_COLORS[genre as keyof typeof GENRE_COLORS] || "#71717A";
          return (
            <span
              key={genre}
              className="px-2 py-0.5 text-[10px] font-medium rounded-full border"
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
        {genres.length > 2 && (
          <span className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded-full">
            +{genres.length - 2}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-foreground text-sm mb-3 group-hover:text-band transition-colors line-clamp-2">
        {displayTitle}
      </h3>

      {/* Details Row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className={cn("w-3.5 h-3.5", colors.text)} />
          {displayTime}
        </span>
        <span className="flex items-center gap-1.5 truncate">
          <MapPin className={cn("w-3.5 h-3.5 flex-shrink-0", colors.text)} />
          <span className="truncate">{displayVenue}</span>
        </span>
      </div>

      {/* RSVP Count + Capacity */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/50 pt-3">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            {event.rsvpCount || 0}
          </span>
          <span className="text-xs text-muted-foreground">RSVPs</span>
        </div>

        {event.capacity && (
          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto sm:max-w-[140px] sm:flex-1">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min((event.rsvpCount / event.capacity) * 100, 100)}%`,
                }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className={cn("h-full rounded-full", colors.bg)}
              />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {Math.round((event.rsvpCount / event.capacity) * 100)}%
            </span>
          </div>
        )}
      </div>
    </>
  );

  if (isTentative) {
    return (
      <button

        onClick={() => onOpenTentative(event)}
        className={cn(
          "w-full text-left block bg-card border p-4 rounded-xl transition-colors transition-shadow group",
          "hover:shadow-md",
          colors.border,
          "hover:border-amber-500/60",
        )}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      href={buildHrefWithReturnTo(`/gig/${event._id}`, currentReturnTo)}
      className="block"
    >
      <div

        className={cn(
          "bg-card border p-4 rounded-xl transition-colors transition-shadow group cursor-pointer",
          "hover:shadow-md",
          "border-border",
          "hover:border-emerald-500/40",
        )}
      >
        {cardContent}
      </div>
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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-band/20 to-band/5 rounded-2xl flex items-center justify-center mb-5 border border-band/20">
        <Sparkles className="w-10 h-10 text-band" />
      </div>

      <h3 className="text-lg font-bold text-foreground mb-2">No upcoming shows</h3>
      <p className="text-sm text-muted-foreground max-w-[260px] mb-6">
        {band
          ? "Start building your calendar by creating your first gig"
          : "Create your band profile to start managing shows"}
      </p>

      {band && canManageShows ? (
        <button

          onClick={onCreateClick}
          className="flex items-center gap-2 px-6 py-3 bg-band text-white font-medium text-sm rounded-xl hover:bg-band/90 transition-colors transition-shadow shadow-lg shadow-band/20"
        >
          <Plus className="w-4 h-4" />
          Create First Gig
        </button>
      ) : band ? (
        <div className="flex items-center gap-2 text-muted-foreground bg-muted px-4 py-3 rounded-xl">
          <Users className="w-5 h-5" />
          <span className="text-sm">Only owners/admins can create gigs</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground bg-muted px-4 py-3 rounded-xl">
          <Music className="w-5 h-5" />
          <span className="text-sm">Create your band profile first</span>
        </div>
      )}
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="min-h-screen pb-8 bg-background">
      <div className="relative bg-muted border-b border-border overflow-hidden">
        <div className="px-4 pt-5 pb-4">
          <div className="animate-shimmer space-y-4">
            <div className="h-16 bg-muted-foreground/10 rounded-xl" />
            <div className="h-10 bg-muted-foreground/10 rounded-xl" />
            <div className="h-10 bg-muted-foreground/10 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="h-8 bg-muted-foreground/10 rounded animate-shimmer"
            />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-muted-foreground/5 border border-border/30 rounded-lg animate-shimmer"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper functions

function getEventGenres(event: any): string[] {
  if (event.genres && event.genres.length > 0) return event.genres;
  if (event.genre) return [event.genre];
  return [];
}

function getEventDisplayTitle(event: any): string {
  const title = event.title?.trim();
  if (title) return title;
  return event.status === "hold" ? "Untitled Tentative Gig" : "Untitled Gig";
}
