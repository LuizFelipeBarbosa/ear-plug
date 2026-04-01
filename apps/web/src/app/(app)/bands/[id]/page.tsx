"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  MapPin,
  Music,
  UserCheck,
  UserPlus,
  Users,
  Calendar,
  Heart,
  Ticket,
  Instagram,
  Youtube,
  ExternalLink,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { BandPublicMediaSlotsSection } from "@/components/band/slots/BandPublicMediaSlotsSection";
import { PastShowFlyerSection } from "@/components/events/PastShowFlyerSection";
import { useProfileContext } from "@/hooks/useProfileContext";
import { GENRE_COLORS } from "@ear-plug/shared/constants";
import { getInitials } from "@ear-plug/shared/utils";
import type { Genre } from "@ear-plug/shared/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { IconBadge } from "@/components/ui/IconBadge";
import { TabPanel } from "@/components/ui/TabPanel";

interface PageProps {
  params: { id: string };
}

type TabType = "overview" | "media" | "shows";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
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

export default function BandFeedPage({ params }: PageProps) {
  const router = useRouter();
  const bandId = params.id as Id<"bands">;
  const { mode } = useProfileContext();
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const toggleSave = useMutation(api.bands.toggleSave);
  const trackProfileView = useMutation(api.bands.trackProfileView);

  const publicProfile = useQuery(api.bands.getPublicBandProfile, { bandId });
  const pastGigs = useQuery(api.events.listPublicPastByBand, {
    bandId,
    limit: 20,
  });
  
  const trackedBandIdRef = useRef<Id<"bands"> | null>(null);
  const [isSavingFollow, setIsSavingFollow] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [optimisticFollowState, setOptimisticFollowState] = useState<{
    isFollowing: boolean;
    followerCount: number;
  } | null>(null);

  useEffect(() => {
    setOptimisticFollowState(null);
    setFollowError(null);
  }, [bandId]);

  useEffect(() => {
    if (!isSavingFollow) {
      setOptimisticFollowState(null);
    }
  }, [publicProfile?.isFollowing, publicProfile?.followerCount, isSavingFollow]);

  useEffect(() => {
    if (mode !== "personal") {
      trackedBandIdRef.current = null;
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "personal" || !publicProfile?.band) {
      return;
    }

    if (trackedBandIdRef.current === bandId) {
      return;
    }

    trackedBandIdRef.current = bandId;
    void trackProfileView({ bandId }).catch(() => {
      trackedBandIdRef.current = null;
    });
  }, [bandId, mode, publicProfile?.band, trackProfileView]);

  const band = publicProfile?.band;
  const isViewerMember = Boolean(publicProfile?.viewerMembershipRole);
  const isFollowing = optimisticFollowState?.isFollowing ?? publicProfile?.isFollowing ?? false;
  const followerCount = optimisticFollowState?.followerCount ?? publicProfile?.followerCount ?? 0;
  const canToggleFollow = !isViewerMember;

  const handleToggleFollow = async () => {
    if (!publicProfile || !canToggleFollow || isSavingFollow) {
      return;
    }

    setFollowError(null);
    setIsSavingFollow(true);

    const nextIsFollowing = !isFollowing;
    const nextFollowerCount = Math.max(0, followerCount + (nextIsFollowing ? 1 : -1));
    const snapshot = { isFollowing, followerCount };
    setOptimisticFollowState({
      isFollowing: nextIsFollowing,
      followerCount: nextFollowerCount,
    });

    try {
      await toggleSave({ bandId });
    } catch (error) {
      setOptimisticFollowState(snapshot);
      setFollowError(
        error instanceof Error ? error.message : "Failed to update follow state"
      );
    } finally {
      setIsSavingFollow(false);
    }
  };

  if (publicProfile === undefined) {
    return (
      <div className="min-h-screen pb-24 bg-background overflow-x-hidden">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-fan/10 via-fan/5 to-transparent h-48" />
        </div>
        <div className="px-4 -mt-40 space-y-4">
          <div className="h-32 bg-muted/80 border border-border rounded-2xl animate-shimmer" />
          <div className="h-48 bg-muted/80 border border-border rounded-2xl animate-shimmer" />
        </div>
      </div>
    );
  }

  if (!band) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold text-foreground mb-2">Band not found</p>
          <p className="text-sm text-muted-foreground mb-6">
            This band profile may have been removed or doesn&apos;t exist.
          </p>
          <motion.button

            type="button"
            onClick={() => router.push("/home")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-fan text-white text-sm font-medium rounded-xl hover:bg-fan/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Discover
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background overflow-x-hidden">
      {/* Header Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-fan/10 via-fan/5 to-transparent h-64" />
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-fan/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      </div>

      {/* Header */}
      <header className="relative px-4 pt-4 pb-4">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}

          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-fan transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        {/* Band Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <motion.div

              className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-fan/20 to-fan/5 border-2 border-fan/20 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
            >
              {band.image ? (
                <Image
                  src={band.image}
                  alt={band.name}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-bold text-fan">
                  {getInitials(band.name)}
                </span>
              )}
            </motion.div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {band.name}
              </h1>

              {/* Genres */}
              {band.genres && band.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {band.genres.slice(0, 3).map((genre) => (
                    <span
                      key={genre}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-white rounded-full"
                      style={{ backgroundColor: GENRE_COLORS[genre as Genre] }}
                    >
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </span>
                  ))}
                  {band.genres.length > 3 && (
                    <span className="text-[10px] text-muted-foreground px-1">
                      +{band.genres.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Location & Members */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-fan" />
                  {band.location}
                </span>
                {band.memberCount && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-fan" />
                    {band.memberCount} members
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border/50">
            <QuickStat icon={Heart} value={followerCount} label="Followers" />
            <QuickStat icon={Calendar} value={(pastGigs ?? []).length} label="Shows" />
            <QuickStat icon={Ticket} value={(pastGigs ?? []).length} label="Gigs" />
          </div>

          {/* Follow Button */}
          <div className="mt-4">
            {canToggleFollow ? (
              <motion.button

                type="button"
                onClick={handleToggleFollow}
                disabled={isSavingFollow}
                className={cn(
                  "w-full py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 touch-target",
                  isFollowing
                    ? "bg-fan/10 border border-fan/30 text-fan hover:bg-fan/20"
                    : "bg-fan text-white hover:bg-fan/90 shadow-lg shadow-fan/25"
                )}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow Band
                  </>
                )}
              </motion.button>
            ) : (
              <div className="w-full py-3 px-4 rounded-xl bg-muted border border-border text-muted-foreground font-medium text-sm text-center flex items-center justify-center gap-2">
                <UserCheck className="w-4 h-4" />
                Band Member
              </div>
            )}
          </div>

          {/* Error */}
          <AnimatePresence>
            {followError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl"
              >
                <p className="text-xs text-red-500 text-center">{followError}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center px-4">
          {[
            { id: "overview" as const, label: "Overview", icon: Sparkles },
            { id: "media" as const, label: "Media", icon: ImageIcon },
            { id: "shows" as const, label: "Shows", icon: Calendar },
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
                  layoutId="publicBandTabIndicator"
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
        <TabPanel isActive={activeTab === "overview"}>
            <OverviewTab
              band={band}
              pastGigs={pastGigs ?? []}
              followerCount={followerCount}
            />
        </TabPanel>
        <TabPanel isActive={activeTab === "media"}>
          <MediaTab bandId={band._id} />
        </TabPanel>
        <TabPanel isActive={activeTab === "shows"}>
            <ShowsTab
              pastGigs={pastGigs ?? []}
              isLoading={pastGigs === undefined}
            />
        </TabPanel>
      </main>
    </div>
  );
}

// Quick Stat Component
function QuickStat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <IconBadge size="sm" className="mb-2">
        <Icon />
      </IconBadge>
      <span className="font-semibold text-foreground text-lg">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
}

// Overview Tab
function OverviewTab({
  band,
  pastGigs,
  followerCount,
}: {
  band: any;
  pastGigs: any[];
  followerCount: number;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      {/* Bio Section */}
      {band.bio && (
        <motion.div variants={itemVariants}>
          <SectionTitle icon={Sparkles} title="About" />
          <div className="bg-card/50 border border-border rounded-2xl p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{band.bio}</p>
          </div>
        </motion.div>
      )}

      {/* Social Links */}
      {band.socialLinks && Object.keys(band.socialLinks).length > 0 && (
        <motion.div variants={itemVariants}>
          <SectionTitle icon={ExternalLink} title="Connect" />
          <div className="flex flex-wrap gap-2">
            {band.socialLinks.spotify && (
              <SocialButton href={band.socialLinks.spotify} icon="spotify" label="Spotify" />
            )}
            {band.socialLinks.appleMusic && (
              <SocialButton href={band.socialLinks.appleMusic} icon="apple" label="Apple Music" />
            )}
            {band.socialLinks.instagram && (
              <SocialButton href={band.socialLinks.instagram} icon="instagram" label="Instagram" />
            )}
            {band.socialLinks.youtube && (
              <SocialButton href={band.socialLinks.youtube} icon="youtube" label="YouTube" />
            )}
            {band.socialLinks.tiktok && (
              <SocialButton href={band.socialLinks.tiktok} icon="tiktok" label="TikTok" />
            )}
            {band.socialLinks.website && (
              <SocialButton href={band.socialLinks.website} icon="website" label="Website" />
            )}
          </div>
        </motion.div>
      )}

      {/* Recent Shows Preview */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={Calendar} title="Recent Shows" className="mb-0" />
          {pastGigs.length > 0 && (
            <span className="text-xs text-muted-foreground">{pastGigs.length} total</span>
          )}
        </div>
        <PastShowFlyerSection
          shows={pastGigs.slice(0, 4).map((gig) => ({
            eventId: gig._id,
            title: gig.title,
            dateTime: gig.dateTime,
            image: gig.image,
            venueName: gig.venue.name,
            venueCity: gig.venue.city,
          }))}
          emptyMessage="No shows yet. Check back soon!"
          maxItems={4}
          tone="fan"
        />
      </motion.div>
    </motion.div>
  );
}

// Media Tab
function MediaTab({ bandId }: { bandId: Id<"bands"> }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      <motion.div variants={itemVariants}>
        <BandPublicMediaSlotsSection
          bandId={bandId}
          title="Photos & Videos"
          description="Check out the band's latest photos and videos."
        />
      </motion.div>
    </motion.div>
  );
}

// Shows Tab
function ShowsTab({
  pastGigs,
  isLoading,
}: {
  pastGigs: any[];
  isLoading: boolean;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={Ticket} title="Show History" className="mb-0" />
          {pastGigs.length > 0 && (
            <Badge variant="highlight">{pastGigs.length} shows</Badge>
          )}
        </div>
        <PastShowFlyerSection
          shows={pastGigs.map((gig) => ({
            eventId: gig._id,
            title: gig.title,
            dateTime: gig.dateTime,
            image: gig.image,
            venueName: gig.venue.name,
            venueCity: gig.venue.city,
          }))}
          emptyMessage="No past shows yet. Follow to get notified of upcoming gigs!"
          isLoading={isLoading}
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
      <IconBadge size="sm">
        <Icon />
      </IconBadge>
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

function SocialButton({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  const getIcon = () => {
    switch (icon) {
      case "instagram":
        return <Instagram className="w-4 h-4" />;
      case "youtube":
        return <Youtube className="w-4 h-4" />;
      default:
        return <ExternalLink className="w-4 h-4" />;
    }
  };

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"

      className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-muted-foreground hover:border-fan/30 hover:text-fan transition-colors text-xs font-medium rounded-xl"
    >
      {getIcon()}
      <span>{label}</span>
    </motion.a>
  );
}
