import { EventListItem } from "@/components/events/EventListItem";
import {
  AppScreen,
  EmptyState,
  HeroHeader,
  LoadingPanel,
  SectionCard,
  SectionTitle,
  SegmentedTabs,
  StatCard,
} from "@/components/ui/AppPrimitives";
import { useUserEvents } from "@/hooks/useEvents";
import { formatEventDate, formatEventTime } from "@ear-plug/shared/constants";
import { useRouter } from "expo-router";
import { ChevronRight, Sparkles } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type CalendarTab = "upcoming" | "saved" | "past";

export function FanCalendarScreen() {
  const router = useRouter();
  const { rsvps, likes, pastRsvps, isLoading } = useUserEvents();
  const [tab, setTab] = useState<CalendarTab>("upcoming");

  const currentEvents = useMemo(() => {
    if (tab === "upcoming") return rsvps as any[];
    if (tab === "saved") return likes as any[];
    return pastRsvps as any[];
  }, [likes, pastRsvps, rsvps, tab]);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, any[]>();
    currentEvents.forEach((event) => {
      if (!event.dateTime) return;
      const group = new Date(event.dateTime).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      groups.set(group, [...(groups.get(group) ?? []), event]);
    });
    return Array.from(groups.entries());
  }, [currentEvents]);

  const nextEvent = tab === "upcoming" ? (rsvps[0] as any | undefined) : undefined;

  return (
    <AppScreen
      scroll
      header={
        <HeroHeader
          title="My Calendar"
          subtitle="Keep your next shows, saved gigs, and past nights in one place."
          eyebrow="Fan Workspace"
          tone="fan"
        >
          <View className="flex-row gap-2">
            <StatCard label="Upcoming" value={String(rsvps.length)} tone="fan" />
            <StatCard label="Saved" value={String(likes.length)} tone="fan" />
            <StatCard label="Past" value={String(pastRsvps.length)} tone="fan" />
          </View>
        </HeroHeader>
      }
    >
      {isLoading ? (
        <LoadingPanel label="Loading your calendar..." tone="fan" />
      ) : (
        <>
          <SegmentedTabs
            value={tab}
            tone="fan"
            onChange={(value) => setTab(value as CalendarTab)}
            options={[
              { value: "upcoming", label: "Upcoming", count: rsvps.length },
              { value: "saved", label: "Saved", count: likes.length },
              { value: "past", label: "History", count: pastRsvps.length },
            ]}
          />

          {nextEvent && tab === "upcoming" ? (
            <TouchableOpacity onPress={() => router.push(`/gig/${nextEvent._id}`)} className="mt-4">
              <SectionCard tone="fan">
                <View className="flex-row items-start justify-between gap-4">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Sparkles size={14} color="#2563eb" />
                      <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-blue-700">Next Event</Text>
                    </View>
                    <Text className="mt-3 text-xl font-semibold text-slate-950">
                      {nextEvent.title || "Untitled Event"}
                    </Text>
                    {nextEvent.band ? (
                      <Text className="mt-1 text-sm text-slate-600">{nextEvent.band.name}</Text>
                    ) : null}
                    {nextEvent.venue ? (
                      <Text className="mt-1 text-sm text-slate-500">
                        {nextEvent.venue.name}
                        {nextEvent.venue.city ? ` • ${nextEvent.venue.city}` : ""}
                      </Text>
                    ) : null}
                    {nextEvent.dateTime ? (
                      <Text className="mt-3 text-sm font-medium text-blue-700">
                        {formatEventDate(nextEvent.dateTime)} · {formatEventTime(nextEvent.dateTime)}
                      </Text>
                    ) : null}
                  </View>

                  <View className="items-end">
                    <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-slate-500">
                      RSVP
                    </Text>
                    <Text className="mt-1 text-3xl font-bold text-slate-950">{nextEvent.rsvpCount}</Text>
                    <ChevronRight size={18} color="#94a3b8" />
                  </View>
                </View>
              </SectionCard>
            </TouchableOpacity>
          ) : null}

          <View className="mt-5 gap-4">
            {groupedEvents.length > 0 ? (
              groupedEvents.map(([month, events]) => (
                <View key={month}>
                  <SectionTitle title={month} subtitle={`${events.length} ${events.length === 1 ? "event" : "events"}`} />
                  {events.map((event) => (
                    <EventListItem key={event._id} event={event} showActions={tab !== "past"} />
                  ))}
                </View>
              ))
            ) : (
              <EmptyState
                tone="fan"
                title={tab === "upcoming" ? "No upcoming shows yet" : tab === "saved" ? "No saved gigs yet" : "No past events yet"}
                message={
                  tab === "upcoming"
                    ? "RSVP to a show in Discover and it will land here automatically."
                    : tab === "saved"
                      ? "Like a gig from Discover to build your save list."
                      : "Past attended shows will appear here once you have check-in history."
                }
              />
            )}
          </View>
        </>
      )}
    </AppScreen>
  );
}
