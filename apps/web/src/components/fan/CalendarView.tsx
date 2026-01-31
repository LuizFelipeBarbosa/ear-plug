"use client";

import { useState } from "react";
import { Calendar, Ticket, Heart } from "lucide-react";
import { useUserEvents } from "@/hooks/useEvents";
import { EventCard } from "@/components/events/EventCard";
import { cn } from "@/lib/utils";

type Tab = "rsvps" | "liked";

export function FanCalendarView() {
  const [activeTab, setActiveTab] = useState<Tab>("rsvps");
  const { rsvps, likes, isLoading } = useUserEvents();

  const displayEvents = activeTab === "rsvps" ? rsvps : likes;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          My Events
        </h1>

        {/* Tabs */}
        <div className="flex gap-2">
          <TabButton
            active={activeTab === "rsvps"}
            onClick={() => setActiveTab("rsvps")}
            icon={<Ticket className="w-4 h-4" />}
            label="RSVPs"
            count={rsvps?.length || 0}
          />
          <TabButton
            active={activeTab === "liked"}
            onClick={() => setActiveTab("liked")}
            icon={<Heart className="w-4 h-4" />}
            label="Liked"
            count={likes?.length || 0}
          />
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-gray-100 dark:bg-surface-dark-secondary rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : displayEvents && displayEvents.length > 0 ? (
          <div className="space-y-4">
            {displayEvents.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyState tab={activeTab} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all",
        active
          ? "bg-primary-500 text-white"
          : "bg-gray-100 dark:bg-surface-dark-secondary text-gray-600 dark:text-gray-400"
      )}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          "px-2 py-0.5 rounded-full text-xs font-bold",
          active
            ? "bg-white/20 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-surface-dark-secondary flex items-center justify-center mb-4">
        {tab === "rsvps" ? (
          <Ticket className="w-8 h-8 text-gray-400" />
        ) : (
          <Heart className="w-8 h-8 text-gray-400" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {tab === "rsvps" ? "No RSVPs yet" : "No liked events"}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-[250px]">
        {tab === "rsvps"
          ? "RSVP to events to see them here"
          : "Like events to save them for later"}
      </p>
    </div>
  );
}
