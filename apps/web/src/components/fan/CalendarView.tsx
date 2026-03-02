"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Ticket,
  Heart,
  History,
  Calendar,
  MapPin,
  ChevronRight,
  Sparkles,
  Music,
  Clock,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { EventCard } from "@/components/events/EventCard";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatEventDate, formatEventTime } from "@ear-plug/shared/constants";
import type { Id } from "../../../../../convex/_generated/dataModel";

type EventTab = "upcoming" | "saved" | "past";

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
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

const monthHeaderVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
    },
  },
};

// Event type matching EventCard expectations
interface CalendarEvent {
  _id: Id<"events">;
  _creationTime: number;
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
}

export function FanCalendarView() {
  const [activeTab, setActiveTab] = useState<EventTab>("upcoming");

  const rsvps = useQuery(api.events.getUserRsvps);
  const likedEvents = useQuery(api.events.getUserLikes);
  const pastRsvps = useQuery(api.events.getUserPastRsvps);

  const isLoading =
    rsvps === undefined || likedEvents === undefined || pastRsvps === undefined;

  // Get current tab data
  const currentEvents =
    activeTab === "upcoming" ? rsvps : activeTab === "saved" ? likedEvents : pastRsvps;

  // Calculate stats
  const stats = useMemo(() => {
    return {
      upcoming: rsvps?.length || 0,
      saved: likedEvents?.length || 0,
      past: pastRsvps?.length || 0,
    };
  }, [rsvps, likedEvents, pastRsvps]);

  // Group events by month
  const groupedEvents = useMemo(() => {
    if (!currentEvents) return {};

    const grouped: Record<string, CalendarEvent[]> = {};
    currentEvents.forEach((event: CalendarEvent) => {
      if (!event.dateTime) return;
      const date = new Date(event.dateTime);
      const monthKey = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(event);
    });

    // Sort months chronologically
    return Object.fromEntries(
      Object.entries(grouped).sort((a, b) => {
        const dateA = new Date(a[1][0]?.dateTime || 0);
        const dateB = new Date(b[1][0]?.dateTime || 0);
        return activeTab === "past" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
      })
    );
  }, [currentEvents, activeTab]);

  // Get next upcoming event for the hero card
  const nextEvent = useMemo(() => {
    if (activeTab !== "upcoming" || !rsvps?.length) return null;
    return rsvps[0];
  }, [rsvps, activeTab]);

  const tabs = [
    { id: "upcoming" as const, label: "Upcoming", icon: Ticket, count: stats.upcoming },
    { id: "saved" as const, label: "Saved", icon: Heart, count: stats.saved },
    { id: "past" as const, label: "History", icon: History, count: stats.past },
  ];

  return (
    <div className="min-h-screen pb-24 bg-background overflow-x-hidden">
      {/* Header Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-fan/5 via-fan/2 to-transparent h-48" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-fan/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      </div>

      {/* Header */}
      <header className="relative px-4 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-foreground">My Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your events and discover new shows
          </p>
        </motion.div>

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="grid grid-cols-3 gap-3 mt-5"
        >
          {tabs.map((tab, index) => (
            <motion.button
              key={tab.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + index * 0.05 }}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center p-3 rounded-xl border transition-all",
                activeTab === tab.id
                  ? "bg-fan/10 border-fan/30 text-fan"
                  : "bg-card border-border text-muted-foreground hover:border-fan/20"
              )}
            >
              <tab.icon className="w-5 h-5 mb-1" />
              <span className="text-lg font-bold">{tab.count}</span>
              <span className="text-[10px] uppercase tracking-wide font-medium">
                {tab.label}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Next Event Hero Card */}
        {activeTab === "upcoming" && nextEvent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 300 }}
            className="mt-5"
          >
            <Link href={`/gig/${nextEvent._id}`}>
              <div className="relative bg-gradient-to-br from-fan/20 via-fan/10 to-transparent border border-fan/20 rounded-2xl p-4 overflow-hidden group">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-fan/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative flex items-start gap-4">
                  {/* Date Badge */}
                  <div className="flex-shrink-0 w-16 h-16 bg-card border border-fan/20 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-xs text-fan font-semibold uppercase">
                      {nextEvent.dateTime &&
                        new Date(nextEvent.dateTime).toLocaleDateString("en-US", {
                          month: "short",
                        })}
                    </span>
                    <span className="text-2xl font-bold text-foreground">
                      {nextEvent.dateTime &&
                        new Date(nextEvent.dateTime).getDate()}
                    </span>
                  </div>

                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-fan" />
                      <span className="text-xs font-medium text-fan">
                        Next Event
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground truncate group-hover:text-fan transition-colors">
                      {nextEvent.title || "Untitled Event"}
                    </h3>
                    {nextEvent.band && (
                      <p className="text-sm text-muted-foreground truncate">
                        {nextEvent.band.name}
                      </p>
                    )}
                    {nextEvent.venue && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{nextEvent.venue.name}</span>
                      </div>
                    )}
                    {nextEvent.dateTime && (
                      <div className="flex items-center gap-1 text-xs text-fan mt-2">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatEventDate(nextEvent.dateTime)} ·{" "}
                          {formatEventTime(nextEvent.dateTime)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
              </div>
            </Link>
          </motion.div>
        )}
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors touch-target-sm",
                activeTab === tab.id
                  ? "text-fan"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
              {tab.count > 0 && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                    activeTab === tab.id
                      ? "bg-fan/20 text-fan"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="calendarActiveTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-fan rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <main className="px-4 pt-4">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <LoadingState key="loading" />
          ) : currentEvents && currentEvents.length > 0 ? (
            <motion.div
              key={activeTab}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              {Object.entries(groupedEvents).map(([month, monthEvents], monthIndex) => (
                <motion.div
                  key={month}
                  variants={monthHeaderVariants}
                  custom={monthIndex}
                >
                  {/* Month Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-fan/10 border border-fan/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-fan" />
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">
                      {month}
                    </h2>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Events for this month */}
                  <div className="space-y-3">
                    {monthEvents.map((event, eventIndex) => (
                      <motion.div
                        key={event._id}
                        variants={itemVariants}
                        custom={eventIndex}
                      >
                        <EventCard
                          event={event}
                          showAttendanceStatus={activeTab === "past"}
                          variant="default"
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <EmptyState key="empty" activeTab={activeTab} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Loading State
function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Month header skeleton */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-muted rounded-lg animate-shimmer" />
          <div className="h-4 w-24 bg-muted rounded animate-shimmer" />
          <div className="flex-1 h-px bg-border" />
          <div className="h-3 w-12 bg-muted rounded animate-shimmer" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-muted border border-border rounded-xl animate-shimmer"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Empty State
function EmptyState({ activeTab }: { activeTab: EventTab }) {
  const config = {
    upcoming: {
      icon: Ticket,
      title: "No upcoming events",
      description: "RSVP to events to see them in your calendar",
      action: { href: "/home", label: "Discover Events" },
    },
    saved: {
      icon: Heart,
      title: "No saved events",
      description: "Like events to save them for later",
      action: { href: "/home", label: "Browse Events" },
    },
    past: {
      icon: History,
      title: "No past events",
      description: "Events you've attended will appear here",
      action: null,
    },
  };

  const { icon: Icon, title, description, action } = config[activeTab];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="w-20 h-20 bg-muted/50 border border-dashed border-border rounded-2xl flex items-center justify-center mb-5"
      >
        <Icon className="w-8 h-8 text-muted-foreground" />
      </motion.div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[260px] mb-6">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-fan text-white font-medium text-sm rounded-xl hover:bg-fan/90 transition-colors shadow-lg shadow-fan/20"
        >
          <Music className="w-4 h-4" />
          {action.label}
        </Link>
      )}
    </motion.div>
  );
}
