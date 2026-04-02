"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  Check,
  ChevronRight,
  Clock,
  Edit3,
  Heart,
  Music,
  Plus,
  Settings,
  Sparkles,
  Ticket,
  Users,
  X,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUser } from "@/hooks/useUser";
import { useSavedBands } from "@/hooks/useBand";
import { useProfileContext } from "@/hooks/useProfileContext";
import { EditProfileModal } from "@/components/ui/EditProfileModal";
import { MobileTabRail } from "@/components/ui/MobileTabRail";
import { TabPanel } from "@/components/ui/TabPanel";
import { ThemeToggleRow } from "@/components/ui/ThemeToggle";
import { CreateBandForm } from "@/components/band/CreateBandForm";
import { PastShowFlyerSection } from "@/components/events/PastShowFlyerSection";
import { GigDnaEvolutionModal } from "@/components/fan/profile/GigDnaEvolutionModal";
import {
  FanBadge,
  FanEmptyState,
  FanProfileHeaderCard,
  FanSectionTitle,
} from "@/components/fan/profile/FanProfilePrimitives";
import { AccountManagementPanel } from "@/components/profile/AccountManagementPanel";
import { ProfileWorkspaceSwitcher } from "@/components/profile/ProfileWorkspaceSwitcher";
import { useSocialOAuth } from "@/hooks/useSocialOAuth";
import { GENRE_COLORS } from "@ear-plug/shared/constants";
import {
  composePersonalName,
  getInitials,
  getPersonalNameValidationError,
  normalizePersonalNamePart,
  splitPersonalName,
} from "@ear-plug/shared/utils";
import type { Genre } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";
import { panelFade } from "@/lib/motion/presets";
import { uploadToConvexStorage } from "@/lib/convexUpload";
import type { GigDnaTier } from "@/lib/gigDnaEvolution";

const PANEL_TRANSITION_MS = 250;
const FAN_PROFILE_TABS = ["overview", "saved", "settings"] as const;

type TabType = "overview" | "saved" | "settings";

function parseFanProfileTab(value: string | null): TabType {
  if (value && FAN_PROFILE_TABS.includes(value as TabType)) {
    return value as TabType;
  }

  return "overview";
}

function capitalizeGenre(genre: Genre | null): string {
  if (!genre) return "Explorer";
  return genre.charAt(0).toUpperCase() + genre.slice(1);
}

function getActionErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as { data?: { message?: unknown } }).data?.message === "string"
  ) {
    return (error as { data: { message: string } }).data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getActionErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as { data?: { code?: unknown } }).data?.code === "string"
  ) {
    return (error as { data: { code: string } }).data.code;
  }

  return null;
}

export function FanProfileView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: clerkUser } = useUser();
  const updateClerkPersonalName = useAction(api.users.updateClerkPersonalName);
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
  const generateAvatarUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const setAvatarFromStorage = useMutation(api.users.setAvatarFromStorage);
  const clearAvatar = useMutation(api.users.clearAvatar);

  const resolvedTab = parseFanProfileTab(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState<TabType>(resolvedTab);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGigDnaModalOpen, setIsGigDnaModalOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isWorkspaceMenuVisible, setIsWorkspaceMenuVisible] = useState(false);
  const workspaceMenuCloseTimeout = useRef<number | null>(null);
  const [showCreateBandForm, setShowCreateBandForm] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<Id<"bandInvites"> | null>(null);
  const openEditModal = useCallback(() => setIsEditModalOpen(true), []);
  const closeEditModal = useCallback(() => setIsEditModalOpen(false), []);
  const openGigDnaModal = useCallback(() => {
    if (publicProfile?.gigDna) {
      setIsGigDnaModalOpen(true);
    }
  }, [publicProfile?.gigDna]);
  const closeGigDnaModal = useCallback(() => setIsGigDnaModalOpen(false), []);

  const handleSaveProfile = useCallback(
    async (data: {
      firstName: string;
      lastName: string;
      location?: string;
      topGenres?: Genre[];
      avatarFile?: File;
      removeAvatar?: boolean;
    }) => {
      const validationError = getPersonalNameValidationError(
        data.firstName,
        data.lastName,
      );
      if (validationError) {
        throw new Error(validationError);
      }

      const normalizedFirstName = normalizePersonalNamePart(data.firstName);
      const normalizedLastName = normalizePersonalNamePart(data.lastName);
      const currentFirstName = normalizePersonalNamePart(clerkUser?.firstName);
      const currentLastName = normalizePersonalNamePart(clerkUser?.lastName);
      const shouldUpdateClerkName =
        normalizedFirstName !== currentFirstName ||
        normalizedLastName !== currentLastName;

      if (data.avatarFile) {
        const { uploadUrl } = await generateAvatarUploadUrl({});
        const uploadData = await uploadToConvexStorage(uploadUrl, data.avatarFile);
        await setAvatarFromStorage({ storageId: uploadData.storageId as Id<"_storage"> });
      } else if (data.removeAvatar) {
        await clearAvatar({});
      }

      if (shouldUpdateClerkName) {
        if (!clerkUser) {
          throw new Error("Account details are still loading.");
        }

        await updateClerkPersonalName({
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
        });
        await clerkUser.reload();
      }

      await updateProfile({
        name: composePersonalName(normalizedFirstName, normalizedLastName),
        location: data.location,
        topGenres: data.topGenres,
      });
    },
    [
      clerkUser,
      clearAvatar,
      generateAvatarUploadUrl,
      setAvatarFromStorage,
      updateClerkPersonalName,
      updateProfile,
    ]
  );

  const editModalInitialData = useMemo(() => {
    const fallbackName = splitPersonalName(user?.name);

    return {
      firstName: clerkUser?.firstName ?? fallbackName.firstName,
      lastName: clerkUser?.lastName ?? fallbackName.lastName,
      location: user?.location,
      avatar: user?.avatar,
      topGenres: (user?.topGenres as Genre[] | undefined) ?? undefined,
    };
  }, [
    clerkUser?.firstName,
    clerkUser?.lastName,
    user?.avatar,
    user?.location,
    user?.name,
    user?.topGenres,
  ]);

  useEffect(() => {
    return () => {
      if (workspaceMenuCloseTimeout.current !== null) {
        window.clearTimeout(workspaceMenuCloseTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!publicProfile?.gigDna && isGigDnaModalOpen) {
      setIsGigDnaModalOpen(false);
    }
  }, [isGigDnaModalOpen, publicProfile?.gigDna]);

  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  const handleTabChange = useCallback(
    (nextTab: TabType) => {
      setActiveTab(nextTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  if (!user) return null;

  if (showCreateBandForm) {
    return <CreateBandForm />;
  }

  const memberSinceDate = new Date(user.memberSince).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

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

            onClick={openWorkspaceMenu}
            className="ml-3 p-2.5 bg-card border border-border rounded-xl hover:border-fan/30 hover:bg-fan/5 transition-colors touch-target shadow-sm"
            aria-label="Open workspace menu"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </div>

        <FanProfileHeaderCard
          name={user.name}
          avatar={user.avatar}
          location={user.location}
          gigLabel={publicProfile?.gigDna?.label}
          stats={stats}
          avatarAction={
            <motion.button
              onClick={openEditModal}
              className="absolute -bottom-1 -right-1 p-1.5 bg-fan text-white rounded-lg shadow-lg shadow-fan/30 hover:bg-fan/90 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </motion.button>
          }
        />
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border">
        <MobileTabRail
          items={[
            { id: "overview", label: "Overview", icon: Users },
            { id: "saved", label: "Saved", icon: Heart },
            { id: "settings", label: "Settings", icon: Settings },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => handleTabChange(tabId as TabType)}
          layoutId="activeTabIndicator"
          tone="fan"
        />
      </div>

      {/* Tab Content */}
      <main className="px-4 pt-4">
        <TabPanel isActive={activeTab === "overview"}>
          <OverviewTab
            publicProfile={publicProfile}
            onOpenGigDnaModal={openGigDnaModal}
          />
        </TabPanel>
        <TabPanel isActive={activeTab === "saved"}>
          <SavedTab
            publicProfile={publicProfile}
          />
        </TabPanel>
        <TabPanel isActive={activeTab === "settings"}>
          <SettingsTab
            onOpenWorkspaceMenu={openWorkspaceMenu}
            pendingInvitesCount={pendingInvites.length}
          />
        </TabPanel>
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
              className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-border bg-card safe-area-inset-bottom"
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

              <div className="space-y-6 p-4 pb-6">
                {/* Band Creation Section */}
                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground   mb-3">
                    Your Bands
                  </h4>
                  {myBands.length === 0 ? (
                    <div className="bg-muted/50 border border-dashed border-border rounded-xl p-4 text-center">
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
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myBands.map((entry) => (
                        <div
                          key={entry.band._id}
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
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          closeWorkspaceMenu();
                          setShowCreateBandForm(true);
                        }}
                        className="w-full py-3 border border-dashed border-fan/30 text-fan text-sm font-medium rounded-xl hover:bg-fan/5 transition-colors"
                      >
                        + Create Artist Profile
                      </button>
                    </div>
                  )}
                </section>

                {/* Pending Invites */}
                {pendingInvites.length > 0 && (
                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground   mb-3">
                      Pending Invites ({pendingInvites.length})
                    </h4>
                    <div className="space-y-2">
                      {pendingInvites.map((invite) => (
                        <div
                          key={invite._id}
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
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
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
                        </div>
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
        onClose={closeEditModal}
        onSave={handleSaveProfile}
        initialData={editModalInitialData}
      />
      <GigDnaEvolutionModal
        isOpen={isGigDnaModalOpen}
        onClose={closeGigDnaModal}
        gigDna={
          publicProfile?.gigDna
            ? {
              label: publicProfile.gigDna.label,
              tier: publicProfile.gigDna.tier as GigDnaTier,
              attendedShows: publicProfile.gigDna.attendedShows,
            }
            : null
        }
      />
    </div>
  );
}

// Overview Tab
function OverviewTab({
  publicProfile,
  onOpenGigDnaModal,
}: {
  publicProfile: any;
  onOpenGigDnaModal: () => void;
}) {
  if (!publicProfile) {
    return (
      <motion.div variants={panelFade} initial="hidden" animate="visible" className="space-y-4">
        <div className="h-32 bg-muted rounded-xl animate-shimmer" />
        <div className="h-48 bg-muted rounded-xl animate-shimmer" />
        <div className="h-40 bg-muted rounded-xl animate-shimmer" />
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={panelFade}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      {/* Gig DNA Card */}
      <div>
        <FanSectionTitle icon={Sparkles} title="Your Gig DNA" />
        <button
          type="button"
          onClick={onOpenGigDnaModal}
          disabled={!publicProfile.gigDna}
          aria-label="Open Gig DNA evolution checkpoints"
          className={cn(
            "w-full text-left bg-gradient-to-br from-fan/10 via-fan/5 to-transparent border border-fan/20 rounded-2xl p-4 transition-all",
            "hover:border-fan/35 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            !publicProfile.gigDna && "opacity-70 cursor-default"
          )}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-fan/15 border border-fan/25 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-7 h-7 text-fan" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground   mb-0.5">
                Archetype
              </p>
              <p className="text-xl font-bold text-foreground">
                {publicProfile.gigDna.label}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Dominant: {capitalizeGenre(publicProfile.gigDna.dominantGenre)}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <FanBadge variant="default">{publicProfile.gigDna.attendedShows} shows</FanBadge>
                <FanBadge variant="default">{publicProfile.gigDna.distinctVenues} venues</FanBadge>
                <FanBadge variant="highlight">Tier {publicProfile.gigDna.tier}</FanBadge>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-fan">
              <ChevronRight className="w-4 h-4" />
              <span className="text-[11px] font-semibold">View tasks</span>
            </div>
          </div>
        </button>
      </div>

      {/* Show History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <FanSectionTitle icon={Ticket} title="Show History" className="mb-0" />
          {publicProfile.pastShows.length > 0 && (
            <FanBadge variant="highlight">{publicProfile.pastShows.length} shows</FanBadge>
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
      </div>

      {/* Top Genres */}
      {publicProfile.topGenres.length > 0 && (
        <div>
          <FanSectionTitle icon={Music} title="Top Genres" />
          <div className="flex flex-wrap gap-2">
            {publicProfile.topGenres.map((entry: any) => (
              <div
                key={entry.genre}
                className="px-3 py-2 rounded-xl text-sm font-medium text-white shadow-sm"
                style={{
                  backgroundColor: GENRE_COLORS[entry.genre as Genre],
                }}
              >
                {entry.label}
                <span className="opacity-80 ml-1.5 text-xs">({entry.attendedCount})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Saved Tab
function SavedTab({ publicProfile }: { publicProfile: any }) {
  if (!publicProfile) {
    return (
      <motion.div variants={panelFade} initial="hidden" animate="visible" className="space-y-4">
        <div className="h-32 bg-muted rounded-xl animate-shimmer" />
        <div className="h-48 bg-muted rounded-xl animate-shimmer" />
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={panelFade}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      {/* Saved Artists */}
      <div>
        <FanSectionTitle icon={Heart} title={`Saved Artists (${publicProfile.savedArtists.length})`} />
        {publicProfile.savedArtists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {publicProfile.savedArtists.map((artist: any) => (
              <div
                key={artist.bandId}
              >
                <Link
                  href={`/bands/${artist.bandId}`}
                  className="group flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:border-fan/30 transition-colors transition-shadow hover:shadow-sm"
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
              </div>
            ))}
          </div>
        ) : (
          <FanEmptyState
            icon={Heart}
            title="No saved artists"
            description="Save your favorite bands to see them here"
          />
        )}
      </div>

      {/* Most Viewed */}
      {publicProfile.mostViewedSavedArtists.length > 0 && (
        <div>
          <FanSectionTitle icon={Zap} title="Most Engaged" />
          <div className="space-y-2">
            {publicProfile.mostViewedSavedArtists.map((artist: any, index: number) => (
              <div
                key={artist.bandId}
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
              </div>
            ))}
          </div>
        </div>
      )}
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
  const spotifyPersonalization = useQuery(api.spotify.getSpotifyPersonalization);
  const syncSpotifyPersonalization = useAction(
    api.spotify.syncSpotifyPersonalization,
  );
  const clearSpotifyPersonalization = useMutation(
    api.spotify.clearSpotifyPersonalization,
  );
  const { startSocialOAuth } = useSocialOAuth();
  const [isSyncingSpotify, setIsSyncingSpotify] = useState(false);
  const [isClearingSpotify, setIsClearingSpotify] = useState(false);
  const [isRepairingSpotify, setIsRepairingSpotify] = useState(false);
  const [spotifyNotice, setSpotifyNotice] = useState<string | null>(null);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyErrorCode, setSpotifyErrorCode] = useState<string | null>(null);

  const handleSpotifySync = useCallback(async () => {
    setSpotifyError(null);
    setSpotifyErrorCode(null);
    setSpotifyNotice(null);
    setIsSyncingSpotify(true);

    try {
      const result = await syncSpotifyPersonalization({});
      const topArtistName = result.topArtists[0]?.name;
      setSpotifyNotice(
        topArtistName
          ? `Spotify taste synced. ${topArtistName} is now influencing discovery.`
          : "Spotify taste synced.",
      );
    } catch (error) {
      setSpotifyErrorCode(getActionErrorCode(error));
      setSpotifyError(getActionErrorMessage(error, "We couldn't sync Spotify right now."));
    } finally {
      setIsSyncingSpotify(false);
    }
  }, [syncSpotifyPersonalization]);

  const handleSpotifyClear = useCallback(async () => {
    setSpotifyError(null);
    setSpotifyErrorCode(null);
    setSpotifyNotice(null);
    setIsClearingSpotify(true);

    try {
      await clearSpotifyPersonalization({});
      setSpotifyNotice("Stored Spotify personalization was cleared.");
    } catch (error) {
      setSpotifyError(
        getActionErrorMessage(
          error,
          "We couldn't clear Spotify personalization right now.",
        ),
      );
    } finally {
      setIsClearingSpotify(false);
    }
  }, [clearSpotifyPersonalization]);

  const handleRepairSpotifyAccess = useCallback(async () => {
    setSpotifyError(null);
    setSpotifyErrorCode(null);
    setSpotifyNotice(null);
    setIsRepairingSpotify(true);

    try {
      await startSocialOAuth({ provider: "spotify" });
    } catch (error) {
      setSpotifyError(
        getActionErrorMessage(error, "We couldn't refresh Spotify access right now."),
      );
      setIsRepairingSpotify(false);
    }
  }, [startSocialOAuth]);

  const hasSpotifyPersonalization =
    spotifyPersonalization !== undefined && spotifyPersonalization !== null;
  const spotifyLastSyncedLabel = hasSpotifyPersonalization
    ? new Date(spotifyPersonalization.lastSyncedAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    : null;
  const shouldShowSpotifyRepairAction =
    spotifyErrorCode === "spotify_reconnect_required" ||
    spotifyErrorCode === "spotify_not_connected";

  return (
    <motion.div
      variants={panelFade}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      <AccountManagementPanel />

      {/* Appearance */}
      <div>
        <FanSectionTitle icon={Settings} title="Appearance" />
        <div className="bg-card border border-border rounded-xl p-4">
          <ThemeToggleRow />
        </div>
      </div>

      {/* Spotify */}
      <div>
        <FanSectionTitle icon={Music} title="Spotify" />
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Fan Taste Sync
                  </p>
                  <span className="rounded-full border border-fan/20 bg-fan/10 px-2 py-0.5 text-[10px] font-semibold   text-fan">
                    Web only
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Sync your top artists to improve local show ranking and reveal
                  Spotify picks in discovery.
                </p>
              </div>
              {spotifyLastSyncedLabel ? (
                <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                  Synced {spotifyLastSyncedLabel}
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void handleSpotifySync()}
              disabled={isSyncingSpotify}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-fan px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-fan/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSyncingSpotify ? "Syncing Spotify..." : "Sync from Spotify"}
            </button>

            {shouldShowSpotifyRepairAction ? (
              <button
                type="button"
                onClick={() => void handleRepairSpotifyAccess()}
                disabled={isRepairingSpotify}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-fan/30 hover:text-fan disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isRepairingSpotify
                  ? "Refreshing Spotify access..."
                  : "Refresh Spotify access"}
              </button>
            ) : null}

            {spotifyError ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                <p className="text-sm text-red-500">{spotifyError}</p>
              </div>
            ) : null}

            {spotifyNotice ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <p className="text-sm text-emerald-600">{spotifyNotice}</p>
              </div>
            ) : null}

            {spotifyPersonalization === undefined ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                Loading Spotify sync state...
              </div>
            ) : hasSpotifyPersonalization ? (
              <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex flex-wrap gap-2">
                  {spotifyPersonalization.topGenres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border px-2.5 py-1 text-[10px] font-semibold  "
                      style={{
                        color: GENRE_COLORS[genre as Genre],
                        borderColor: `${GENRE_COLORS[genre as Genre]}33`,
                        backgroundColor: `${GENRE_COLORS[genre as Genre]}14`,
                      }}
                    >
                      {genre}
                    </span>
                  ))}
                </div>

                {spotifyPersonalization.topArtists.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold  tracking-[0.18em] text-muted-foreground">
                      Top Spotify Artists
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {spotifyPersonalization.topArtists.map((artist) => (
                        <span
                          key={artist.spotifyArtistId}
                          className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground"
                        >
                          {artist.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {spotifyPersonalization.matchedBandCount} local band
                      {spotifyPersonalization.matchedBandCount === 1 ? "" : "s"} matched
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Matches come from band Spotify links first, then exact
                      band-name equality.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSpotifyClear()}
                    disabled={isClearingSpotify}
                    className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-red-500/30 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isClearingSpotify ? "Clearing..." : "Clear Personalization"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border px-4 py-4">
                <p className="text-sm font-medium text-foreground">
                  No Spotify taste synced yet
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Connect Spotify from Social accounts in this tab, then run your
                  first sync.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workspace */}
      <div>
        <FanSectionTitle icon={Users} title="Workspace" />
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
            <button
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
            </button>
          )}
        </div>
      </div>

    </motion.div>
  );
}
