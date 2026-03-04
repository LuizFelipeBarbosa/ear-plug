import { formatEventDate, formatEventTime } from "@ear-plug/shared/constants";
import { Link } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Heart, Check } from "lucide-react-native";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { useProfileContext } from "@/context/ProfileContext";

interface EventListItemProps {
  event: {
    _id: Id<"events">;
    title?: string;
    dateTime?: number;
    rsvpCount: number;
    capacity?: number;
    venue?: { name?: string; city?: string } | null;
    isVenueAddressHidden?: boolean;
  };
  showActions?: boolean;
}

export function EventListItem({ event, showActions = true }: EventListItemProps) {
  const { mode } = useProfileContext();
  const isFanMode = mode === "personal";

  const status = useQuery(
    api.events.getUserEventStatus,
    isFanMode ? { eventId: event._id } : "skip",
  );

  const rsvp = useMutation(api.events.rsvp);
  const toggleLike = useMutation(api.events.toggleLike);

  const hasRsvp = status?.hasRsvp ?? false;
  const hasLiked = status?.hasLiked ?? false;

  const isPast = typeof event.dateTime === "number" ? event.dateTime < Date.now() : false;
  const dateLabel = typeof event.dateTime === "number" ? formatEventDate(event.dateTime) : "Date TBD";
  const timeLabel = typeof event.dateTime === "number" ? formatEventTime(event.dateTime) : "Time TBD";

  return (
    <Link href={`/gig/${event._id}`} asChild>
      <Pressable className="rounded-xl border border-gray-200 bg-white p-4 mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-gray-900">{event.title?.trim() || "Untitled Gig"}</Text>
            <Text className="mt-1 text-sm text-gray-500">
              {event.venue?.name || "Venue TBD"}
              {event.isVenueAddressHidden ? " • RSVP to reveal location" : ""}
            </Text>
            <Text className="mt-1 text-sm text-blue-600">{dateLabel} • {timeLabel}</Text>
            <Text className="mt-1 text-xs text-gray-500">{event.rsvpCount} RSVPs</Text>
          </View>

          {showActions && isFanMode && !isPast ? (
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  void rsvp({ eventId: event._id });
                }}
                className={`rounded-lg border p-2 ${hasRsvp ? "bg-green-500 border-green-500" : "border-gray-300"}`}
              >
                <Check size={16} color={hasRsvp ? "#fff" : "#6b7280"} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  void toggleLike({ eventId: event._id });
                }}
                className="rounded-lg border border-gray-300 p-2"
              >
                <Heart size={16} color={hasLiked ? "#ef4444" : "#6b7280"} fill={hasLiked ? "#ef4444" : "transparent"} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
