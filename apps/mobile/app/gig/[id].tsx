import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
} from "lucide-react-native";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id as Id<"events">;

  const event = useQuery(api.events.getById, { eventId });
  const eventStatus = useQuery(api.events.getUserEventStatus, { eventId });
  const rsvpMutation = useMutation(api.events.rsvp);
  const toggleLikeMutation = useMutation(api.events.toggleLike);

  const hasRsvp = eventStatus?.hasRsvp ?? false;
  const hasLiked = eventStatus?.hasLiked ?? false;

  const handleRsvp = async () => {
    await rsvpMutation({ eventId });
  };

  const handleToggleLike = async () => {
    await toggleLikeMutation({ eventId });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (!event) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <View className="w-12 h-12 rounded-full bg-primary-500 animate-pulse" />
      </SafeAreaView>
    );
  }

  const spotsLeft = event.capacity - event.rsvpCount;
  const fillPercentage = Math.min((event.rsvpCount / event.capacity) * 100, 100);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Header Image */}
        <View className="h-72 bg-gradient-to-br from-primary-500 to-accent-500">
          {/* Actions */}
          <View className="absolute top-4 left-4 right-4 flex-row justify-between z-10">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 rounded-full bg-black/20"
            >
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <View className="flex-row">
              <TouchableOpacity className="p-2 rounded-full bg-black/20 mr-2">
                <Share2 size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleToggleLike}
                className={`p-2 rounded-full ${
                  hasLiked ? "bg-accent-500" : "bg-black/20"
                }`}
              >
                <Heart
                  size={24}
                  color="#fff"
                  fill={hasLiked ? "#fff" : "transparent"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="p-6">
          {/* Band Info */}
          {event.band && (
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-accent-400" />
              <View className="ml-3">
                <Text className="font-semibold text-gray-900">
                  {event.band.name}
                </Text>
                <Text className="text-sm text-primary-600">
                  {/* Display genres (handle both new and legacy format) */}
                  {(event.genres && event.genres.length > 0
                    ? event.genres
                    : event.genre ? [event.genre] : []
                  ).map((g: string) => g.charAt(0).toUpperCase() + g.slice(1)).join(" • ")}
                </Text>
              </View>
            </View>
          )}

          {/* Title */}
          <Text className="text-2xl font-bold text-gray-900 mb-4">
            {event.title}
          </Text>

          {/* Details Grid */}
          <View className="flex-row flex-wrap mb-6">
            <DetailCard
              icon={<Calendar size={20} color="#7c3aed" />}
              label="Date"
              value={formatDate(event.dateTime)}
            />
            <DetailCard
              icon={<Clock size={20} color="#7c3aed" />}
              label="Time"
              value={formatTime(event.dateTime)}
            />
            <DetailCard
              icon={<Users size={20} color="#7c3aed" />}
              label="RSVPs"
              value={`${event.rsvpCount} / ${event.capacity}`}
            />
            <DetailCard
              icon={<DollarSign size={20} color="#7c3aed" />}
              label="Ticket"
              value={event.price ? formatPrice(event.price) : "Free"}
            />
          </View>

          {/* RSVP Progress */}
          <View className="bg-gray-50 rounded-xl p-4 mb-6">
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-gray-600">
                {spotsLeft} spots remaining
              </Text>
              <Text className="text-sm text-gray-500">
                {Math.round(fillPercentage)}% full
              </Text>
            </View>
            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                style={{ width: `${fillPercentage}%` }}
              />
            </View>
          </View>

          {/* Venue */}
          {event.venue && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Venue
              </Text>
              <View className="bg-gray-50 rounded-xl p-4">
                <View className="flex-row items-start">
                  <MapPin size={20} color="#7c3aed" />
                  <View className="ml-3">
                    <Text className="font-medium text-gray-900">
                      {event.venue.name}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {event.venue.address}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {event.venue.city} • Capacity: {event.venue.capacity}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Description */}
          {event.description && (
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                About
              </Text>
              <Text className="text-gray-600 leading-relaxed">
                {event.description}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* RSVP Button */}
      <View className="p-4 border-t border-gray-200 pb-8">
        <TouchableOpacity
          onPress={handleRsvp}
          disabled={spotsLeft <= 0 && !hasRsvp}
          className={`py-4 rounded-xl ${
            hasRsvp
              ? "bg-green-500"
              : spotsLeft <= 0
                ? "bg-gray-300"
                : "bg-primary-600"
          }`}
        >
          <Text className="text-white text-center text-lg font-semibold">
            {hasRsvp
              ? "You're Going! ✓"
              : spotsLeft <= 0
                ? "Sold Out"
                : "RSVP to Event"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="w-1/2 p-1">
      <View className="bg-gray-50 rounded-xl p-4">
        <View className="flex-row items-center mb-1">
          {icon}
          <Text className="text-sm text-gray-500 ml-2">{label}</Text>
        </View>
        <Text className="font-semibold text-gray-900">{value}</Text>
      </View>
    </View>
  );
}
