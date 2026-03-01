"use client";

import { useState } from "react";
import Link from "next/link";
import { Ticket, Music, History } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { EventCard } from "@/components/events/EventCard";
import { cn } from "@/lib/utils";

type EventTab = "rsvps" | "liked" | "past";

export function FanCalendarView() {
  const [activeTab, setActiveTab] = useState<EventTab>("rsvps");

  const rsvps = useQuery(api.events.getUserRsvps);
  const likedEvents = useQuery(api.events.getUserLikes);
  const pastRsvps = useQuery(api.events.getUserPastRsvps);

  const isLoading =
    rsvps === undefined || likedEvents === undefined || pastRsvps === undefined;

  const events =
    activeTab === "rsvps"
      ? rsvps
      : activeTab === "liked"
        ? likedEvents
        : pastRsvps;

  // Group events by month
  const groupedEvents: Record<string, typeof events> = {};
  events?.forEach((event: any) => {
    const date = new Date(event.dateTime);
    const monthKey = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (!groupedEvents[monthKey]) {
      groupedEvents[monthKey] = [];
    }
    groupedEvents[monthKey].push(event);
  });

  return (
    <div className="min-h-screen bg-background pb-6 overflow-x-hidden">
      {/* Header */}
      <header className="bg-card border-b border-fan/20 p-4">
        <h1 className="text-xl font-semibold text-foreground">My Events</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("rsvps")}
          className={cn(
            "flex-1 py-3 sm:py-4 px-1 text-xs sm:text-sm font-medium transition-colors relative",
            activeTab === "rsvps"
              ? "text-fan"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div className="flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap">
            <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            RSVPs
          </div>
          {activeTab === "rsvps" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fan" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("liked")}
          className={cn(
            "flex-1 py-3 sm:py-4 px-1 text-xs sm:text-sm font-medium transition-colors relative",
            activeTab === "liked"
              ? "text-fan"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div className="flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap">
            <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Liked
          </div>
          {activeTab === "liked" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fan" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={cn(
            "flex-1 py-3 sm:py-4 px-1 text-xs sm:text-sm font-medium transition-colors relative",
            activeTab === "past"
              ? "text-fan"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div className="flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap">
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Past
          </div>
          {activeTab === "past" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fan" />
          )}
        </button>
      </div>

      {/* Events List */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-muted border border-border rounded-lg animate-shimmer"
              />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([month, monthEvents]) => (
              <div key={month}>
                <h2 className="text-xs font-medium text-fan mb-3 sticky top-0 bg-background py-2 z-10">
                  {month}
                </h2>
                <div className="space-y-3">
                  {monthEvents?.map((event) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      showAttendanceStatus={activeTab === "past"}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState activeTab={activeTab} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ activeTab }: { activeTab: EventTab }) {
  const getIcon = () => {
    switch (activeTab) {
      case "rsvps":
        return <Ticket className="w-8 h-8 text-muted-foreground" />;
      case "liked":
        return <Music className="w-8 h-8 text-muted-foreground" />;
      case "past":
        return <History className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case "rsvps":
        return "No RSVPs";
      case "liked":
        return "No liked events";
      case "past":
        return "No past events";
    }
  };

  const getDescription = () => {
    switch (activeTab) {
      case "rsvps":
        return "Browse events and RSVP to see them here";
      case "liked":
        return "Like events to save them for later";
      case "past":
        return "Events you've attended will appear here";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg">
      <div className="w-16 h-16 bg-muted border border-border rounded-lg flex items-center justify-center mb-4">
        {getIcon()}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">{getTitle()}</h3>
      <p className="text-muted-foreground max-w-[250px] text-sm">
        {getDescription()}
      </p>
      {activeTab !== "past" && (
        <Link
          href="/home"
          className="mt-6 inline-block px-6 py-3 bg-fan text-foreground font-medium text-sm border border-fan rounded-lg hover:bg-transparent hover:text-fan transition-colors"
        >
          Discover Events
        </Link>
      )}
    </div>
  );
}
