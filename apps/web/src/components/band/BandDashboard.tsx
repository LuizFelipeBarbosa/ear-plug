"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Calendar,
  Users,
  TrendingUp,
  MapPin,
  ChevronRight,
  DollarSign,
  Music,
  ArrowUpRight,
} from "lucide-react";
import { useBandPastShows, useCurrentBand } from "@/hooks/useBand";
import { useProfileContext } from "@/hooks/useProfileContext";
import { useSuggestedVenues, useOpenDates } from "@/hooks/useVenues";
import { CreateBandForm } from "@/components/band/CreateBandForm";
import { PastShowFlyerSection } from "@/components/events/PastShowFlyerSection";
import { formatEventDate, formatPrice } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";

export function BandDashboard() {
  const { bandWithStats, isLoading } = useCurrentBand();
  const { pastShows, isLoading: isPastShowsLoading } = useBandPastShows(
    bandWithStats?._id,
  );
  const { bands } = useProfileContext();
  const { venues: suggestedVenues, isLoading: venuesLoading } =
    useSuggestedVenues(
      bandWithStats?.genres?.[0], // Use first genre for venue suggestions
    );
  const {
    openDates,
    isLoading: datesLoading,
    applyToOpenDate,
  } = useOpenDates({
    genre: bandWithStats?.genres?.[0], // Use first genre for open dates
    limit: 5,
  });

  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const activeMembership = bands.find(
    (entry) => entry.band._id === bandWithStats?._id,
  );
  const canApplyToOpenDates =
    activeMembership?.membership.role === "owner" ||
    activeMembership?.membership.role === "admin";

  const handleApply = async (openDateId: string) => {
    if (!bandWithStats || !canApplyToOpenDates) return;

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

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 bg-background">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted w-1/2 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted border border-border rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!bandWithStats) {
    return <CreateBandPrompt />;
  }

  return (
    <div className="min-h-screen pb-6 bg-background">
      {/* Header */}
      <header className="relative bg-card border-b border-band/20 p-6 overflow-hidden">
        {/* Subtle gradient accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-band/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 overflow-hidden bg-muted border border-band/30 rounded-lg">
              {bandWithStats.image ? (
                <Image
                  src={bandWithStats.image}
                  alt={bandWithStats.name}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-muted to-card flex items-center justify-center">
                  <Music className="w-8 h-8 text-band" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {bandWithStats.name}
              </h1>
              <p className="text-muted-foreground text-sm">
                {bandWithStats.genres
                  ?.map((g) => g.charAt(0).toUpperCase() + g.slice(1))
                  .join(" • ") || "No genre"}{" "}
                • {bandWithStats.location}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<Calendar className="w-5 h-5 text-band" />}
              value={bandWithStats.stats.showsThisMonth}
              label="Shows This Month"
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-band" />}
              value={bandWithStats.stats.totalRsvps}
              label="Total RSVPs"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5 text-band" />}
              value={bandWithStats.stats.newFans}
              label="New Fans"
              trend="up"
            />
          </div>
        </div>
      </header>

      <section className="p-4">
        <PastShowFlyerSection
          shows={pastShows}
          emptyMessage="No past shows yet."
          isLoading={isPastShowsLoading}
        />
      </section>

      {/* Suggested Venues */}
      <section className="p-4 mt-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">
            Suggested Venues
          </h2>
          <button className="text-band text-sm font-medium flex items-center gap-1 hover:underline">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {venuesLoading
            ? [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-48 h-32 bg-muted border border-border animate-shimmer flex-shrink-0 rounded-lg"
                />
              ))
            : suggestedVenues.map((venue) => (
                <VenueCard key={venue._id} venue={venue} />
              ))}
        </div>
      </section>

      {/* Open Dates */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Open Dates</h2>
          <button className="text-band text-sm font-medium flex items-center gap-1 hover:underline">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!canApplyToOpenDates && (
          <p className="text-xs text-muted-foreground mb-3">
            Member access: owners/admins can apply.
          </p>
        )}

        <div className="space-y-3">
          {datesLoading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-muted border border-border animate-shimmer rounded-lg"
              />
            ))
          ) : openDates.length > 0 ? (
            openDates.map((openDate) => (
              <OpenDateCard
                key={openDate._id}
                openDate={openDate}
                onApply={() => handleApply(openDate._id)}
                isApplying={applyingTo === openDate._id}
                canApply={canApplyToOpenDates}
              />
            ))
          ) : (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">
                No open dates matching your genre right now
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  trend,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  trend?: "up" | "down";
}) {
  return (
    <div className="bg-muted border border-border p-3 text-center relative overflow-hidden group hover:border-band/30 transition-colors rounded-lg">
      {/* Subtle accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-band" />

      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-2xl font-semibold text-foreground flex items-center justify-center gap-1">
        {value}
        {trend && (
          <ArrowUpRight className="w-4 h-4 text-band" />
        )}
      </div>
      <div className="text-xs text-muted-foreground font-medium">
        {label}
      </div>
    </div>
  );
}

function VenueCard({ venue }: { venue: any }) {
  return (
    <div className="w-48 flex-shrink-0 bg-muted border border-border overflow-hidden group hover:border-band/30 transition-all rounded-lg">
      <div className="h-24 relative bg-muted">
        {venue.images?.[0] ? (
          <Image
            src={venue.images[0]}
            alt={venue.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-card flex items-center justify-center">
            <MapPin className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-foreground truncate text-sm">
          {venue.name}
        </h3>
        <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{venue.city}</span>
        </div>
        <p className="text-xs text-band font-medium mt-1">
          Cap: {venue.capacity}
        </p>
      </div>
    </div>
  );
}

function OpenDateCard({
  openDate,
  onApply,
  isApplying,
  canApply,
}: {
  openDate: any;
  onApply: () => void;
  isApplying: boolean;
  canApply: boolean;
}) {
  return (
    <div className="bg-muted border border-border p-4 flex items-center justify-between group hover:border-band/20 transition-colors rounded-lg">
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground text-sm">
          {openDate.venue?.name || "Unknown Venue"}
        </h3>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-band" />
            {formatEventDate(openDate.date)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-band" />
            {openDate.venue?.city || "Unknown"}
          </span>
        </div>
        {openDate.offeredPay && (
          <div className="flex items-center gap-1 text-band text-xs mt-2 font-medium">
            <DollarSign className="w-3.5 h-3.5" />
            <span>{formatPrice(openDate.offeredPay)}</span>
          </div>
        )}
      </div>
      <button
        onClick={onApply}
        disabled={isApplying || !canApply}
        className={cn(
          "px-5 py-2.5 font-medium text-xs transition-all touch-target rounded-lg",
          isApplying || !canApply
            ? "bg-muted text-muted-foreground border border-border"
            : "bg-band text-foreground border border-band hover:bg-transparent hover:text-band",
        )}
      >
        {isApplying ? "Applying..." : canApply ? "Apply" : "Read only"}
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

      <div className="text-center max-w-md relative z-10">
        {/* Icon */}
        <div className="w-24 h-24 border border-band flex items-center justify-center mx-auto mb-6 relative rounded-lg">
          <div className="absolute inset-0 bg-band/5 animate-pulse-band rounded-lg" />
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
          className="inline-block px-10 py-4 bg-band text-foreground font-medium text-sm border border-band hover:bg-transparent hover:text-band transition-all rounded-lg"
        >
          Get Started
        </button>

        <p className="mt-8 text-muted-foreground text-xs">
          Takes less than 2 minutes
        </p>
      </div>
    </div>
  );
}
