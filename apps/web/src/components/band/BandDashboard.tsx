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
      <div className="min-h-screen p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl" />
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
    <div className="min-h-screen pb-6">
      {/* Header */}
      <header className="bg-gradient-to-b from-primary-600 to-primary-800 text-white p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-white/20">
            {bandWithStats.image ? (
              <Image
                src={bandWithStats.image}
                alt={bandWithStats.name}
                width={56}
                height={56}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-accent-400 to-primary-400" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">{bandWithStats.name}</h1>
            <p className="text-white/80 text-sm">
              {bandWithStats.genres?.map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(" • ") || "No genre"} •{" "}
              {bandWithStats.location}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            value={bandWithStats.stats.showsThisMonth}
            label="Shows This Month"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            value={bandWithStats.stats.totalRsvps}
            label="Total RSVPs"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            value={bandWithStats.stats.newFans}
            label="New Fans"
          />
        </div>
      </header>

      {/* Suggested Venues */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Suggested Venues
          </h2>
          <button className="text-primary-600 text-sm font-medium flex items-center">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {venuesLoading
            ? [1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-48 h-32 bg-gray-100 dark:bg-surface-dark-secondary rounded-xl animate-pulse flex-shrink-0"
              />
            ))
            : suggestedVenues.map((venue) => (
              <VenueCard key={venue._id} venue={venue} />
            ))}
        </div>
      </section>

      {/* Open Dates */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Open Dates
          </h2>
          <button className="text-primary-600 text-sm font-medium flex items-center">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {datesLoading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-gray-100 dark:bg-surface-dark-secondary rounded-xl animate-pulse"
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
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No open dates matching your genre right now
            </p>
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
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-white/70">{label}</div>
    </div>
  );
}

function VenueCard({ venue }: { venue: any }) {
  return (
    <div className="w-48 flex-shrink-0 bg-white dark:bg-surface-dark-secondary rounded-xl overflow-hidden shadow-sm">
      <div className="h-24 relative bg-gray-200">
        {venue.images?.[0] ? (
          <Image
            src={venue.images[0]}
            alt={venue.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-300 to-accent-300" />
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-gray-900 dark:text-white truncate">
          {venue.name}
        </h3>
        <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{venue.city}</span>
        </div>
        <p className="text-xs text-primary-600 mt-1">Cap: {venue.capacity}</p>
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
    <div className="bg-white dark:bg-surface-dark-secondary rounded-xl p-4 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-white">
          {openDate.venue?.name || "Unknown Venue"}
        </h3>
        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatEventDate(openDate.date)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {openDate.venue?.city || "Unknown"}
          </span>
        </div>
        {openDate.offeredPay && (
          <div className="flex items-center gap-1 text-success-600 text-sm mt-1">
            <DollarSign className="w-4 h-4" />
            <span>{formatPrice(openDate.offeredPay)}</span>
          </div>
        )}
      </div>
      <button
        onClick={onApply}
        disabled={isApplying}
        className={cn(
          "px-4 py-2 rounded-lg font-medium transition-all",
          isApplying
            ? "bg-gray-200 text-gray-500"
            : "bg-primary-500 text-white hover:bg-primary-600 active:scale-95"
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-6">
          <Music className="w-10 h-10 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Create Your Band Profile
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Set up your band to start finding gigs, managing shows, and growing your fanbase.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="inline-block px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
