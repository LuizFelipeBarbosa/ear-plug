import { useProfileContext } from "@/context/ProfileContext";
import { useEvent, useEventCheckinAccess } from "@/hooks/useEvents";
import { formatEventDate, formatEventTime, formatPrice } from "@ear-plug/shared/constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Calendar, Heart, MapPin, QrCode, ShieldCheck, Ticket, Users } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function EventDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id as Id<"events">;
  const { mode } = useProfileContext();

  const { event, hasRsvp, hasLiked, isLoading, rsvp, toggleLike } = useEvent(eventId);
  const { canScan } = useEventCheckinAccess(eventId);
  const isBandMode = mode === "band";
  const isFanMode = mode === "personal";
  const isPast = typeof event?.dateTime === "number" ? event.dateTime < Date.now() : false;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Loading event...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-xl font-semibold text-gray-900">Event unavailable</Text>
        <Text className="mt-2 text-center text-sm text-gray-500">
          This event may be private, tentative, or no longer available.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5">
          <Text className="font-semibold text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const spotsLeft = typeof event.capacity === "number" ? Math.max(event.capacity - event.rsvpCount, 0) : null;
  const canRsvp = isFanMode && !isPast;

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="bg-gradient-to-br from-violet-500 to-blue-600 px-4 pb-5 pt-14">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-full border border-white/20 bg-black/20 p-2"
            >
              <ArrowLeft size={20} color="#ffffff" />
            </TouchableOpacity>

            {canRsvp ? (
              <TouchableOpacity
                onPress={() => void toggleLike()}
                className={`rounded-full border p-2 ${hasLiked ? "border-pink-200 bg-pink-500" : "border-white/20 bg-black/20"}`}
              >
                <Heart size={20} color="#ffffff" fill={hasLiked ? "#ffffff" : "transparent"} />
              </TouchableOpacity>
            ) : <View />}
          </View>

          <Text className="mt-6 text-3xl font-bold text-white">{event.title || "Untitled Gig"}</Text>
          {event.band ? (
            <TouchableOpacity onPress={() => router.push(`/bands/${event.band?._id}`)} className="mt-2 self-start">
              <Text className="text-sm font-semibold text-blue-100">{event.band.name}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="px-4 pt-5">
          <View className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <InfoRow
              icon={<Calendar size={18} color="#2563eb" />}
              label="Date"
              value={typeof event.dateTime === "number" ? formatEventDate(event.dateTime) : "Date TBD"}
            />
            <InfoRow
              icon={<Users size={18} color="#2563eb" />}
              label="Capacity"
              value={
                typeof event.capacity === "number"
                  ? `${event.rsvpCount} / ${event.capacity}${spotsLeft !== null ? ` (${spotsLeft} left)` : ""}`
                  : `${event.rsvpCount} RSVPs`
              }
            />
            <InfoRow
              icon={<Ticket size={18} color="#2563eb" />}
              label="Price"
              value={typeof event.price === "number" ? formatPrice(event.price) : "Free"}
            />
            <InfoRow
              icon={<MapPin size={18} color="#2563eb" />}
              label="Venue"
              value={`${event.venue?.name || "Venue TBD"}${event.venue?.city ? ` • ${event.venue.city}` : ""}`}
              last
            />
          </View>

          {event.description ? (
            <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="text-sm font-semibold text-gray-900">About this event</Text>
              <Text className="mt-2 text-sm leading-5 text-gray-600">{event.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View className="border-t border-gray-200 bg-white px-4 pb-8 pt-3">
        {canRsvp ? (
          <>
            <TouchableOpacity
              onPress={() => void rsvp()}
              disabled={spotsLeft !== null && spotsLeft === 0 && !hasRsvp}
              className={`rounded-xl py-3 ${
                hasRsvp
                  ? "bg-green-600"
                  : spotsLeft !== null && spotsLeft === 0
                    ? "bg-gray-300"
                    : "bg-blue-600"
              }`}
            >
              <Text className="text-center text-base font-semibold text-white">
                {hasRsvp ? "You're Going" : spotsLeft !== null && spotsLeft === 0 ? "Sold Out" : "RSVP"}
              </Text>
            </TouchableOpacity>

            {hasRsvp ? (
              <TouchableOpacity
                onPress={() => router.push(`/gig/${eventId}/ticket`)}
                className="mt-2 rounded-xl border border-blue-300 py-3"
              >
                <View className="flex-row items-center justify-center">
                  <QrCode size={16} color="#1d4ed8" />
                  <Text className="ml-2 text-sm font-semibold text-blue-700">View Ticket</Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </>
        ) : canScan ? (
          <TouchableOpacity
            onPress={() => router.push(`/gig/${eventId}/check-in`)}
            className="rounded-xl bg-violet-600 py-3"
          >
            <View className="flex-row items-center justify-center">
              <ShieldCheck size={16} color="#ffffff" />
              <Text className="ml-2 text-base font-semibold text-white">Open Check-In Scanner</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View className="rounded-xl border border-gray-200 bg-gray-50 py-3">
            <Text className="text-center text-sm text-gray-600">
              {isBandMode
                ? "Switch to an event manager/staff band workspace for check-in access."
                : `Event starts ${typeof event.dateTime === "number" ? formatEventTime(event.dateTime) : "soon"}.`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View className={`flex-row items-start ${last ? "" : "mb-3 border-b border-gray-200 pb-3"}`}>
      <View className="mt-0.5">{icon}</View>
      <View className="ml-3 flex-1">
        <Text className="text-xs uppercase text-gray-500">{label}</Text>
        <Text className="mt-0.5 text-sm font-medium text-gray-900">{value}</Text>
      </View>
    </View>
  );
}
