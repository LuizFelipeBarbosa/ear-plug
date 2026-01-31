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

  const isLoading = rsvps === undefined || likedEvents === undefined || pastRsvps === undefined;

  const events = activeTab === "rsvps" ? rsvps : activeTab === "liked" ? likedEvents : pastRsvps;

  // Group events by month
  const groupedEvents: Record<string, typeof events> = {};
  events?.forEach((event: any) => {
    const date = new Date(event.dateTime);
    const monthKey = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groupedEvents[monthKey]) {
      groupedEvents[monthKey] = [];
    }
    groupedEvents[monthKey].push(event);
  });

  return (
    <div className="min-h-screen bg-night pb-6">
      {/* Header */}
      <header className="bg-night-secondary border-b-2 border-lime/20 p-4">
        <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
          My Events
        </h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b-2 border-zinc-800">
        <button
          onClick={() => setActiveTab("rsvps")}
          className={cn(
            "flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors relative",
            activeTab === "rsvps"
              ? "text-lime"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Ticket className="w-4 h-4" />
            RSVPs
          </div>
          {activeTab === "rsvps" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("liked")}
          className={cn(
            "flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors relative",
            activeTab === "liked"
              ? "text-lime"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Music className="w-4 h-4" />
            Liked
          </div>
          {activeTab === "liked" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={cn(
            "flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors relative",
            activeTab === "past"
              ? "text-lime"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <History className="w-4 h-4" />
            Past
          </div>
          {activeTab === "past" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime" />
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
                className="h-32 bg-night-tertiary border-2 border-zinc-800 animate-shimmer"
              />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([month, monthEvents]) => (
              <div key={month}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-lime mb-3 sticky top-0 bg-night py-2 z-10">
                  {month}
                </h2>
                <div className="space-y-3">
                  {monthEvents?.map((event) => (
                    <EventCard key={event._id} event={event} />
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
        return <Ticket className="w-8 h-8 text-zinc-600" />;
      case "liked":
        return <Music className="w-8 h-8 text-zinc-600" />;
      case "past":
        return <History className="w-8 h-8 text-zinc-600" />;
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
    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-zinc-800">
      <div className="w-16 h-16 bg-night-tertiary border-2 border-zinc-800 flex items-center justify-center mb-4">
        {getIcon()}
      </div>
      <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-2">
        {getTitle()}
      </h3>
      <p className="text-zinc-500 max-w-[250px] text-sm">
        {getDescription()}
      </p>
      {activeTab !== "past" && (
        <Link
          href="/home"
          className="mt-6 inline-block px-6 py-3 bg-lime text-night font-bold uppercase tracking-wider text-xs border-2 border-lime hover:bg-transparent hover:text-lime transition-all"
        >
          Discover Events
        </Link>
      )}
    </div>
  );
}
