"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Edit3,
  Heart,
  LogOut,
  MapPin,
  Music,
  Plus,
  Settings,
  Sparkles,
  Ticket,
  Users,
  X,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useCurrentUser } from "@/hooks/useUser";
import { useSavedBands } from "@/hooks/useBand";
import { useProfileContext } from "@/hooks/useProfileContext";
import { EditProfileModal } from "@/components/ui/EditProfileModal";
import { ThemeToggleRow } from "@/components/ui/ThemeToggle";
import { CreateBandForm } from "@/components/band/CreateBandForm";
import { PastShowFlyerSection } from "@/components/events/PastShowFlyerSection";
import { ProfileWorkspaceSwitcher } from "@/components/profile/ProfileWorkspaceSwitcher";
import { GENRE_COLORS } from "@ear-plug/shared/constants";
import { getInitials } from "@ear-plug/shared/utils";
import type { Genre } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";

const PANEL_TRANSITION_MS = 250;

type TabType = "overview" | "saved" | "activity" | "settings";

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

const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

function capitalizeGenre(genre: Genre | null): string {
  if (!genre) return "Explorer";
  return genre.charAt(0).toUpperCase() + genre.slice(1);
}

export function FanProfileView() {
  const router = useRouter();
  const { user, updateProfile } = useCurrentUser();
  const { savedBands } = useSavedBands();
  const { setBandMode } = useProfileContext();
  const publicProfile = useQuery(
    api.users.getPublicFanProfile,
    user ? { fanId: user._id } : "skip"
  );
  const myBands = useQuery(api.bands.listMyBands) ?? [];
  const pendingInvites = useQuery(api.bandMembers.listMyPendingInvites) ?? [];
  const acceptInvite = useMutation(api.bandMembers.acceptInvite);
  const declineInvite = useMutation(api.bandMembers.declineInvite);

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isWorkspaceMenuVisible, setIsWorkspaceMenuVisible] = useState(false);
  const workspaceMenuCloseTimeout = useRef<number | null>(null);
  const [showCreateBandForm, setShowCreateBandForm] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<Id<"bandInvites"> | null>(null);

  useEffect(() => {
    return () => {
      if (workspaceMenuCloseTimeout.current !== null) {
        window.clearTimeout(workspaceMenuCloseTimeout.current);
      }
    };
  }, []);

  if (!user) return null;

  if (showCreateBandForm) {
    return <CreateBandForm />;
  }

  const memberSinceDate = new Date(user.memberSince).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const handleSaveProfile = async (data: {
    name: string;
    location?: string;
    avatar?: string;
    topGenres?: Genre[];
  }) => {
    await updateProfile(data);
  };

  const handleAcceptInvite = async (
    inviteId: Id<"bandInvites">,
    bandId: Id<"bands">
  ) => {
    setProcessingInviteId(inviteId);
    try {
      await acceptInvite({ inviteId });
      setBandMode(bandId);
      closeWorkspaceMenu();
      router.push("/home");
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleDeclineInvite = async (inviteId: Id<"bandInvites">) => {
    setProcessingInviteId(inviteId);
    try {
      await declineInvite({ inviteId });
    } finally {
      setProcessingInviteId(null);
    }
  };

  const openWorkspaceMenu = () => {
    if (workspaceMenuCloseTimeout.current !== null) {
      window.clearTimeout(workspaceMenuCloseTimeout.current);
      workspaceMenuCloseTimeout.current = null;
    }
    setIsWorkspaceMenuOpen(true);
    requestAnimationFrame(() => {
      setIsWorkspaceMenuVisible(true);
    });
  };

  const closeWorkspaceMenu = () => {
    setIsWorkspaceMenuVisible(false);
    if (workspaceMenuCloseTimeout.current !== null) {
      window.clearTimeout(workspaceMenuCloseTimeout.current);
    }
    workspaceMenuCloseTimeout.current = window.setTimeout(() => {
      setIsWorkspaceMenuOpen(false);
      workspaceMenuCloseTimeout.current = null;
    }, PANEL_TRANSITION_MS);
  };

  // Calculate stats
  const stats = {
    showsAttended: user.showsAttended || 0,
    savedArtists: savedBands.length,
    memberSince: memberSinceDate,
    upcomingShows: publicProfile?.pastShows?.length || 0,
  };

  return (
    <div className="min-h-screen pb-24 bg-background overflow-x-hidden">
      {/* Header Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-fan/5 via-fan/2 to-transparent h-64" />
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-fan/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      </div>

      {/* Profile Header */}
      <header className="relative px-4 pt-6 pb-4">
        {/* Top Actions */}
        <div className="flex items-center justify-between mb-6">
          <ProfileWorkspaceSwitcher className="flex-1 min-w-0" variant="header" />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={openWorkspaceMenu}
            className="ml-3 p-2.5 bg-card border border-border rounded-xl hover:border-fan/30 hover:bg-fan/5 transition-colors touch-target shadow-sm"
            aria-label="Open workspace menu"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="w-20 h-20 bg-gradient-to-br from-fan/20 to-fan/5 border-2 border-fan/20 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
              >
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-2xl font-bold text-fan">
                    {getInitials(user.name)}
                  </span>
                )}
              </motion.div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsEditModalOpen(true)}
                className="absolute -bottom-1 -right-1 p-1.5 bg-fan text-white rounded-lg shadow-lg shadow-fan/30 hover:bg-fan/90 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">{user.name}</h1>
              {user.location && (
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
                  <MapPin className="w-3.5 h-3.5 text-fan" />
                  <span className="truncate">{user.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-fan/10 text-fan text-[10px] font-medium rounded-full">
                  <Zap className="w-3 h-3" />
                  {publicProfile?.gigDna?.label || "Music Explorer"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border/50">
            <QuickStat icon={Ticket} value={stats.showsAttended} label="Shows" />
            <QuickStat icon={Heart} value={stats.savedArtists} label="Saved" />
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
            { id: "settings" as const, label: "Settings", icon: Settings },
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
              publicProfile={publicProfile}
              user={user}
              stats={stats}
            />
          )}
          {activeTab === "saved" && (
            <SavedTab
              key="saved"
              publicProfile={publicProfile}
            />
          )}
          {activeTab === "activity" && (
            <ActivityTab
              key="activity"
              publicProfile={publicProfile}
            />
          )}
          {activeTab === "settings" && (
            <SettingsTab
              key="settings"
              onOpenWorkspaceMenu={openWorkspaceMenu}
              pendingInvitesCount={pendingInvites.length}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Workspace Menu Overlay */}
      <AnimatePresence>
        {isWorkspaceMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
          >
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeWorkspaceMenu}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-label="Close menu"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border overflow-y-auto"
            >
              {/* Workspace Menu Header */}
              <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border p-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Workspace</h3>
                <button
                  onClick={closeWorkspaceMenu}
                  className="p-2 border border-border text-muted-foreground hover:text-foreground hover:border-fan/30 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-6">
                {/* Band Creation Section */}
                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Your Bands
                  </h4>
                  {myBands.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-muted/50 border border-dashed border-border rounded-xl p-4 text-center"
                    >
                      <Music className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">
                        Create your first band workspace
                      </p>
                      <button
                        onClick={() => {
                          closeWorkspaceMenu();
                          setShowCreateBandForm(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-fan text-white text-sm font-medium rounded-lg hover:bg-fan/90 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Create Band
                      </button>
                    </motion.div>
                  ) : (
                    <div className="space-y-2">
                      {myBands.map((entry) => (
                        <motion.div
                          key={entry.band._id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-xl"
                        >
                          <div className="w-10 h-10 bg-band/10 border border-band/20 rounded-lg flex items-center justify-center">
                            <Music className="w-5 h-5 text-band" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {entry.band.name}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {entry.membership.role}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                      <button
                        onClick={() => {
                          closeWorkspaceMenu();
                          setShowCreateBandForm(true);
                        }}
                        className="w-full py-3 border border-dashed border-fan/30 text-fan text-sm font-medium rounded-xl hover:bg-fan/5 transition-colors"
                      >
                        + Create Another Band
                      </button>
                    </div>
                  )}
                </section>

                {/* Pending Invites */}
                {pendingInvites.length > 0 && (
                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Pending Invites ({pendingInvites.length})
                    </h4>
                    <div className="space-y-2">
                      {pendingInvites.map((invite, index) => (
                        <motion.div
                          key={invite._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Users className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {invite.band?.name || "Band Invite"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Invited as {invite.role}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleAcceptInvite(invite._id, invite.bandId)}
                              disabled={processingInviteId === invite._id}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-fan text-white text-sm font-medium rounded-lg hover:bg-fan/90 transition-colors disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" /> Accept
                            </button>
                            <button
                              onClick={() => handleDeclineInvite(invite._id)}
                              disabled={processingInviteId === invite._id}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-border text-muted-foreground text-sm font-medium rounded-lg hover:border-red-500/30 hover:text-red-400 transition-colors disabled:opacity-50"
                            >
                              <X className="w-4 h-4" /> Decline
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveProfile}
        initialData={{
          name: user.name,
          location: user.location,
          avatar: user.avatar,
          topGenres: user.topGenres as Genre[] | undefined,
        }}
      />
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
  publicProfile,
  user,
  stats,
}: {
  publicProfile: any;
  user: any;
  stats: any;
}) {
  if (!publicProfile) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        <div className="h-32 bg-muted rounded-xl animate-shimmer" />
        <div className="h-48 bg-muted rounded-xl animate-shimmer" />
        <div className="h-40 bg-muted rounded-xl animate-shimmer" />
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      {/* Gig DNA Card */}
      <motion.div variants={itemVariants}>
        <SectionTitle icon={Sparkles} title="Your Gig DNA" />
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
                {publicProfile.gigDna.label}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Dominant: {capitalizeGenre(publicProfile.gigDna.dominantGenre)}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="default">{publicProfile.gigDna.attendedShows} shows</Badge>
                <Badge variant="default">{publicProfile.gigDna.distinctVenues} venues</Badge>
                <Badge variant="highlight">Tier {publicProfile.gigDna.tier}</Badge>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Top Genres */}
      {publicProfile.topGenres.length > 0 && (
        <motion.div variants={itemVariants}>
          <SectionTitle icon={Music} title="Top Genres" />
          <div className="flex flex-wrap gap-2">
            {publicProfile.topGenres.map((entry: any, index: number) => (
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
      {publicProfile.pastShows.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle icon={Ticket} title="Recent Shows" className="mb-0" />
            <span className="text-xs text-muted-foreground">
              {publicProfile.pastShows.length} total
            </span>
          </div>
          <PastShowFlyerSection
            shows={publicProfile.pastShows.slice(0, 4).map((show: any) => ({
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
function SavedTab({ publicProfile }: { publicProfile: any }) {
  if (!publicProfile) {
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
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
      exit="exit"
      className="space-y-5"
    >
      {/* Saved Artists */}
      <motion.div variants={itemVariants}>
        <SectionTitle icon={Heart} title={`Saved Artists (${publicProfile.savedArtists.length})`} />
        {publicProfile.savedArtists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {publicProfile.savedArtists.map((artist: any, index: number) => (
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
            description="Save your favorite bands to see them here"
          />
        )}
      </motion.div>

      {/* Most Viewed */}
      {publicProfile.mostViewedSavedArtists.length > 0 && (
        <motion.div variants={itemVariants}>
          <SectionTitle icon={Zap} title="Most Engaged" />
          <div className="space-y-2">
            {publicProfile.mostViewedSavedArtists.map((artist: any, index: number) => (
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
function ActivityTab({ publicProfile }: { publicProfile: any }) {
  if (!publicProfile) {
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
        <div className="h-48 bg-muted rounded-xl animate-shimmer" />
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      {/* All Past Shows */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={Ticket} title="Show History" className="mb-0" />
          {publicProfile.pastShows.length > 0 && (
            <Badge variant="highlight">{publicProfile.pastShows.length} shows</Badge>
          )}
        </div>
        <PastShowFlyerSection
          shows={publicProfile.pastShows.map((show: any) => ({
            eventId: show.eventId,
            title: show.title,
            dateTime: show.dateTime,
            image: show.image,
            venueName: show.venue.name,
            venueCity: show.venue.city,
            bandName: show.band?.name,
          }))}
          emptyMessage="No shows attended yet. Start exploring events near you!"
          tone="fan"
        />
      </motion.div>
    </motion.div>
  );
}

// Settings Tab
function SettingsTab({
  onOpenWorkspaceMenu,
  pendingInvitesCount,
}: {
  onOpenWorkspaceMenu: () => void;
  pendingInvitesCount: number;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      {/* Appearance */}
      <motion.div variants={itemVariants}>
        <SectionTitle icon={Settings} title="Appearance" />
        <div className="bg-card border border-border rounded-xl p-4">
          <ThemeToggleRow />
        </div>
      </motion.div>

      {/* Workspace */}
      <motion.div variants={itemVariants}>
        <SectionTitle icon={Users} title="Workspace" />
        <div className="space-y-2">
          <button
            onClick={onOpenWorkspaceMenu}
            className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-fan/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-fan/10 rounded-lg flex items-center justify-center">
                <Music className="w-5 h-5 text-fan" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Manage Bands</p>
                <p className="text-xs text-muted-foreground">Create or switch workspaces</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {pendingInvitesCount > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onOpenWorkspaceMenu}
              className="w-full flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl hover:bg-amber-500/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">
                    Pending Invites
                    <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                      {pendingInvitesCount}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">View and respond to invites</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Sign Out */}
      <motion.div variants={itemVariants}>
        <SignOutButton>
          <button className="w-full flex items-center justify-center gap-2 py-4 border border-red-500/20 text-red-500 font-medium text-sm bg-red-500/5 hover:bg-red-500/10 transition-colors rounded-xl">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </SignOutButton>
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
