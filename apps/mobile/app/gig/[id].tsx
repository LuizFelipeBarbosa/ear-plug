import {
  ActionButton,
  AppScreen,
  EmptyState,
  HeroHeader,
  MiniBadge,
  SectionCard,
  SectionTitle,
} from "@/components/ui/AppPrimitives";
import { useProfileContext } from "@/context/ProfileContext";
import { useEvent, useEventCheckinAccess } from "@/hooks/useEvents";
import { formatEventDate, formatEventTime, formatPrice } from "@ear-plug/shared/constants";
import { isEventPast } from "@ear-plug/shared/eventTiming";
import { buildGoogleCalendarUrl } from "@ear-plug/shared/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Calendar, Heart, MapPin, QrCode, ShieldCheck, Ticket, Users } from "lucide-react-native";
import { Alert, Linking, Text, TouchableOpacity, View } from "react-native";
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
  const isPast = typeof event?.dateTime === "number" ? isEventPast(event.dateTime) : false;

  if (isLoading) {
    return (
      <AppScreen>
        <SectionCard tone="fan">
          <Text className="text-sm text-slate-500">Loading event...</Text>
        </SectionCard>
      </AppScreen>
    );
  }

  if (!event) {
    return (
      <AppScreen>
        <EmptyState
          tone="fan"
          title="Event unavailable"
          message="This event may be private, tentative, or no longer available."
          action={<ActionButton label="Go Back" tone="fan" onPress={() => router.back()} />}
        />
      </AppScreen>
    );
  }

  const spotsLeft = typeof event.capacity === "number" ? Math.max(event.capacity - event.rsvpCount, 0) : null;
  const canRsvp = isFanMode && !isPast;
  const eventStatus = event.status as string | undefined;
  const eventStatusLabel = eventStatus === "hold" ? "Tentative" : eventStatus ?? "Confirmed";
  const eventStatusTone: "warning" | "band" | "fan" = eventStatus === "hold" ? "warning" : isBandMode ? "band" : "fan";
  const lineupNames =
    event.lineupBands?.map((band: any) => band.name).filter(Boolean) ??
    (event.band?.name ? [event.band.name] : []);
  const calendarLocation = event.venue
    ? [
        event.venue.name,
        event.isVenueAddressHidden ? undefined : event.venue.address,
        event.venue.city,
      ]
        .filter(Boolean)
        .join(" • ")
    : "";
  const calendarDescription = [event.description, lineupNames.length ? `Lineup: ${lineupNames.join(", ")}` : undefined]
    .filter(Boolean)
    .join("\n\n");

  const handleAddToCalendar = async () => {
    const url = buildGoogleCalendarUrl({
      title: event.title,
      startsAt: event.dateTime,
      description: calendarDescription,
      location: calendarLocation,
    });

    if (!url) {
      Alert.alert("Calendar unavailable", "This event needs a confirmed date before it can be added to a calendar.");
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open calendar", "Try again in a moment.");
    }
  };

  const handleRsvpPress = () => {
    if (hasRsvp) {
      Alert.alert(
        "Cancel RSVP?",
        `You’ll be removed from the guest list for ${event.title || "this gig"} and lose ticket access.`,
        [
          { text: "Keep RSVP", style: "cancel" },
          {
            text: "Cancel RSVP",
            style: "destructive",
            onPress: () => {
              void rsvp();
            },
          },
        ],
      );
      return;
    }

    void rsvp();
  };

  return (
    <AppScreen
      scroll
      header={
        <HeroHeader
          title={event.title || "Untitled Gig"}
          subtitle={`${event.band?.name || "Local lineup"}${event.venue?.name ? ` • ${event.venue.name}` : ""}`}
          eyebrow={isBandMode ? "Band Context" : "Fan Context"}
          tone={isBandMode ? "band" : "fan"}
          action={
            <TouchableOpacity onPress={() => router.back()} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
              <View className="flex-row items-center gap-2">
                <ArrowLeft size={14} color="#334155" />
                <Text className="text-xs font-semibold text-slate-700">Back</Text>
              </View>
            </TouchableOpacity>
          }
        >
          <SectionCard tone={isBandMode ? "band" : "fan"}>
            <View className="flex-row flex-wrap gap-2">
              {eventStatus ? <MiniBadge label={eventStatusLabel} tone={eventStatusTone} /> : null}
              {hasRsvp ? <MiniBadge label="RSVP'd" tone="success" /> : null}
              {hasLiked ? <MiniBadge label="Saved" tone="fan" /> : null}
            </View>
            <Text className="mt-4 text-sm leading-6 text-slate-600">
              {event.description || "Event details will continue to fill out as the show gets closer."}
            </Text>
          </SectionCard>
        </HeroHeader>
      }
      footer={
        <View className="border-t border-slate-200 bg-white px-4 pb-6 pt-3">
          {canRsvp ? (
            <>
              <ActionButton
                label={hasRsvp ? "You're Going" : spotsLeft !== null && spotsLeft === 0 ? "Sold Out" : "RSVP"}
                tone="fan"
                disabled={spotsLeft !== null && spotsLeft === 0 && !hasRsvp}
                onPress={handleRsvpPress}
              />
              <View className="mt-2 flex-row gap-2">
                <View className="flex-1">
                  <ActionButton
                    label={hasLiked ? "Saved" : "Save"}
                    variant="secondary"
                    onPress={() => void toggleLike()}
                    icon={<Heart size={16} color={hasLiked ? "#ef4444" : "#334155"} fill={hasLiked ? "#ef4444" : "transparent"} />}
                  />
                </View>
                {hasRsvp ? (
                  <View className="flex-1">
                    <ActionButton
                      label="View Ticket"
                      tone="fan"
                      icon={<QrCode size={16} color="#ffffff" />}
                      onPress={() => router.push(`/gig/${eventId}/ticket`)}
                    />
                  </View>
                ) : null}
              </View>
            </>
          ) : canScan ? (
            <ActionButton
              label="Open Check-In Scanner"
              tone="band"
              icon={<ShieldCheck size={16} color="#ffffff" />}
              onPress={() => router.push(`/gig/${eventId}/check-in`)}
            />
          ) : (
            <SectionCard>
              <Text className="text-center text-sm text-slate-600">
                {isBandMode
                  ? "Switch to a staff-authorized band workspace for check-in access."
                  : `Event starts ${typeof event.dateTime === "number" ? formatEventTime(event.dateTime) : "soon"}.`}
              </Text>
            </SectionCard>
          )}
        </View>
      }
    >
      <View className="gap-4">
        <SectionCard>
          <SectionTitle title="Event Info" subtitle="Key info surfaces stay consistent across web and mobile." />
          <View className="gap-3">
            <MetaRow icon={<Calendar size={16} color="#64748b" />} label="Date" value={typeof event.dateTime === "number" ? formatEventDate(event.dateTime) : "Date TBD"} />
            <MetaRow icon={<Users size={16} color="#64748b" />} label="Capacity" value={typeof event.capacity === "number" ? `${event.rsvpCount}/${event.capacity}${spotsLeft !== null ? ` • ${spotsLeft} left` : ""}` : `${event.rsvpCount} RSVPs`} />
            <MetaRow icon={<Ticket size={16} color="#64748b" />} label="Price" value={typeof event.price === "number" ? formatPrice(event.price) : "Free"} />
            <MetaRow icon={<MapPin size={16} color="#64748b" />} label="Venue" value={`${event.venue?.name || "Venue TBD"}${event.venue?.city ? ` • ${event.venue.city}` : ""}${event.isVenueAddressHidden ? " • RSVP to reveal" : ""}`} />
          </View>
          {!isPast && typeof event.dateTime === "number" ? (
            <View className="mt-4">
              <ActionButton
                label="Add to Calendar"
                variant="secondary"
                icon={<Calendar size={16} color="#334155" />}
                onPress={() => void handleAddToCalendar()}
              />
            </View>
          ) : null}
        </SectionCard>
      </View>
    </AppScreen>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-3">
      {icon}
      <View className="flex-1">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-slate-500">{label}</Text>
        <Text className="mt-1 text-sm text-slate-900">{value}</Text>
      </View>
    </View>
  );
}
