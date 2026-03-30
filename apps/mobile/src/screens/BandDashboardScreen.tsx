import { useBandAnalytics, useCurrentBand } from "@/hooks/useBand";
import { useBandConversations } from "@/hooks/useMessages";
import { useOpenDates, useSuggestedVenues } from "@/hooks/useVenues";
import { formatEventDate, formatEventTime, formatPrice } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import { api } from "../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  MapPin, 
  ChevronRight,
  Music,
  Plus,
  Mail,
  BarChart3,
  Clock,
  CheckCircle2,
  HelpCircle,
  UserPlus,
  Bell,
  ArrowRight,
} from "lucide-react-native";
import { cn } from "@/lib/utils";
import { 
  AppScreen, 
  Card, 
  Button, 
  StatCard,
} from "@/components/ui/AppPrimitives";

const STATUS_COLORS = {
  confirmed: {
    bg: "bg-emerald-500",
    bgLight: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-500",
    textDark: "text-emerald-600",
  },
  tentative: {
    bg: "bg-amber-500",
    bgLight: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-500",
    textDark: "text-amber-600",
  },
};

export function BandDashboardScreen() {
  const router = useRouter();
  const { bandWithStats, isLoading, activeBandId } = useCurrentBand();
  const { unreadCount, conversations, pendingCohostInvites } = 
    useBandConversations(activeBandId);
  const { analytics } = useBandAnalytics(activeBandId);
  
  const primaryGenre = (bandWithStats?.genres?.[0] ?? "indie") as Genre;
  const { venues: suggestedVenues } = useSuggestedVenues(primaryGenre);
  const { openDates, applyToOpenDate } = useOpenDates({ genre: primaryGenre, limit: 3 });

  const upcomingEvents = useQuery(
    api.events.listByBand,
    activeBandId ? { bandId: activeBandId, includesPast: false } : "skip",
  ) as any[] | undefined;

  const [applyingOpenDateId, setApplyingOpenDateId] = useState<string | null>(null);

  const { confirmedShows, tentativeShows, nextShow } = useMemo(() => {
    const source = (upcomingEvents ?? []).filter((event) => typeof event.dateTime === "number");
    const confirmed = source.filter((event) => event.status === "confirmed").sort((a, b) => a.dateTime - b.dateTime);
    const tentative = source.filter((event) => event.status === "hold").sort((a, b) => a.dateTime - b.dateTime);
    return {
      confirmedShows: confirmed.slice(0, 3),
      tentativeShows: tentative.slice(0, 2),
      nextShow: confirmed[0] || tentative[0] || null,
    };
  }, [upcomingEvents]);

  const hasNotifications = unreadCount > 0 || pendingCohostInvites.length > 0;
  const totalNotifications = unreadCount + pendingCohostInvites.length;

  if (isLoading) {
    return (
      <AppScreen>
        <DashboardSkeleton />
      </AppScreen>
    );
  }

  if (!bandWithStats || !activeBandId) {
    return (
      <AppScreen>
        <CreateBandPrompt />
      </AppScreen>
    );
  }

  const handleApply = async (openDateId: string) => {
    setApplyingOpenDateId(openDateId);
    try {
      await applyToOpenDate({ openDateId: openDateId as any, bandId: bandWithStats._id });
    } finally {
      setApplyingOpenDateId(null);
    }
  };

  return (
    <AppScreen scroll>
      {/* Header Background */}
      <View className="absolute top-0 left-0 right-0 h-56 overflow-hidden">
        <View className="absolute inset-0 bg-gradient-to-b from-band/10 via-band/5 to-transparent" />
        <View className="absolute top-0 right-0 h-72 w-72 rounded-full bg-band/10 blur-3xl -translate-y-1/2 translate-x-1/3" />
        <View className="absolute top-0 left-0 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl -translate-x-1/3 -translate-y-1/2" />
      </View>

      {/* Main Content */}
      <View className="relative -mt-2">
        {/* Band Header Card */}
        <Card className="overflow-hidden">
          <View className="p-4">
            <View className="flex-row items-start gap-4">
              {/* Band Image */}
              <View className="h-14 w-14 overflow-hidden rounded-[18px] border border-band/20 bg-gradient-to-br from-band/20 to-fan/20 items-center justify-center flex-shrink-0">
                {bandWithStats.image ? (
                  <Image source={{ uri: bandWithStats.image }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <Music size={32} color="#7c3aed" />
                )}
              </View>

              {/* Band Info */}
              <View className="flex-1 min-w-0">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-[22px] font-bold text-foreground truncate">
                      {bandWithStats.name}
                    </Text>
                    <Text className="text-sm text-muted-foreground mt-0.5">
                      {(bandWithStats.genres || [])
                        .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
                        .join(" • ") || "No genre"}
                      {bandWithStats.location && ` • ${bandWithStats.location}`}
                    </Text>
                  </View>
                </View>

                {/* Quick Stats Row */}
                <View className="flex-row items-center gap-4 mt-4">
                  <View className="flex-row items-center gap-1.5">
                    <Calendar size={14} color="#9ca3af" />
                    <Text className="text-sm font-medium text-foreground">
                      {bandWithStats.stats.showsThisMonth}
                    </Text>
                    <Text className="text-xs text-muted-foreground">shows</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Users size={14} color="#9ca3af" />
                    <Text className="text-sm font-medium text-foreground">
                      {bandWithStats.stats.totalRsvps}
                    </Text>
                    <Text className="text-xs text-muted-foreground">RSVPs</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <TrendingUp size={14} color="#9ca3af" />
                    <Text className="text-sm font-medium text-foreground">
                      +{bandWithStats.stats.newFans}
                    </Text>
                    <Text className="text-xs text-muted-foreground">fans</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Action Bar */}
          <View className="border-t border-border/50 px-4 py-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              {hasNotifications && (
                <TouchableOpacity
                  onPress={() => router.push("/messages")}
                  className="flex-row items-center gap-1.5 rounded-full bg-band/10 px-3 py-1.5"
                >
                  <Bell size={14} color="#7c3aed" />
                  <Text className="text-xs font-medium text-band">{totalNotifications} new</Text>
                </TouchableOpacity>
              )}
              {confirmedShows.length > 0 && (
                <View className="flex-row items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5">
                  <CheckCircle2 size={14} color="#16a34a" />
                  <Text className="text-xs font-medium text-emerald-600">{confirmedShows.length} confirmed</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => router.push("/calendar")}
              className="flex-row items-center gap-1.5 text-band"
            >
              <Plus size={14} color="#7c3aed" />
              <Text className="text-xs font-medium text-band">Create Gig</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Next Show Highlight */}
        {nextShow && (
          <View className="mt-5">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-band" />
                <Text className="text-sm font-semibold text-foreground">Next Up</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/calendar")}
                className="flex-row items-center gap-1"
              >
                <Text className="text-xs text-muted-foreground">View Calendar</Text>
                <ChevronRight size={14} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <NextShowCard show={nextShow} />
          </View>
        )}

        {/* Stats Overview */}
        <View className="mt-5">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-band" />
              <Text className="text-sm font-semibold text-foreground">Performance</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/analytics")}
              className="flex-row items-center gap-1"
            >
              <Text className="text-xs text-muted-foreground">Full Analytics</Text>
              <ChevronRight size={14} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-3">
            <StatCard
              icon={<Users size={16} color="#7c3aed" />}
              value={analytics?.totalRsvps ?? 0}
              label="Total RSVPs"
              tone="band"
            />
            <StatCard
              icon={<Calendar size={16} color="#2563eb" />}
              value={analytics?.eventCount ?? bandWithStats.stats.showsThisMonth}
              label="Total Shows"
              tone="neutral"
            />
          </View>
          <View className="flex-row gap-3 mt-3">
            <StatCard
              icon={<TrendingUp size={16} color="#16a34a" />}
              value={Number.isFinite(analytics?.averageAttendancePerShow)
                ? analytics!.averageAttendancePerShow.toFixed(1)
                : "0.0"}
              label="Avg Attendance"
              tone="success"
            />
            <StatCard
              icon={<Mail size={16} color="#6b7280" />}
              value={unreadCount}
              label="Unread Messages"
              tone="neutral"
              highlight={unreadCount > 0}
            />
          </View>
        </View>

        {/* Upcoming Shows Preview */}
        {(confirmedShows.length > 0 || tentativeShows.length > 0) && (
          <View className="mt-5">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-band" />
                <Text className="text-sm font-semibold text-foreground">Upcoming Shows</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/calendar")}
                className="flex-row items-center gap-1"
              >
                <Text className="text-xs text-muted-foreground">See All</Text>
                <ChevronRight size={14} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View className="gap-2">
              {confirmedShows.slice(0, 2).map((show) => (
                <UpcomingShowCard key={show._id} show={show} status="confirmed" />
              ))}
              {tentativeShows.slice(0, 1).map((show) => (
                <UpcomingShowCard key={show._id} show={show} status="tentative" />
              ))}
            </View>
          </View>
        )}

        {/* Messages & Invites Preview */}
        {(hasNotifications || conversations.length > 0) && (
          <View className="mt-5">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-band" />
                <Text className="text-sm font-semibold text-foreground">Messages</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/messages")}
                className="flex-row items-center gap-1"
              >
                <Text className="text-xs text-muted-foreground">View All</Text>
                <ChevronRight size={14} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View className="gap-2">
              {/* Pending Invites */}
              {pendingCohostInvites.slice(0, 1).map((invite) => (
                <TouchableOpacity key={invite._id} onPress={() => router.push("/messages")}>
                  <Card tone="band" className="flex-row items-center gap-3 p-3">
                    <View className="h-10 w-10 rounded-[14px] bg-gradient-to-br from-band/20 to-fan/20 flex items-center justify-center flex-shrink-0">
                      <UserPlus size={20} color="#7c3aed" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-sm font-medium text-foreground truncate">
                        Co-host invite from {invite.hostBand?.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground truncate">
                        {invite.event?.title || "Untitled Gig"}
                      </Text>
                    </View>
                    <View className="w-2 h-2 rounded-full bg-band flex-shrink-0" />
                  </Card>
                </TouchableOpacity>
              ))}

              {/* Recent Conversations */}
              {conversations.slice(0, hasNotifications ? 1 : 2).map((conv) => (
                <TouchableOpacity key={conv._id} onPress={() => router.push("/messages")}>
                  <Card 
                    tone={conv.unreadCount > 0 ? "band" : "neutral"} 
                    className="flex-row items-center gap-3 p-3"
                  >
                    <View className="h-10 w-10 rounded-[14px] bg-gradient-to-br from-band/20 to-fan/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {conv.venue?.images?.[0] ? (
                        <Image source={{ uri: conv.venue.images[0] }} className="w-full h-full" resizeMode="cover" />
                      ) : (
                        <MapPin size={16} color="#7c3aed" />
                      )}
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className={cn(
                        "text-sm font-medium truncate",
                        conv.unreadCount > 0 ? "text-band" : "text-foreground"
                      )}>
                        {conv.venue?.name || "Unknown Venue"}
                      </Text>
                      <Text className="text-xs text-muted-foreground truncate">
                        {conv.lastMessagePreview || "No messages yet"}
                      </Text>
                    </View>
                    {conv.unreadCount > 0 && (
                      <View className="min-w-[20px] h-5 bg-band items-center justify-center px-1.5 rounded-full flex-shrink-0">
                        <Text className="text-white text-[10px] font-semibold">{conv.unreadCount}</Text>
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Open Dates */}
        {openDates.length > 0 && (
          <View className="mt-5">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                <Text className="text-sm font-semibold text-foreground">Open Dates</Text>
              </View>
            </View>

            <View className="gap-2">
              {openDates.slice(0, 2).map((openDate) => (
                <OpenDateCard
                  key={openDate._id}
                  openDate={openDate}
                  onApply={() => handleApply(openDate._id)}
                  isApplying={applyingOpenDateId === openDate._id}
                />
              ))}
            </View>
          </View>
        )}

        {/* Suggested Venues */}
        {suggestedVenues.length > 0 && (
          <View className="mt-5">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-band" />
                <Text className="text-sm font-semibold text-foreground">Suggested Venues</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-3 px-3">
              <View className="flex-row gap-3">
                {suggestedVenues.slice(0, 4).map((venue) => (
                  <VenueCard key={venue._id} venue={venue} />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Quick Actions */}
        <View className="mt-6 mb-8">
          <View className="flex-row gap-3">
            <QuickActionCard
              onPress={() => router.push("/calendar")}
              icon={<Calendar size={20} color="#7c3aed" />}
              title="Manage Shows"
              description="View and edit your gigs"
              color="band"
            />
            <QuickActionCard
              onPress={() => router.push("/analytics")}
              icon={<BarChart3 size={20} color="#16a34a" />}
              title="View Analytics"
              description="Track performance"
              color="emerald"
            />
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

// Sub-components

function NextShowCard({ show }: { show: any }) {
  const router = useRouter();
  const isConfirmed = show.status === "confirmed";
  const colors = isConfirmed ? STATUS_COLORS.confirmed : STATUS_COLORS.tentative;
  const displayTitle = show.title?.trim() || (isConfirmed ? "Untitled Gig" : "Untitled Tentative");

  return (
    <TouchableOpacity onPress={() => router.push(`/gig/${show._id}`)}>
      <Card className={cn("p-4", colors.border)}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-2 mb-2">
              <View className={cn("flex-row items-center gap-1 px-2 py-0.5 rounded-full", colors.bgLight)}>
                {isConfirmed ? (
                  <CheckCircle2 size={12} color={isConfirmed ? "#16a34a" : "#d97706"} />
                ) : (
                  <HelpCircle size={12} color="#d97706" />
                )}
                <Text className={cn("text-[10px] font-bold uppercase tracking-wide", colors.text)}>
                  {isConfirmed ? "Confirmed" : "Tentative"}
                </Text>
              </View>
            </View>

            <Text className="font-semibold text-foreground truncate">
              {displayTitle}
            </Text>

            <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              <View className="flex-row items-center gap-1">
                <Calendar size={14} className={colors.text} color={isConfirmed ? "#16a34a" : "#d97706"} />
                <Text className="text-xs text-muted-foreground">
                  {formatEventDate(show.dateTime)}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Clock size={14} color={isConfirmed ? "#16a34a" : "#d97706"} />
                <Text className="text-xs text-muted-foreground">
                  {formatEventTime(show.dateTime)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-1 mt-2">
              <MapPin size={14} color={isConfirmed ? "#16a34a" : "#d97706"} />
              <Text className="text-xs text-muted-foreground truncate">{show.venue?.name || "Venue TBD"}</Text>
            </View>
          </View>

          <View className={cn("h-12 w-12 rounded-[16px] items-center justify-center flex-shrink-0", colors.bgLight)}>
            <Text className={cn("text-lg font-bold", colors.text)}>
              {new Date(show.dateTime).getDate()}
            </Text>
          </View>
        </View>

        {/* RSVP Progress */}
        {show.capacity && (
          <View className="mt-4 pt-3 border-t border-border/50">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs text-muted-foreground">
                {show.rsvpCount || 0} / {show.capacity} RSVPs
              </Text>
              <Text className={cn("text-xs", colors.textDark)}>
                {Math.round(((show.rsvpCount || 0) / show.capacity) * 100)}%
              </Text>
            </View>
            <View className="h-1.5 bg-muted rounded-full overflow-hidden">
              <View 
                className={cn("h-full rounded-full", colors.bg)}
                style={{ width: `${Math.min(((show.rsvpCount || 0) / show.capacity) * 100, 100)}%` }}
              />
            </View>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

function UpcomingShowCard({ show, status }: { show: any; status: "confirmed" | "tentative" }) {
  const router = useRouter();
  const colors = status === "confirmed" ? STATUS_COLORS.confirmed : STATUS_COLORS.tentative;
  const displayTitle = show.title?.trim() || (status === "confirmed" ? "Untitled Gig" : "Untitled Tentative");

  return (
    <TouchableOpacity onPress={() => router.push(`/gig/${show._id}`)}>
      <Card className={cn("flex-row items-center gap-3 p-3", colors.border)}>
        <View className={cn("w-10 h-10 rounded-lg items-center justify-center flex-shrink-0", colors.bgLight)}>
          {status === "confirmed" ? (
            <CheckCircle2 size={20} color={colors.text === "text-emerald-500" ? "#16a34a" : "#d97706"} />
          ) : (
            <HelpCircle size={20} color="#d97706" />
          )}
        </View>

        <View className="flex-1 min-w-0">
          <Text className="text-sm font-medium text-foreground truncate">{displayTitle}</Text>
          <View className="flex-row items-center gap-3 mt-0.5">
            <Text className="text-xs text-muted-foreground">{formatEventDate(show.dateTime)}</Text>
            <Text className="text-xs text-muted-foreground truncate flex-1">{show.venue?.name || "Venue TBD"}</Text>
          </View>
        </View>

        <ChevronRight size={16} color="#9ca3af" />
      </Card>
    </TouchableOpacity>
  );
}

function QuickActionCard({
  onPress,
  icon,
  title,
  description,
  color,
}: {
  onPress: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "band" | "emerald" | "blue";
}) {
  const colorClasses = {
    band: "bg-band/10 border-band/20 active:bg-band/20",
    emerald: "bg-emerald-500/10 border-emerald-500/20 active:bg-emerald-500/20",
    blue: "bg-blue-500/10 border-blue-500/20 active:bg-blue-500/20",
  };

  return (
    <TouchableOpacity onPress={onPress} className={cn("flex-1 rounded-[18px] border p-4", colorClasses[color])}>
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-lg bg-white/50 items-center justify-center">
          {icon}
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-semibold text-foreground">{title}</Text>
          <Text className="text-xs text-muted-foreground">{description}</Text>
        </View>
        <ArrowRight size={16} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );
}

function VenueCard({ venue }: { venue: any }) {
  return (
    <Card className="w-36 flex-shrink-0 overflow-hidden p-0">
      <View className="h-20 bg-muted items-center justify-center">
        <MapPin size={24} color="#9ca3af" />
      </View>
      <View className="p-2.5">
        <Text className="font-medium text-foreground truncate text-xs">{venue.name}</Text>
        <Text className="text-[10px] text-muted-foreground truncate mt-0.5">{venue.city}</Text>
      </View>
    </Card>
  );
}

function OpenDateCard({
  openDate,
  onApply,
  isApplying,
}: {
  openDate: any;
  onApply: () => void;
  isApplying: boolean;
}) {
  return (
    <Card className="flex-row items-center justify-between p-3">
      <View className="flex-1 min-w-0">
        <Text className="font-medium text-foreground text-sm truncate">{openDate.venue?.name || "Unknown Venue"}</Text>
        <View className="flex-row items-center gap-3 mt-1">
          <View className="flex-row items-center gap-1">
            <Calendar size={12} color="#16a34a" />
            <Text className="text-xs text-muted-foreground">{formatEventDate(openDate.date)}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <MapPin size={12} color="#16a34a" />
            <Text className="text-xs text-muted-foreground">{openDate.venue?.city || "Unknown"}</Text>
          </View>
        </View>
        {openDate.offeredPay && (
          <Text className="text-xs text-emerald-600 font-medium mt-1">{formatPrice(openDate.offeredPay)}</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={onApply}
        disabled={isApplying}
        className={cn(
          "px-4 py-2 rounded-lg",
          isApplying ? "bg-muted" : "bg-emerald-500"
        )}
      >
        <Text className={cn("text-xs font-medium", isApplying ? "text-muted-foreground" : "text-white")}>
          {isApplying ? "..." : "Apply"}
        </Text>
      </TouchableOpacity>
    </Card>
  );
}

function CreateBandPrompt() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center p-6 relative overflow-hidden">
      {/* Background accent */}
      <View className="absolute top-0 left-0 h-72 w-72 rounded-full bg-band/10 blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <View className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-band/5 blur-3xl translate-x-1/2 translate-y-1/2" />

      <View className="items-center max-w-sm relative z-10">
        {/* Icon */}
        <View className="relative mb-6 h-24 w-24 items-center justify-center rounded-[18px] border border-band">
          <View className="absolute inset-0 rounded-[18px] bg-band/5" />
          <Music size={48} color="#7c3aed" />
        </View>

        <Text className="text-2xl font-semibold text-foreground mb-3 text-center">
          Create Your Band Profile
        </Text>
        <Text className="text-muted-foreground mb-8 text-sm text-center leading-relaxed">
          Set up your band to start finding gigs, managing shows, and growing your fanbase.
        </Text>

        <Button
          label="Get Started"
          tone="band"
          onPress={() => router.push("/profile")}
        />

        <Text className="mt-8 text-muted-foreground text-xs">Takes less than 2 minutes</Text>
      </View>
    </View>
  );
}

function DashboardSkeleton() {
  return (
    <View className="relative">
      {/* Header Skeleton */}
      <View className="rounded-[20px] border border-border bg-card p-4 animate-shimmer">
        <View className="flex-row items-start gap-4">
          <View className="h-16 w-16 rounded-[18px] bg-muted" />
          <View className="flex-1 space-y-2">
            <View className="h-6 w-32 bg-muted rounded" />
            <View className="h-4 w-48 bg-muted rounded" />
            <View className="flex-row gap-4 mt-4">
              <View className="h-4 w-16 bg-muted rounded" />
              <View className="h-4 w-16 bg-muted rounded" />
              <View className="h-4 w-16 bg-muted rounded" />
            </View>
          </View>
        </View>
      </View>

      {/* Stats Skeleton */}
      <View className="flex-row gap-3 mt-5">
        {[...Array(2)].map((_, i) => (
          <View key={i} className="flex-1 rounded-[18px] border border-border bg-card p-4 animate-shimmer">
            <View className="w-8 h-8 bg-muted rounded-lg mb-2" />
            <View className="h-6 w-12 bg-muted rounded" />
            <View className="h-3 w-20 bg-muted rounded mt-1" />
          </View>
        ))}
      </View>

      {/* Section Skeleton */}
      <View className="mt-5 rounded-[20px] border border-border bg-card p-4 animate-shimmer">
        <View className="h-5 w-32 bg-muted rounded mb-3" />
        <View className="gap-2">
          <View className="h-16 bg-muted rounded-lg" />
          <View className="h-16 bg-muted rounded-lg" />
        </View>
      </View>
    </View>
  );
}
