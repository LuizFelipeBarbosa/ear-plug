"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { useCurrentBand } from "@/hooks/useBand";
import { useSuggestedVenues, useOpenDates } from "@/hooks/useVenues";
import { CreateBandForm } from "@/components/band/CreateBandForm";
import { formatEventDate, formatPrice } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";

export function BandDashboard() {
  const { bandWithStats, isLoading } = useCurrentBand();
  const { venues: suggestedVenues, isLoading: venuesLoading } = useSuggestedVenues(
    bandWithStats?.genres?.[0] // Use first genre for venue suggestions
  );
  const { openDates, isLoading: datesLoading, applyToOpenDate } = useOpenDates({
    genre: bandWithStats?.genres?.[0], // Use first genre for open dates
    limit: 5,
  });

  const [applyingTo, setApplyingTo] = useState<string | null>(null);

  const handleApply = async (openDateId: string) => {
    if (!bandWithStats) return;

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
      <div className="min-h-screen p-4 bg-night">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-night-tertiary w-1/2" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-night-tertiary border-2 border-zinc-800" />
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
    <div className="min-h-screen pb-6 bg-night">
      {/* Header - Dark with Gradient Accent */}
      <header className="relative bg-night-secondary border-b-2 border-lime/20 p-6 overflow-hidden">
        {/* Subtle gradient accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 overflow-hidden bg-night-tertiary border-2 border-lime/30">
              {bandWithStats.image ? (
                <Image
                  src={bandWithStats.image}
                  alt={bandWithStats.name}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet/30 to-lime/30 flex items-center justify-center">
                  <Music className="w-8 h-8 text-lime" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
                {bandWithStats.name}
              </h1>
              <p className="text-zinc-400 text-sm">
                {bandWithStats.genres?.map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(" • ") || "No genre"} •{" "}
                {bandWithStats.location}
              </p>
            </div>
          </div>

          {/* Stats Grid - Clean with Violet Accents */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<Calendar className="w-5 h-5 text-lime" />}
              value={bandWithStats.stats.showsThisMonth}
              label="Shows This Month"
              accent="lime"
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-violet" />}
              value={bandWithStats.stats.totalRsvps}
              label="Total RSVPs"
              accent="violet"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5 text-lime" />}
              value={bandWithStats.stats.newFans}
              label="New Fans"
              accent="lime"
              trend="up"
            />
          </div>
        </div>
      </header>

      {/* Suggested Venues */}
      <section className="p-4 mt-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold uppercase tracking-tight text-white">
            Suggested Venues
          </h2>
          <button className="text-lime text-sm font-bold uppercase tracking-wider flex items-center gap-1 hover:underline">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {venuesLoading
            ? [1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-48 h-32 bg-night-tertiary border-2 border-zinc-800 animate-shimmer flex-shrink-0"
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
          <h2 className="text-lg font-bold uppercase tracking-tight text-white">
            Open Dates
          </h2>
          <button className="text-lime text-sm font-bold uppercase tracking-wider flex items-center gap-1 hover:underline">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {datesLoading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-night-tertiary border-2 border-zinc-800 animate-shimmer"
              />
            ))
          ) : openDates.length > 0 ? (
            openDates.map((openDate) => (
              <OpenDateCard
                key={openDate._id}
                openDate={openDate}
                onApply={() => handleApply(openDate._id)}
                isApplying={applyingTo === openDate._id}
              />
            ))
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-zinc-800">
              <p className="text-zinc-500">
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
  accent = "lime",
  trend,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accent?: "lime" | "violet";
  trend?: "up" | "down";
}) {
  return (
    <div className="bg-night-tertiary border-2 border-zinc-800 p-3 text-center relative overflow-hidden group hover:border-lime/30 transition-colors">
      {/* Subtle accent line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-0.5",
        accent === "lime" ? "bg-lime" : "bg-violet"
      )} />
      
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white flex items-center justify-center gap-1">
        {value}
        {trend && (
          <ArrowUpRight className={cn(
            "w-4 h-4",
            accent === "lime" ? "text-lime" : "text-violet"
          )} />
        )}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
        {label}
      </div>
    </div>
  );
}

function VenueCard({ venue }: { venue: any }) {
  return (
    <div className="w-48 flex-shrink-0 bg-night-tertiary border-2 border-zinc-800 overflow-hidden group hover:border-lime/30 transition-all">
      <div className="h-24 relative bg-zinc-800">
        {venue.images?.[0] ? (
          <Image
            src={venue.images[0]}
            alt={venue.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet/20 to-lime/20 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-zinc-600" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-bold text-white truncate text-sm uppercase tracking-wide">
          {venue.name}
        </h3>
        <div className="flex items-center gap-1 text-zinc-500 text-xs mt-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{venue.city}</span>
        </div>
        <p className="text-xs text-violet font-medium mt-1 uppercase">
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
}: {
  openDate: any;
  onApply: () => void;
  isApplying: boolean;
}) {
  return (
    <div className="bg-night-tertiary border-2 border-zinc-800 p-4 flex items-center justify-between group hover:border-lime/20 transition-colors">
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white uppercase tracking-wide text-sm">
          {openDate.venue?.name || "Unknown Venue"}
        </h3>
        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-lime" />
            {formatEventDate(openDate.date)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-violet" />
            {openDate.venue?.city || "Unknown"}
          </span>
        </div>
        {openDate.offeredPay && (
          <div className="flex items-center gap-1 text-lime text-xs mt-2 font-medium">
            <DollarSign className="w-3.5 h-3.5" />
            <span>{formatPrice(openDate.offeredPay)}</span>
          </div>
        )}
      </div>
      <button
        onClick={onApply}
        disabled={isApplying}
        className={cn(
          "px-5 py-2.5 font-bold uppercase text-xs tracking-wider transition-all touch-target",
          isApplying
            ? "bg-zinc-800 text-zinc-500 border-2 border-zinc-800"
            : "bg-lime text-night border-2 border-lime hover:bg-transparent hover:text-lime"
        )}
      >
        {isApplying ? "Applying..." : "Apply"}
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-night relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-violet/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-lime/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="text-center max-w-md relative z-10">
        {/* Icon with glow effect */}
        <div className="w-24 h-24 border-2 border-lime flex items-center justify-center mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-lime/5 animate-pulse-lime" />
          <Music className="w-12 h-12 text-lime relative z-10" />
        </div>
        
        <h2 className="text-3xl font-bold text-white uppercase tracking-tight mb-3">
          Create Your Band Profile
        </h2>
        <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
          Set up your band to start finding gigs, managing shows, and growing your fanbase.
        </p>
        
        <button
          onClick={() => setShowForm(true)}
          className="inline-block px-10 py-4 bg-lime text-night font-bold uppercase tracking-wider text-sm border-2 border-lime hover:bg-transparent hover:text-lime transition-all shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1"
        >
          Get Started
        </button>
        
        <p className="mt-8 text-zinc-600 text-xs uppercase tracking-widest">
          Takes less than 2 minutes
        </p>
      </div>
    </div>
  );
}
