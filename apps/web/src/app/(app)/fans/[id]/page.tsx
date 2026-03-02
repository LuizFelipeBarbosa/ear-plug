"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  MapPin,
  Music,
  Sparkles,
  Ticket,
  Users,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { PastShowFlyerSection } from "@/components/events/PastShowFlyerSection";
import { GENRE_COLORS } from "@ear-plug/shared/constants";
import { getInitials } from "@ear-plug/shared/utils";
import type { Genre } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PageProps {
  params: { id: string };
}

type TabType = "overview" | "saved" | "activity";

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  },
};

function capitalizeGenre(genre: Genre | null): string {
  if (!genre) return "Explorer";
  return genre.charAt(0).toUpperCase() + genre.slice(1);
}

export default function PublicFanProfilePage({ params }: PageProps) {
  const router = useRouter();
  const fanId = params.id as Id<"users">;
  const profile = useQuery(api.users.getPublicFanProfile, { fanId });
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  if (profile === undefined) {
    return (
      <div className="min-h-screen bg-background pb-24 overflow-x-hidden">
        {/* Header Background */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-fan/5 via-fan/2 to-transparent h-64" />
        </div>
        {/* Loading Skeleton */}
        <div className="px-4 -mt-56">
          <div className="h-8 w-20 bg-muted rounded-lg animate-shimmer mb-6" />
          <div className="h-32 bg-muted/80 border border-border rounded-2xl animate-shimmer mb-6" />
          <div className="h-48 bg-muted/80 border border-border rounded-2xl animate-shimmer" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold text-foreground mb-2">
            Profile not found
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            This fan profile may have been removed or doesn&apos;t exist.
          </p>
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-fan text-white text-sm font-medium rounded-xl hover:bg-fan/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Discover
          </button>
        </motion.div>
      </div>
    );
  }

  const {
    fan,
    topGenres,
    savedArtists,
    mostViewedSavedArtists,
    pastShows,
    gigDna,
  } = profile;

  const memberSinceDate = new Date(fan.memberSince).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const stats = {
    showsAttended: fan.showsAttended || 0,
    savedArtistsCount: savedArtists.length,
    memberSince: memberSinceDate,
    distinctVenues: gigDna?.distinctVenues || 0,
  };

  return (
    <div className="min-h-screen pb-24 bg-background overflow-x-hidden">
      {/* Header Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-fan/5 via-fan/2 to-transparent h-64" />
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-fan/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      </div>

      {/* Profile Header */}
      <header className="relative px-4 pt-4 pb-4">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-fan transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative w-20 h-20 bg-gradient-to-br from-fan/20 to-fan/5 border-2 border-fan/20 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
            >
              {fan.avatar ? (
                <Image
                  src={fan.avatar}
                  alt={fan.name}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-2xl font-bold text-fan">
                  {getInitials(fan.name)}
                </span>
              )}
            </motion.div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">
                {fan.name}
              </h1>
              {fan.location && (
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
                  <MapPin className="w-3.5 h-3.5 text-fan" />
                  <span className="truncate">{fan.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-fan/10 text-fan text-[10px] font-medium rounded-full">
                  <Zap className="w-3 h-3" />
                  {gigDna?.label || "Music Explorer"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border/50">
            <QuickStat icon={Ticket} value={stats.showsAttended} label="Shows" />
            <QuickStat icon={Heart} value={stats.savedArtistsCount} label="Saved" />
            <QuickStat icon={Calendar} value={stats.memberSince} label="Joined" isText />
          </div>
        </motion.div>
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center px-4">
          {[
            { id: "overview" as const, label: "Overview", icon: Users },
            { id: "saved" as const, label: "Saved", icon: Heart },
            { id: "activity" as const, label: "Activity", icon: Zap },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors touch-target-sm",
                activeTab === tab.id ? "text-fan" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-fan rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <main className="px-4 pt-4">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <OverviewTab
              key="overview"
              gigDna={gigDna}
              topGenres={topGenres}
              pastShows={pastShows}
            />
          )}
          {activeTab === "saved" && (
            <SavedTab
              key="saved"
              savedArtists={savedArtists}
              mostViewedSavedArtists={mostViewedSavedArtists}
            />
          )}
          {activeTab === "activity" && (
            <ActivityTab
              key="activity"
              pastShows={pastShows}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Quick Stat Component
function QuickStat({
  icon: Icon,
  value,
  label,
  isText = false,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  isText?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Icon className="w-4 h-4 text-muted-foreground mb-1" />
      <span
        className={cn(
          "font-semibold text-foreground",
          isText ? "text-xs" : "text-lg"
        )}
      >
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

// Overview Tab
function OverviewTab({
  gigDna,
  topGenres,
  pastShows,
}: {
  gigDna: any;
  topGenres: any[];
  pastShows: any[];
}) {
  if (!gigDna) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        <div className="h-32 bg-muted rounded-xl animate-shimmer" />
        <div className="h-48 bg-muted rounded-xl animate-shimmer" />
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      {/* Gig DNA Card */}
      <motion.div variants={itemVariants}>
        <SectionTitle icon={Sparkles} title="Gig DNA" />
        <div className="bg-gradient-to-br from-fan/10 via-fan/5 to-transparent border border-fan/20 rounded-2xl p-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-fan/15 border border-fan/25 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-7 h-7 text-fan" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Archetype
              </p>
              <p className="text-xl font-bold text-foreground">
                {gigDna.label}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Dominant: {capitalizeGenre(gigDna.dominantGenre)}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="default">{gigDna.attendedShows} shows</Badge>
                <Badge variant="default">{gigDna.distinctVenues} venues</Badge>
                <Badge variant="highlight">Tier {gigDna.tier}</Badge>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Top Genres */}
      {topGenres.length > 0 && (
        <motion.div variants={itemVariants}>
          <SectionTitle icon={Music} title="Top Genres" />
          <div className="flex flex-wrap gap-2">
            {topGenres.map((entry: any, index: number) => (
              <motion.div
                key={entry.genre}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="px-3 py-2 rounded-xl text-sm font-medium text-white shadow-sm"
                style={{
                  backgroundColor: GENRE_COLORS[entry.genre as Genre],
                }}
              >
                {entry.label}
                <span className="opacity-80 ml-1.5 text-xs">({entry.attendedCount})</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Past Shows */}
      {pastShows.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle icon={Ticket} title="Recent Shows" className="mb-0" />
            <span className="text-xs text-muted-foreground">
              {pastShows.length} total
            </span>
          </div>
          <PastShowFlyerSection
            shows={pastShows.slice(0, 4).map((show: any) => ({
              eventId: show.eventId,
              title: show.title,
              dateTime: show.dateTime,
              image: show.image,
              venueName: show.venue.name,
              venueCity: show.venue.city,
              bandName: show.band?.name,
            }))}
            emptyMessage="No shows attended yet."
            maxItems={4}
            tone="fan"
          />
        </motion.div>
      )}
    </motion.div>
  );
}

// Saved Tab
function SavedTab({
  savedArtists,
  mostViewedSavedArtists,
}: {
  savedArtists: any[];
  mostViewedSavedArtists: any[];
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      {/* Saved Artists */}
      <motion.div variants={itemVariants}>
        <SectionTitle icon={Heart} title={`Saved Artists (${savedArtists.length})`} />
        {savedArtists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savedArtists.map((artist: any, index: number) => (
              <motion.div
                key={artist.bandId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/bands/${artist.bandId}`}
                  className="group flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-fan/30 transition-all hover:shadow-sm"
                >
                  <div className="w-12 h-12 bg-muted border border-border rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                    {artist.image ? (
                      <Image
                        src={artist.image}
                        alt={artist.name}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-sm font-bold text-fan">
                        {getInitials(artist.name)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-fan transition-colors">
                      {artist.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {artist.location}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Heart}
            title="No saved artists"
            description="This fan hasn't saved any bands yet."
          />
        )}
      </motion.div>

      {/* Most Viewed */}
      {mostViewedSavedArtists.length > 0 && (
        <motion.div variants={itemVariants}>
          <SectionTitle icon={Zap} title="Most Engaged" />
          <div className="space-y-2">
            {mostViewedSavedArtists.map((artist: any, index: number) => (
              <motion.div
                key={artist.bandId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/bands/${artist.bandId}`}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-fan/30 transition-colors"
                >
                  <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {artist.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {artist.viewCount} views
                      </span>
                      {artist.isSaved && (
                        <span className="inline-flex items-center gap-1 text-fan">
                          <Heart className="w-3 h-3 fill-current" /> Saved
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-fan bg-fan/10 px-2 py-1 rounded-full">
                    {artist.score} pts
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Activity Tab
function ActivityTab({
  pastShows,
}: {
  pastShows: any[];
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      {/* All Past Shows */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={Ticket} title="Show History" className="mb-0" />
          {pastShows.length > 0 && (
            <Badge variant="highlight">{pastShows.length} shows</Badge>
          )}
        </div>
        <PastShowFlyerSection
          shows={pastShows.map((show: any) => ({
            eventId: show.eventId,
            title: show.title,
            dateTime: show.dateTime,
            image: show.image,
            venueName: show.venue.name,
            venueCity: show.venue.city,
            bandName: show.band?.name,
          }))}
          emptyMessage="No shows attended yet."
          tone="fan"
        />
      </motion.div>
    </motion.div>
  );
}

// Helper Components
function SectionTitle({
  icon: Icon,
  title,
  className,
}: {
  icon: React.ElementType;
  title: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 mb-3", className)}>
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "highlight";
}) {
  return (
    <span
      className={cn(
        "px-2 py-1 text-[10px] font-semibold rounded-lg",
        variant === "highlight"
          ? "bg-fan/15 text-fan border border-fan/25"
          : "bg-muted text-muted-foreground border border-border"
      )}
    >
      {children}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-12 px-4 bg-muted/30 border border-dashed border-border rounded-2xl"
    >
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </motion.div>
  );
}
