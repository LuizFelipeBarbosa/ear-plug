"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  TrendingUp,
  MapPin,
  ChevronRight,
  DollarSign,
  Music,
  ArrowUpRight,
  Sparkles,
  Plus,
  MessageCircle,
  Mail,
  BarChart3,
  Clock,
  CheckCircle2,
  HelpCircle,
  UserPlus,
  ArrowRight,
  Bell,
} from "lucide-react";
import { useBandPastShows, useCurrentBand, useBandAnalytics } from "@/hooks/useBand";
import { useProfileContext } from "@/hooks/useProfileContext";
import { useBandConversations } from "@/hooks/useMessages";
import { useSuggestedVenues, useOpenDates } from "@/hooks/useVenues";
import { CreateBandForm } from "@/components/band/CreateBandForm";
import { PastShowFlyerSection } from "@/components/events/PastShowFlyerSection";
import { formatEventDate, formatPrice, formatEventTime } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { panelFade } from "@/lib/motion/presets";

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

export function BandDashboard() {
  const { bandWithStats, isLoading } = useCurrentBand();
  const { bands } = useProfileContext();
  const activeMembership = bands.find(
    (entry) => entry.band._id === bandWithStats?._id,
  );
  const canManageShows =
    activeMembership?.membership.role === "owner" ||
    activeMembership?.membership.role === "admin";

  const { pastShows, isLoading: isPastShowsLoading } = useBandPastShows(
    bandWithStats?._id,
  );

  // Get upcoming shows for the band (from calendar tab data)
  const upcomingEvents = useQuery(
    api.events.listByBand,
    bandWithStats?._id ? { bandId: bandWithStats._id, includesPast: false } : "skip",
  );

  // Get conversations data for notifications
  const { conversations, unreadCount, pendingCohostInvites, isLoading: conversationsLoading } = 
    useBandConversations(bandWithStats?._id);

  // Get analytics data
  const { analytics, isLoading: analyticsLoading } = useBandAnalytics(bandWithStats?._id);

  // Get suggested venues
  const { venues: suggestedVenues, isLoading: venuesLoading } = useSuggestedVenues(
    bandWithStats?.genres?.[0],
  );

  // Get open dates
  const { openDates, isLoading: datesLoading, applyToOpenDate } = useOpenDates({
    genre: bandWithStats?.genres?.[0],
    limit: 3,
  });

  const [applyingTo, setApplyingTo] = useState<string | null>(null);

  // Process upcoming events
  const { confirmedShows, tentativeShows, nextShow } = useMemo(() => {
    if (!upcomingEvents) {
      return { confirmedShows: [], tentativeShows: [], nextShow: null };
    }

    const scheduled = upcomingEvents.filter((e) => typeof e.dateTime === "number");
    const confirmed = scheduled.filter((e) => e.status === "confirmed");
    const tentative = scheduled.filter((e) => e.status === "hold");

    // Sort by date
    confirmed.sort((a, b) => (a.dateTime as number) - (b.dateTime as number));
    tentative.sort((a, b) => (a.dateTime as number) - (b.dateTime as number));

    // Next show is the earliest confirmed or tentative
    const next = confirmed[0] || tentative[0] || null;

    return {
      confirmedShows: confirmed.slice(0, 3),
      tentativeShows: tentative.slice(0, 2),
      nextShow: next,
    };
  }, [upcomingEvents]);

  const handleApply = async (openDateId: string) => {
    if (!bandWithStats || !canManageShows) return;

    setApplyingTo(openDateId);
    try {
      await applyToOpenDate({
        openDateId: openDateId as any,
        bandId: bandWithStats._id,
      });
    } catch (err) {
      console.error("Failed to apply:", err);
    } finally {
      setApplyingTo(null);
    }
  };

  const isPageLoading = 
    isLoading || 
    conversationsLoading || 
    analyticsLoading;

  if (isPageLoading) {
    return <DashboardSkeleton />;
  }

  if (!bandWithStats) {
    return <CreateBandPrompt />;
  }

  const hasNotifications = unreadCount > 0 || pendingCohostInvites.length > 0;
  const totalNotifications = unreadCount + pendingCohostInvites.length;

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header Background */}
      <div className="relative h-24 overflow-hidden sm:h-64">
        <div className="absolute inset-0 bg-gradient-to-b from-band/10 via-band/5 to-transparent h-64" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-band/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3" />
      </div>

      {/* Main Content */}
      <motion.main
        variants={panelFade}
        initial="hidden"
        animate="visible"
        className="relative mx-auto w-full max-w-5xl px-4 pt-4 sm:-mt-56 sm:pt-0"
      >
        {/* Band Header Card */}
        <motion.div
          variants={panelFade}
          className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
        >
          <div className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {/* Band Image */}
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-band/20 to-fan/20 border border-band/20">
                {bandWithStats.image ? (
                  <Image
                    src={bandWithStats.image}
                    alt={bandWithStats.name}
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-8 h-8 text-band/50" />
                  </div>
                )}
              </div>

              {/* Band Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-foreground truncate">
                      {bandWithStats.name}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {bandWithStats.genres
                        ?.map((g) => g.charAt(0).toUpperCase() + g.slice(1))
                        .join(" • ") || "No genre"}
                      {bandWithStats.location && ` • ${bandWithStats.location}`}
                    </p>
                  </div>

                  {/* Role Badge */}
                  <span className={cn(
                    "text-[10px] font-bold   px-2 py-1 rounded-full flex-shrink-0",
                    activeMembership?.membership.role === "owner"
                      ? "bg-band/10 text-band border border-band/20"
                      : "bg-muted text-muted-foreground border border-border"
                  )}>
                    {activeMembership?.membership.role}
                  </span>
                </div>

                {/* Quick Stats Row */}
                <div className="mt-4 grid grid-cols-1 gap-3 text-sm min-[360px]:grid-cols-2 sm:grid-cols-3">
                  <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {bandWithStats.stats.showsThisMonth}
                    </span>
                    <span className="text-xs text-muted-foreground">shows</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 min-w-0">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {bandWithStats.stats.totalRsvps}
                    </span>
                    <span className="text-xs text-muted-foreground">RSVPs</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 min-w-0">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      +{bandWithStats.stats.newFans}
                    </span>
                    <span className="text-xs text-muted-foreground">fans</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col gap-3 border-t border-border/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {hasNotifications && (
                <Link
                  href="/messages"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-band/10 text-band text-xs font-medium rounded-lg hover:bg-band/20 transition-colors"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {totalNotifications} new
                </Link>
              )}
              {confirmedShows.length > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 text-xs font-medium rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {confirmedShows.length} confirmed
                </span>
              )}
            </div>

            {canManageShows && (
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-band hover:text-band/80 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Gig
              </Link>
            )}
          </div>
        </motion.div>

        {/* Next Show Highlight */}
        {nextShow && (
          <motion.div variants={panelFade} className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-band" />
                <h2 className="text-sm font-semibold text-foreground">Next Up</h2>
              </div>
              <Link
                href="/calendar"
                className="text-xs text-muted-foreground hover:text-band transition-colors flex items-center gap-1"
              >
                View Calendar
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <NextShowCard show={nextShow} />
          </motion.div>
        )}

        {/* Stats Overview */}
        <motion.div variants={panelFade} className="mt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-band" />
              <h2 className="text-sm font-semibold text-foreground">Performance</h2>
            </div>
            <Link
              href="/analytics"
              className="text-xs text-muted-foreground hover:text-band transition-colors flex items-center gap-1"
            >
              Full Analytics
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard
              icon={<Users className="w-4 h-4" />}
              value={analytics?.totalRsvps ?? 0}
              label="Total RSVPs"
              trend={analytics?.totalRsvps && analytics.totalRsvps > 10 ? "up" : undefined}
              color="primary"
            />
            <StatCard
              icon={<Calendar className="w-4 h-4" />}
              value={analytics?.eventCount ?? bandWithStats.stats.showsThisMonth}
              label="Total Shows"
              color="secondary"
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4" />}
              value={Number.isFinite(analytics?.averageAttendancePerShow)
                ? analytics!.averageAttendancePerShow.toFixed(1)
                : "0.0"}
              suffix=""
              label="Avg Attendance"
              color="accent"
            />
            <StatCard
              icon={<Mail className="w-4 h-4" />}
              value={unreadCount}
              label="Unread Messages"
              color="muted"
              highlight={unreadCount > 0}
            />
          </div>

          {analytics?.pollSnapshot ? (
            <div className="mt-3 rounded-2xl border border-band/20 bg-gradient-to-br from-band/10 via-card to-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-band/15 text-band">
                      <HelpCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Poll Snapshot
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {analytics.pollSnapshot.eventTitle}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {analytics.pollSnapshot.question}
                  </p>
                </div>
                <Link
                  href="/analytics"
                  className="inline-flex items-center gap-1 text-xs font-medium text-band transition-colors hover:text-band/80"
                >
                  View poll details
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-card/80 px-3 py-3">
                  <p className="text-xl font-bold text-foreground">
                    {analytics.pollSnapshot.responseCount}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Responses</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/80 px-3 py-3">
                  <p className="text-xl font-bold text-foreground">
                    {Math.round(analytics.pollSnapshot.responseRate)}%
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Response rate</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/80 px-3 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    {analytics.pollSnapshot.topOption?.label ?? "No answers yet"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {analytics.pollSnapshot.topOption
                      ? `${analytics.pollSnapshot.topOption.count} picks`
                      : `${analytics.pollSnapshot.eligibleRsvpCount} RSVP${analytics.pollSnapshot.eligibleRsvpCount === 1 ? "" : "s"} eligible`}
                  </p>
                </div>
              </div>

              {analytics.pollSnapshot.topOption ? (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>Leading answer</span>
                    <span>
                      {Math.round(analytics.pollSnapshot.topOption.percentage)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-band"
                      style={{
                        width: `${Math.max(
                          8,
                          Math.round(analytics.pollSnapshot.topOption.percentage),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </motion.div>

        {/* Upcoming Shows Preview */}
        {(confirmedShows.length > 0 || tentativeShows.length > 0) && (
          <motion.div variants={panelFade} className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-band" />
                <h2 className="text-sm font-semibold text-foreground">Upcoming Shows</h2>
              </div>
              <Link
                href="/calendar"
                className="text-xs text-muted-foreground hover:text-band transition-colors flex items-center gap-1"
              >
                See All
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2">
              {confirmedShows.slice(0, 2).map((show) => (
                <div key={show._id}>
                  <UpcomingShowCard show={show} status="confirmed" />
                </div>
              ))}
              {tentativeShows.slice(0, 1).map((show) => (
                <div key={show._id}>
                  <UpcomingShowCard show={show} status="tentative" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages & Invites Preview */}
        {(hasNotifications || conversations.length > 0) && (
          <motion.div variants={panelFade} className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-band" />
                <h2 className="text-sm font-semibold text-foreground">Messages</h2>
              </div>
              <Link
                href="/messages"
                className="text-xs text-muted-foreground hover:text-band transition-colors flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2">
              {/* Pending Invites */}
              {pendingCohostInvites.slice(0, 1).map((invite) => (
                <Link key={invite._id} href="/messages">
                  <div className="rounded-xl border border-band/20 bg-card p-3 transition-colors hover:bg-muted/50">
                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-band/20 to-fan/20 flex items-center justify-center flex-shrink-0">
                        <UserPlus className="w-5 h-5 text-band" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          Co-host invite from {invite.hostBand?.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {invite.event?.title || "Untitled Gig"}
                        </p>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-band flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              ))}

              {/* Recent Conversations */}
              {conversations.slice(0, hasNotifications ? 1 : 2).map((conv) => (
                <Link key={conv._id} href="/messages">
                  <div className={cn(
                    "bg-card border p-3 rounded-xl hover:bg-muted/50 transition-colors",
                    conv.unreadCount > 0 ? "border-band/20" : "border-border"
                  )}>
                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-band/20 to-fan/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {conv.venue?.images?.[0] ? (
                          <Image
                            src={conv.venue.images[0]}
                            alt={conv.venue.name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <MapPin className="w-4 h-4 text-band/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          conv.unreadCount > 0 ? "text-band" : "text-foreground"
                        )}>
                          {conv.venue?.name || "Unknown Venue"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessagePreview || "No messages yet"}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="min-w-[20px] h-5 bg-band text-white text-[10px] font-semibold flex items-center justify-center px-1.5 rounded-full flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Open Dates */}
        {openDates.length > 0 && canManageShows && (
          <motion.div variants={panelFade} className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-foreground">Open Dates</h2>
              </div>
            </div>

            <div className="space-y-2">
              {openDates.slice(0, 2).map((openDate) => (
                <OpenDateCard
                  key={openDate._id}
                  openDate={openDate}
                  onApply={() => handleApply(openDate._id)}
                  isApplying={applyingTo === openDate._id}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Suggested Venues */}
        {suggestedVenues.length > 0 && (
          <motion.div variants={panelFade} className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-band" />
                <h2 className="text-sm font-semibold text-foreground">Suggested Venues</h2>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
              {suggestedVenues.slice(0, 4).map((venue) => (
                <VenueCard key={venue._id} venue={venue} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Past Shows */}
        {pastShows.length > 0 && (
          <motion.div variants={panelFade} className="mt-5">
            <PastShowFlyerSection
              shows={pastShows}
              emptyMessage="No past shows yet."
              maxItems={4}
              isLoading={isPastShowsLoading}
              title="Recent Shows"
            />
          </motion.div>
        )}

        {/* Quick Actions Footer */}
        <motion.div variants={panelFade} className="mt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <QuickActionCard
              href="/calendar"
              icon={<Calendar className="w-5 h-5" />}
              title="Manage Shows"
              description="View and edit your gigs"
              color="band"
            />
            <QuickActionCard
              href="/analytics"
              icon={<BarChart3 className="w-5 h-5" />}
              title="View Analytics"
              description="Track performance"
              color="emerald"
            />
          </div>
        </motion.div>
      </motion.main>
    </div>
  );
}

// Sub-components

function NextShowCard({ show }: { show: any }) {
  const isConfirmed = show.status === "confirmed";
  const colors = isConfirmed ? STATUS_COLORS.confirmed : STATUS_COLORS.tentative;
  const displayTitle = show.title?.trim() || (isConfirmed ? "Untitled Gig" : "Untitled Tentative");

  return (
    <Link href={`/gig/${show._id}`}>
      <div className={cn(
        "bg-card border p-4 rounded-xl transition-colors transition-shadow hover:shadow-md",
        colors.border
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold   rounded-full",
                colors.bgLight,
                colors.text
              )}>
                {isConfirmed ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <HelpCircle className="w-3 h-3" />
                )}
                {isConfirmed ? "Confirmed" : "Tentative"}
              </span>
            </div>

            <h3 className="font-semibold text-foreground truncate">
              {displayTitle}
            </h3>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className={cn("w-3.5 h-3.5", colors.text)} />
                {formatEventDate(show.dateTime)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className={cn("w-3.5 h-3.5", colors.text)} />
                {formatEventTime(show.dateTime)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <MapPin className={cn("w-3.5 h-3.5", colors.text)} />
              <span className="truncate">{show.venue?.name || "Venue TBD"}</span>
            </div>
          </div>

          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            colors.bgLight
          )}>
            <span className={cn("text-lg font-bold", colors.text)}>
              {new Date(show.dateTime).getDate()}
            </span>
          </div>
        </div>

        {/* RSVP Progress */}
        {show.capacity && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">
                {show.rsvpCount || 0} / {show.capacity} RSVPs
              </span>
              <span className={colors.textDark}>
                {Math.round(((show.rsvpCount || 0) / show.capacity) * 100)}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((show.rsvpCount || 0) / show.capacity) * 100, 100)}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className={cn("h-full rounded-full", colors.bg)}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function UpcomingShowCard({ show, status }: { show: any; status: "confirmed" | "tentative" }) {
  const colors = status === "confirmed" ? STATUS_COLORS.confirmed : STATUS_COLORS.tentative;
  const displayTitle = show.title?.trim() || (status === "confirmed" ? "Untitled Gig" : "Untitled Tentative");

  return (
    <Link href={`/gig/${show._id}`}>
      <div className={cn(
        "bg-card border p-3 rounded-xl flex items-center gap-3 transition-colors hover:bg-muted/50",
        colors.border
      )}>
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
          colors.bgLight
        )}>
          {status === "confirmed" ? (
            <CheckCircle2 className={cn("w-5 h-5", colors.text)} />
          ) : (
            <HelpCircle className={cn("w-5 h-5", colors.text)} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {displayTitle}
          </p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{formatEventDate(show.dateTime)}</span>
            <span className="truncate">{show.venue?.name || "Venue TBD"}</span>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </Link>
  );
}

function StatCard({
  icon,
  value,
  label,
  suffix = "",
  trend,
  color = "primary",
  highlight = false,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  suffix?: string;
  trend?: "up" | "down";
  color?: "primary" | "secondary" | "accent" | "muted";
  highlight?: boolean;
}) {
  const colorClasses = {
    primary: "from-band/20 to-band/5 text-band",
    secondary: "from-blue-500/20 to-blue-500/5 text-blue-500",
    accent: "from-emerald-500/20 to-emerald-500/5 text-emerald-500",
    muted: "from-muted to-muted/50 text-muted-foreground",
  };

  return (
    <div
      className={cn(
        "relative bg-card border p-4 rounded-xl overflow-hidden group",
        highlight ? "border-band/30" : "border-border"
      )}
    >
      {/* Background gradient on hover */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity",
          colorClasses[color],
        )}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div
            className={cn(
              "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
              colorClasses[color],
            )}
          >
            {icon}
          </div>
          {trend && <ArrowUpRight className="w-4 h-4 text-band" />}
        </div>
        <p className="text-2xl font-bold text-foreground">
          {value}
          {suffix && <span className="text-base text-muted-foreground ml-0.5">{suffix}</span>}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "band" | "emerald" | "blue";
}) {
  const colorClasses = {
    band: "bg-band/10 text-band border-band/20 hover:bg-band/20",
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20",
  };

  return (
    <Link href={href}>
      <div
        className={cn(
          "p-4 rounded-xl border transition-colors",
          colorClasses[color]
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/50 flex items-center justify-center">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}

function VenueCard({ venue }: { venue: any }) {
  return (
    <div className="w-36 flex-shrink-0 bg-card border border-border rounded-xl overflow-hidden hover:border-band/30 transition-colors">
      <div className="h-20 relative bg-muted">
        {venue.images?.[0] ? (
          <Image
            src={venue.images[0]}
            alt={venue.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-card flex items-center justify-center">
            <MapPin className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="font-medium text-foreground truncate text-xs">
          {venue.name}
        </h3>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
          {venue.city}
        </p>
      </div>
    </div>
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
    <div className="bg-card border border-border p-3 rounded-xl flex items-center justify-between hover:border-emerald-500/30 transition-colors">
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground text-sm truncate">
          {openDate.venue?.name || "Unknown Venue"}
        </h3>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-emerald-500" />
            {formatEventDate(openDate.date)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-500" />
            {openDate.venue?.city || "Unknown"}
          </span>
        </div>
        {openDate.offeredPay && (
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {formatPrice(openDate.offeredPay)}
          </p>
        )}
      </div>
      <button
        onClick={onApply}
        disabled={isApplying}
        className={cn(
          "px-4 py-2 text-xs font-medium rounded-lg transition-colors",
          isApplying
            ? "bg-muted text-muted-foreground"
            : "bg-emerald-500 text-white hover:bg-emerald-600"
        )}
      >
        {isApplying ? "..." : "Apply"}
      </button>
    </div>
  );
}

function CreateBandPrompt() {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return <CreateBandForm />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-band/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-band/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md relative z-10"
      >
        {/* Icon */}
        <div className="w-24 h-24 border border-band flex items-center justify-center mx-auto mb-6 relative rounded-xl">
          <div className="absolute inset-0 bg-band/5 animate-pulse rounded-xl" />
          <Music className="w-12 h-12 text-band relative z-10" />
        </div>

        <h2 className="text-2xl font-semibold text-foreground mb-3">
          Create Your Band Profile
        </h2>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          Set up your band to start finding gigs, managing shows, and growing
          your fanbase.
        </p>

        <button
          onClick={() => setShowForm(true)}
          className="inline-block px-10 py-4 bg-band text-foreground font-medium text-sm border border-band hover:bg-transparent hover:text-band transition-colors rounded-xl"
        >
          Get Started
        </button>

        <p className="mt-8 text-muted-foreground text-xs">
          Takes less than 2 minutes
        </p>
      </motion.div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="relative h-24 overflow-hidden sm:h-64">
        <div className="absolute inset-0 bg-gradient-to-b from-band/10 via-band/5 to-transparent h-64" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl space-y-5 px-4 pt-4 sm:-mt-56 sm:pt-0">
        {/* Header Skeleton */}
        <div className="bg-card border border-border rounded-2xl p-5 animate-shimmer">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-32 bg-muted rounded" />
              <div className="h-4 w-48 bg-muted rounded" />
              <div className="flex gap-4 mt-4">
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border p-4 rounded-xl animate-shimmer">
              <div className="w-8 h-8 bg-muted rounded-lg mb-2" />
              <div className="h-6 w-12 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded mt-1" />
            </div>
          ))}
        </div>

        {/* Section Skeleton */}
        <div className="bg-card border border-border rounded-2xl p-4 animate-shimmer">
          <div className="h-5 w-32 bg-muted rounded mb-3" />
          <div className="space-y-2">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
