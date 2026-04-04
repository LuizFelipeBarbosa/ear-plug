import { useProfileContext } from "@/context/ProfileContext";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { formatEventDate, formatEventTime } from "@ear-plug/shared/constants";
import { isEventPast } from "@ear-plug/shared/eventTiming";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Heart, Check, MapPin } from "lucide-react-native";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { cn } from "@/lib/utils";
import { Badge, Card } from "@/components/ui/AppPrimitives";

interface EventListItemProps {
  event: {
    _id: Id<"events">;
    title?: string;
    dateTime?: number;
    image?: string;
    rsvpCount: number;
    capacity?: number;
    status?: "confirmed" | "hold" | "available";
    genres?: string[];
    band?: { _id?: Id<"bands">; name: string; image?: string } | null;
    venue?: { name?: string; city?: string; address?: string } | null;
    isVenueAddressHidden?: boolean;
    attendanceStatus?: "on_list" | "attended";
  };
  variant?: "default" | "compact";
  showActions?: boolean;
}

export function EventListItem({ 
  event, 
  variant = "default",
  showActions = true 
}: EventListItemProps) {
  const router = useRouter();
  const { mode } = useProfileContext();
  const isFanMode = mode === "personal";
  const tone = isFanMode ? "fan" : "band";
  
  const status = useQuery(
    api.eventRsvps.getUserEventStatus,
    isFanMode ? { eventId: event._id } : "skip"
  );

  const rsvp = useMutation(api.eventRsvps.rsvp);
  const toggleLike = useMutation(api.eventRsvps.toggleLike);

  const hasRsvp = status?.hasRsvp ?? false;
  const hasLiked = status?.hasLiked ?? false;
  const isPast = typeof event.dateTime === "number" ? isEventPast(event.dateTime) : false;
  
  const displayTitle = event.title?.trim() || "Untitled Gig";
  const eventDateTime = typeof event.dateTime === "number" ? event.dateTime : null;
  const displayDate = eventDateTime !== null ? formatEventDate(eventDateTime) : "Date TBD";
  const displayTime = eventDateTime !== null ? formatEventTime(eventDateTime) : "Time TBD";

  const handleRsvp = (e: any) => {
    e.stopPropagation();

    if (hasRsvp) {
      Alert.alert(
        "Cancel RSVP?",
        `You’ll be removed from the guest list for ${displayTitle} and lose ticket access.`,
        [
          { text: "Keep RSVP", style: "cancel" },
          {
            text: "Cancel RSVP",
            style: "destructive",
            onPress: () => {
              void rsvp({ eventId: event._id });
            },
          },
        ],
      );
      return;
    }

    void rsvp({ eventId: event._id });
  };

  const handleLike = (e: any) => {
    e.stopPropagation();
    void toggleLike({ eventId: event._id });
  };

  const handlePress = () => {
    router.push(`/gig/${event._id}`);
  };

  const compact = variant === "compact";
  const imageSize = compact ? "h-16 w-16" : "h-20 w-20";
  const padding = compact ? "p-3" : "p-3.5";

  return (
    <Pressable onPress={handlePress} className="active:opacity-70">
      <Card 
        tone={isPast ? "neutral" : tone} 
        className={cn(
          "flex-row items-center gap-3",
          padding,
          isPast && "opacity-75"
        )}
      >
        {/* Event Image */}
        <View className={cn(
          imageSize,
          "flex-shrink-0 overflow-hidden rounded-[18px] bg-muted items-center justify-center border border-slate-200"
        )}>
          {event.image ? (
            <Image source={{ uri: event.image }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="w-full h-full bg-gradient-to-br from-fan/10 to-band/10 items-center justify-center">
              <MapPin size={compact ? 20 : 24} color="#9ca3af" />
            </View>
          )}
        </View>

        {/* Content */}
        <View className="flex-1 min-w-0">
          <Text 
            className={cn(
              "font-medium text-foreground truncate",
              compact ? "text-sm" : "text-base"
            )}
            numberOfLines={1}
          >
            {displayTitle}
          </Text>

          <View className="mt-1 flex-row flex-wrap items-center gap-2">
            {event.band?.name ? <Badge label={event.band.name} tone={tone} variant="outline" /> : null}
            <Text className="text-[11px] font-medium text-slate-400">
              {event.rsvpCount} RSVP{event.rsvpCount === 1 ? "" : "s"}
            </Text>
          </View>

          {/* Venue */}
          <View className="relative mt-0.5 overflow-hidden">
            <Text 
              className={cn(
                "text-xs truncate",
                event.isVenueAddressHidden 
                  ? "text-muted-foreground opacity-30" 
                  : "text-muted-foreground"
              )}
              numberOfLines={1}
            >
              {event.venue?.name || "Venue TBD"}
            </Text>
            {event.isVenueAddressHidden && (
              <View className="absolute inset-0 flex-row items-center">
                  <Text className="bg-card/80 px-1 text-[10px] font-medium text-foreground">
                    RSVP to reveal location
                  </Text>
                </View>
              )}
          </View>

          {/* Date */}
          <Text className={cn(
            "text-xs mt-1",
            isPast ? "text-muted-foreground" : tone === "fan" ? "text-fan" : "text-band"
          )}>
            {displayDate} • {displayTime}
          </Text>

          {/* Attendance Status */}
          {event.attendanceStatus && (
            <View className={cn(
              "inline-flex mt-2 rounded-md px-2 py-1 self-start",
              event.attendanceStatus === "attended"
                ? "bg-success/10 border border-success/30"
                : "bg-muted border border-border"
            )}>
              <Text className={cn(
                "text-[10px] font-medium",
                event.attendanceStatus === "attended" ? "text-success" : "text-muted-foreground"
              )}>
                {event.attendanceStatus === "attended" ? "Attended" : "On list"}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {showActions && (
          <View className="flex-row items-center gap-1">
            {isPast || !isFanMode ? (
              <View className="rounded-xl border border-border bg-muted px-2.5 py-1">
                <Text className="text-[10px] font-medium text-muted-foreground">
                  {isPast ? "Completed" : "View"}
                </Text>
              </View>
            ) : (
              <>
                {/* RSVP Button */}
                <Pressable
                  onPress={handleRsvp}
                  className={cn(
                    "w-9 h-9 rounded-lg border items-center justify-center touch-target-sm",
                    hasRsvp
                      ? "bg-success border-success"
                      : "bg-transparent border-border"
                  )}
                >
                  <Check 
                    size={18} 
                    color={hasRsvp ? "#ffffff" : tone === "fan" ? "#2563eb" : "#7c3aed"}
                    strokeWidth={hasRsvp ? 3 : 2}
                  />
                </Pressable>

                {/* Like Button */}
                <Pressable
                  onPress={handleLike}
                  className="w-9 h-9 rounded-lg border border-border items-center justify-center touch-target-sm"
                >
                  <Heart
                    size={18}
                    color={hasLiked ? "#ef4444" : "#9ca3af"}
                    fill={hasLiked ? "#ef4444" : "transparent"}
                  />
                </Pressable>
              </>
            )}
          </View>
        )}
      </Card>
    </Pressable>
  );
}
