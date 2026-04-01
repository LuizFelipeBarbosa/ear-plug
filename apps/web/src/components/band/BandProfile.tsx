"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { SignOutButton } from "@clerk/nextjs";
import { useConvex, useMutation, useQuery } from "convex/react";
import {
  MapPin,
  Users,
  Music,
  Settings,
  LogOut,
  Edit3,
  Instagram,
  Youtube,
  ExternalLink,
  Crown,
  Shield,
  X,
  ChevronRight,
  Calendar,
  Heart,
  Ticket,
  Sparkles,
  Image as ImageIcon,
  UserPlus,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useBandPastShows, useCurrentBand } from "@/hooks/useBand";
import { useProfileContext } from "@/hooks/useProfileContext";
import { EditBandProfileModal } from "@/components/band/EditBandProfileModal";
import { BandMediaSlotsSection } from "@/components/band/slots/BandMediaSlotsSection";
import { PastShowFlyerSection } from "@/components/events/PastShowFlyerSection";
import { ProfileWorkspaceSwitcher } from "@/components/profile/ProfileWorkspaceSwitcher";
import { IconBadge } from "@/components/ui/IconBadge";
import { MobileTabRail } from "@/components/ui/MobileTabRail";
import { TabPanel } from "@/components/ui/TabPanel";
import { AvatarImage } from "@/components/ui/OptimizedImage";
import { GENRE_COLORS } from "@ear-plug/shared/constants";
import { getInitials } from "@ear-plug/shared/utils";
import type { BandInviteAssignableUser, Genre } from "@ear-plug/shared/types";
import { cn } from "@/lib/utils";
import { panelFade } from "@/lib/motion/presets";

const PANEL_TRANSITION_MS = 250;

type TabType = "overview" | "media" | "shows" | "settings";

export function BandProfileView() {
  const { band, bandWithStats, isLoading } = useCurrentBand();
  const { pastShows, isLoading: isPastShowsLoading } = useBandPastShows(band?._id);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isSettingsMenuVisible, setIsSettingsMenuVisible] = useState(false);
  const settingsMenuCloseTimeout = useRef<number | null>(null);
  const [inviteQuery, setInviteQuery] = useState("");
  const [selectedInviteUser, setSelectedInviteUser] = useState<BandInviteAssignableUser | null>(null);
  const [inviteSuggestions, setInviteSuggestions] = useState<BandInviteAssignableUser[]>([]);
  const [showInviteSuggestions, setShowInviteSuggestions] = useState(false);
  const [isSearchingInviteUsers, setIsSearchingInviteUsers] = useState(false);
  const inviteAutocompleteRef = useRef<HTMLDivElement | null>(null);
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const convex = useConvex();
  const { setPersonalMode } = useProfileContext();
  const myBands = useQuery(api.bands.listMyBands);
  const activeMembership = myBands?.find((entry) => entry.band._id === band?._id);
  const memberRole = activeMembership?.membership.role;
  const canEditBandProfile = memberRole === "owner" || memberRole === "admin";
  const canManageMembers = memberRole === "owner" || memberRole === "admin";
  const canTransferOwnership = memberRole === "owner";
  const members = useQuery(api.bandMembers.listMembers, band ? { bandId: band._id } : "skip");
  const invites = useQuery(
    api.bandMembers.listBandInvites,
    band && canManageMembers ? { bandId: band._id } : "skip"
  );
  const inviteExistingUser = useMutation(api.bandMembers.inviteExistingUser);
  const updateMemberRole = useMutation(api.bandMembers.updateMemberRole);
  const removeMember = useMutation(api.bandMembers.removeMember);
  const revokeInvite = useMutation(api.bandMembers.revokeInvite);
  const transferOwnership = useMutation(api.bandMembers.transferOwnership);
  const deleteBandMutation = useMutation(api.bands.deleteBand);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingBand, setIsDeletingBand] = useState(false);
  const openEditModal = useCallback(() => setShowEditModal(true), []);
  const closeEditModal = useCallback(() => setShowEditModal(false), []);

  useEffect(() => {
    return () => {
      if (settingsMenuCloseTimeout.current !== null) {
        window.clearTimeout(settingsMenuCloseTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    setDeleteConfirmationText("");
    setDeleteError(null);
  }, [band?._id, isSettingsMenuOpen]);

  const openSettingsMenu = () => {
    if (settingsMenuCloseTimeout.current !== null) {
      window.clearTimeout(settingsMenuCloseTimeout.current);
      settingsMenuCloseTimeout.current = null;
    }
    setIsSettingsMenuOpen(true);
    requestAnimationFrame(() => {
      setIsSettingsMenuVisible(true);
    });
  };

  const closeSettingsMenu = () => {
    setIsSettingsMenuVisible(false);
    if (settingsMenuCloseTimeout.current !== null) {
      window.clearTimeout(settingsMenuCloseTimeout.current);
    }
    settingsMenuCloseTimeout.current = window.setTimeout(() => {
      setIsSettingsMenuOpen(false);
      settingsMenuCloseTimeout.current = null;
    }, PANEL_TRANSITION_MS);
  };

  const handleInvite = async () => {
    if (!band || !selectedInviteUser || selectedInviteUser.inviteState !== "eligible") {
      return;
    }
    setIsInviting(true);
    setInviteError(null);
    setInviteNotice(null);
    try {
      const result = await inviteExistingUser({
        bandId: band._id,
        targetUserId: selectedInviteUser.userId as Id<"users">,
        role: inviteRole,
      });
      if (result.action === "already_member") {
        setInviteNotice("Selected user is already a band member.");
        return;
      }
      if (result.action === "already_pending") {
        setInviteNotice("Selected user already has a pending invite.");
        return;
      }
      setInviteNotice("Invite sent.");
      setInviteQuery("");
      setSelectedInviteUser(null);
      setInviteSuggestions([]);
      setShowInviteSuggestions(false);
    } catch (error: any) {
      setInviteError(error?.message || "Failed to invite user");
    } finally {
      setIsInviting(false);
    }
  };

  const searchAssignableUsers = useCallback(
    async (query: string, limit = 8) => {
      if (!band) return [];
      const result = await convex.query(api.bandMembers.searchAssignableBandInviteUsers, {
        bandId: band._id,
        query,
        limit,
      });
      return result.users ?? [];
    },
    [band, convex]
  );

  useEffect(() => {
    if (!isSettingsMenuOpen) {
      setShowInviteSuggestions(false);
      setInviteSuggestions([]);
    }
  }, [isSettingsMenuOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!inviteAutocompleteRef.current) return;
      if (!inviteAutocompleteRef.current.contains(event.target as Node)) {
        setShowInviteSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!band || !canManageMembers) {
      setInviteSuggestions([]);
      setShowInviteSuggestions(false);
      setIsSearchingInviteUsers(false);
      return;
    }
    const normalizedQuery = inviteQuery.trim();
    if (normalizedQuery.length < 2) {
      setInviteSuggestions([]);
      setShowInviteSuggestions(false);
      setIsSearchingInviteUsers(false);
      return;
    }
    if (
      selectedInviteUser &&
      normalizedQuery.toLowerCase() === selectedInviteUser.name.trim().toLowerCase()
    ) {
      setInviteSuggestions([]);
      setShowInviteSuggestions(false);
      setIsSearchingInviteUsers(false);
      return;
    }
    let cancelled = false;
    setIsSearchingInviteUsers(true);
    const timeoutId = window.setTimeout(() => {
      void searchAssignableUsers(normalizedQuery, 8)
        .then((users) => {
          if (cancelled) return;
          setInviteSuggestions(users as BandInviteAssignableUser[]);
          setShowInviteSuggestions(true);
        })
        .catch((error) => {
          if (cancelled) return;
          setInviteError(error instanceof Error ? error.message : "Failed to search users.");
          setInviteSuggestions([]);
          setShowInviteSuggestions(true);
        })
        .finally(() => {
          if (!cancelled) setIsSearchingInviteUsers(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [band, canManageMembers, inviteQuery, searchAssignableUsers, selectedInviteUser]);

  const handleSelectInviteUser = (user: BandInviteAssignableUser) => {
    setSelectedInviteUser(user);
    setInviteQuery(user.name);
    setInviteSuggestions([]);
    setShowInviteSuggestions(false);
    setInviteError(null);
    setInviteNotice(null);
  };

  const deletePhrase = band ? `I CONFIRM I WANT TO DELETE ${band.name}` : "";
  const isDeletePhraseMatch = deleteConfirmationText.trim() === deletePhrase;

  const handleDeleteBand = async () => {
    if (!band || !canTransferOwnership || !isDeletePhraseMatch) {
      return;
    }

    setDeleteError(null);
    setIsDeletingBand(true);
    try {
      await deleteBandMutation({
        bandId: band._id,
        confirmationText: deleteConfirmationText,
      });
      setPersonalMode();
      setDeleteConfirmationText("");
      closeSettingsMenu();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete band."
      );
    } finally {
      setIsDeletingBand(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-24 bg-background overflow-x-hidden">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-band/10 via-band/5 to-transparent h-48" />
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
          <p className="text-lg font-bold text-foreground mb-2">No band profile found</p>
          <p className="text-sm text-muted-foreground">Create a band to get started</p>
        </motion.div>
      </div>
    );
  }

  const editModalBand = {
    _id: band._id,
    name: band.name,
    genres: band.genres || [],
    location: band.location,
    bio: band.bio,
    memberCount: band.memberCount,
    image: band.image,
    socialLinks: band.socialLinks,
  };

  const stats = bandWithStats?.stats;

  return (
    <div className="min-h-screen pb-24 bg-background overflow-x-hidden">
      {/* Header Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-band/10 via-band/5 to-transparent h-64" />
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-band/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      </div>

      {/* Profile Header */}
      <header className="relative px-4 pt-4 pb-4">
        {/* Top Actions */}
        <div className="flex items-center justify-between mb-6">
          <ProfileWorkspaceSwitcher className="flex-1 min-w-0" variant="header" />
          <motion.button

            onClick={openSettingsMenu}
            className="ml-3 p-2.5 bg-card border border-border rounded-xl hover:border-band/30 hover:bg-band/5 transition-colors touch-target shadow-sm"
            aria-label="Open band settings"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </div>

        {/* Band Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <motion.div

                className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-band/20 to-band/5 border-2 border-band/20 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
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
                  <span className="text-2xl sm:text-3xl font-bold text-band">
                    {getInitials(band.name)}
                  </span>
                )}
              </motion.div>
              {canEditBandProfile && (
                <motion.button

                  onClick={openEditModal}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-band text-white rounded-lg shadow-lg shadow-band/30 hover:bg-band/90 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {band.name}
              </h1>
              
              {/* Genres */}
              {band.genres && band.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {band.genres.slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-white rounded-full"
                      style={{ backgroundColor: GENRE_COLORS[g as Genre] }}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
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
                  <MapPin className="w-3.5 h-3.5 text-band" />
                  {band.location}
                </span>
                {band.memberCount && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-band" />
                    {band.memberCount} members
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          {stats && (
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/50 pt-4 sm:gap-3">
              <QuickStat icon={Calendar} value={stats.showsThisMonth} label="This Month" />
              <QuickStat icon={Heart} value={stats.newFans} label="Followers" />
              <QuickStat icon={Ticket} value={stats.totalRsvps} label="Total RSVPs" />
            </div>
          )}
        </motion.div>
      </header>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border">
        <MobileTabRail
          items={[
            { id: "overview", label: "Overview", icon: Sparkles },
            { id: "media", label: "Media", icon: ImageIcon },
            { id: "shows", label: "Shows", icon: Calendar },
            { id: "settings", label: "Settings", icon: Settings },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as TabType)}
          layoutId="activeBandTabIndicator"
          tone="band"
        />
      </div>

      {/* Tab Content */}
      <main className="px-4 pt-4">
        <TabPanel isActive={activeTab === "overview"}>
            <OverviewTab
              band={band}
              stats={stats}
              pastShows={pastShows}
              isPastShowsLoading={isPastShowsLoading}
            />
        </TabPanel>
        <TabPanel isActive={activeTab === "media"}>
          <MediaTab bandId={band._id} canManageSlots={canEditBandProfile} />
        </TabPanel>
        <TabPanel isActive={activeTab === "shows"}>
            <ShowsTab
              pastShows={pastShows}
              isPastShowsLoading={isPastShowsLoading}
            />
        </TabPanel>
        <TabPanel isActive={activeTab === "settings"}>
            <SettingsTab
              onOpenSettingsMenu={openSettingsMenu}
              canManageMembers={canManageMembers}
            />
        </TabPanel>
      </main>

      {/* Settings Slide-over Panel */}
      <AnimatePresence>
        {isSettingsMenuOpen && (
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
              onClick={closeSettingsMenu}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-label="Close band settings menu"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-border bg-card safe-area-inset-bottom"
            >
              {/* Panel Header */}
              <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-band/10 border border-band/20 rounded-xl flex items-center justify-center">
                    <Settings className="w-5 h-5 text-band" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Band Settings</h3>
                </div>
                <motion.button

                  onClick={closeSettingsMenu}
                  className="p-2 border border-border text-muted-foreground hover:text-foreground hover:border-band/30 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              <div className="space-y-6 p-4 pb-6">
                {/* Members Section */}
                <section>
                  <h4 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    <Users className="w-3.5 h-3.5" />
                    Members ({members?.length || 0})
                  </h4>
                  {!canManageMembers && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Member access is read-only.
                    </p>
                  )}
                  <div className="space-y-2">
                    {members === undefined ? (
                      <div className="h-20 bg-muted rounded-xl animate-shimmer" />
                    ) : members.length === 0 ? (
                      <EmptyState icon={Users} title="No members found" description="Invite members to join your band" />
                    ) : (
                      members.map((entry) => (
                        <div
                          key={entry.membership._id}
                          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <AvatarImage
                              src={entry.user.avatar}
                              alt={entry.user.name}
                              size={36}
                              className="rounded-full border border-border shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {entry.user.name}
                              </p>
                              <div className="flex items-center gap-1.5">
                                {entry.membership.role === "owner" ? (
                                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                                ) : entry.membership.role === "admin" ? (
                                  <Shield className="w-3.5 h-3.5 text-band" />
                                ) : null}
                                <p className="text-xs text-muted-foreground capitalize">
                                  {entry.membership.role}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                            {canManageMembers && entry.membership.role !== "owner" && (
                              <>
                                <button
                      
                                  onClick={() =>
                                    updateMemberRole({
                                      bandId: band._id,
                                      memberUserId: entry.user._id,
                                      role: entry.membership.role === "member" ? "admin" : "member",
                                    })
                                  }
                                  className="p-1.5 text-xs font-medium border border-border text-muted-foreground hover:border-band/30 hover:text-band rounded-lg transition-colors"
                                  title={entry.membership.role === "member" ? "Make Admin" : "Make Member"}
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                      
                                  onClick={() =>
                                    removeMember({
                                      bandId: band._id,
                                      memberUserId: entry.user._id,
                                    })
                                  }
                                  className="p-1.5 text-xs font-medium border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                  title="Remove member"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {canTransferOwnership && entry.membership.role !== "owner" && (
                              <button
                    
                                onClick={() =>
                                  transferOwnership({
                                    bandId: band._id,
                                    newOwnerUserId: entry.user._id,
                                  })
                                }
                                className="p-1.5 text-xs font-medium border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                                title="Transfer ownership"
                              >
                                <Crown className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Invite Section */}
                {canManageMembers && (
                  <section>
                    <h4 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      <UserPlus className="w-3.5 h-3.5" />
                      Invite Members
                    </h4>
                    <div className="bg-muted/50 border border-border rounded-xl p-4">
                      <div className="flex flex-col gap-3">
                        <div className="relative" ref={inviteAutocompleteRef}>
                          <input
                            type="text"
                            value={inviteQuery}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setInviteQuery(nextValue);
                              if (selectedInviteUser && nextValue !== selectedInviteUser.name) {
                                setSelectedInviteUser(null);
                              }
                              setInviteNotice(null);
                              if (inviteError) setInviteError(null);
                              setShowInviteSuggestions(nextValue.trim().length >= 2);
                            }}
                            onFocus={() => {
                              if (!selectedInviteUser && inviteQuery.trim().length >= 2) {
                                setShowInviteSuggestions(true);
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") setShowInviteSuggestions(false);
                            }}
                            placeholder="Search users by name..."
                            className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band/50 focus:ring-2 focus:ring-band/10 transition-colors transition-shadow"
                          />
                          {showInviteSuggestions && !selectedInviteUser && (
                            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 border border-border bg-card shadow-xl rounded-xl overflow-hidden">
                              {isSearchingInviteUsers ? (
                                <div className="px-3 py-3 text-xs text-muted-foreground flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-band/30 border-t-band rounded-full animate-spin" />
                                  Searching...
                                </div>
                              ) : inviteSuggestions.length === 0 ? (
                                <p className="px-3 py-3 text-xs text-muted-foreground">
                                  No users found
                                </p>
                              ) : (
                                <div className="max-h-64 overflow-y-auto">
                                  {inviteSuggestions.map((candidate) => {
                                    const stateBadge =
                                      candidate.inviteState === "already_member"
                                        ? "Member"
                                        : candidate.inviteState === "pending_invite"
                                        ? "Pending"
                                        : null;
                                    return (
                                      <button
                                        key={candidate.userId}
                                        type="button"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => handleSelectInviteUser(candidate)}
                                        className="w-full px-3 py-2.5 text-left hover:bg-muted border-b border-border last:border-b-0 flex items-center gap-3"
                                      >
                                        <AvatarImage
                                          src={candidate.avatar}
                                          alt={candidate.name}
                                          size={32}
                                          className="rounded-full border border-border shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm text-foreground truncate">
                                            {candidate.name}
                                          </p>
                                        </div>
                                        {stateBadge && (
                                          <span className="text-[10px] px-2 py-0.5 bg-muted border border-border text-muted-foreground rounded-full shrink-0">
                                            {stateBadge}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <select
                            value={inviteRole}
                            onChange={(event) => setInviteRole(event.target.value as "admin" | "member")}
                            className="bg-card border border-border px-3 py-2.5 text-sm text-foreground rounded-xl focus:outline-none focus:border-band/50"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <motion.button

                            onClick={handleInvite}
                            disabled={
                              isInviting || !selectedInviteUser || selectedInviteUser.inviteState !== "eligible"
                            }
                            className={cn(
                              "flex-1 py-2.5 px-4 font-medium text-sm rounded-xl transition-colors transition-shadow flex items-center justify-center gap-2",
                              isInviting || !selectedInviteUser || selectedInviteUser.inviteState !== "eligible"
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : "bg-band text-white hover:bg-band/90 shadow-lg shadow-band/25"
                            )}
                          >
                            {isInviting ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Inviting...
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4" />
                                Invite
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>

                      {selectedInviteUser && (
                        <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                          Selected: <span className="text-foreground font-medium">{selectedInviteUser.name}</span>
                        </p>
                      )}

                      <AnimatePresence>
                        {inviteNotice && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-3 text-xs text-band font-medium bg-band/5 border border-band/20 rounded-lg px-3 py-2"
                          >
                            {inviteNotice}
                          </motion.p>
                        )}
                        {inviteError && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-3 text-xs text-red-500 font-medium bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2"
                          >
                            {inviteError}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      {/* Pending Invites */}
                      {invites && invites.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border space-y-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Pending Invites</p>
                          {invites.map((invite) => (
                            <div
                              key={invite._id}
                              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2.5 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <AvatarImage
                                  src={invite.targetUser?.avatar}
                                  alt={invite.targetUser?.name ?? "Invited user"}
                                  size={28}
                                  className="rounded-full border border-border shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm text-foreground truncate">
                                    {invite.targetUser?.name ?? "Invited user"}
                                  </p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {invite.role}
                                  </p>
                                </div>
                              </div>
                              {invite.status === "pending" && (
                                <button
                      
                                  onClick={() => revokeInvite({ inviteId: invite._id })}
                                  className="px-2.5 py-1 text-xs font-medium border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Danger Zone */}
                {canTransferOwnership && band && (
                  <section>
                    <h4 className="flex items-center gap-2 text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">
                      <Trash2 className="w-3.5 h-3.5" />
                      Danger Zone
                    </h4>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Type the confirmation phrase exactly to permanently delete this band and all linked data.
                      </p>
                      <p className="text-xs font-semibold text-foreground break-words">
                        {deletePhrase}
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmationText}
                        onChange={(event) => {
                          setDeleteConfirmationText(event.target.value);
                          if (deleteError) setDeleteError(null);
                        }}
                        placeholder="Type confirmation phrase"
                        className="w-full bg-card border border-red-500/30 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10"
                      />
                      {deleteError && (
                        <p className="text-xs text-red-500">{deleteError}</p>
                      )}
                      <button
                        type="button"
                        onClick={handleDeleteBand}
                        disabled={!isDeletePhraseMatch || isDeletingBand}
                        className={cn(
                          "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors",
                          !isDeletePhraseMatch || isDeletingBand
                            ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
                            : "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                        {isDeletingBand ? "Deleting..." : "Delete Band"}
                      </button>
                    </div>
                  </section>
                )}

                {/* Sign Out */}
                <section>
                  <SignOutButton>
                    <motion.button

                      className="w-full flex items-center justify-center gap-2 py-3.5 border border-red-500/20 text-red-500 font-medium text-sm bg-red-500/5 hover:bg-red-500/10 transition-colors rounded-xl"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </motion.button>
                  </SignOutButton>
                </section>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <EditBandProfileModal
        isOpen={canEditBandProfile && showEditModal}
        onClose={closeEditModal}
        band={editModalBand}
      />
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
    <div className="flex min-w-0 flex-col items-center px-1 text-center">
      <IconBadge size="sm" className="mb-2">
        <Icon />
      </IconBadge>
      <span className="text-base font-semibold text-foreground sm:text-lg">{value}</span>
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground sm:text-[10px]">
        {label}
      </span>
    </div>
  );
}

// Overview Tab
function OverviewTab({
  band,
  stats,
  pastShows,
  isPastShowsLoading,
}: {
  band: any;
  stats: any;
  pastShows: any[];
  isPastShowsLoading: boolean;
}) {
  return (
    <motion.div
      variants={panelFade}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      {/* Bio Section */}
      {band.bio && (
        <div>
          <SectionTitle icon={Sparkles} title="About" />
          <div className="bg-card/50 border border-border rounded-2xl p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{band.bio}</p>
          </div>
        </div>
      )}

      {/* Social Links */}
      {band.socialLinks && Object.keys(band.socialLinks).length > 0 && (
        <div>
          <SectionTitle icon={ExternalLink} title="Social Links" />
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
        </div>
      )}

      {/* Recent Shows Preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={Calendar} title="Recent Shows" className="mb-0" />
          {pastShows.length > 0 && (
            <span className="text-xs text-muted-foreground">{pastShows.length} total</span>
          )}
        </div>
        <PastShowFlyerSection
          shows={pastShows.slice(0, 4)}
          emptyMessage="No past shows yet. Start creating events!"
          isLoading={isPastShowsLoading}
          tone="band"
        />
      </div>
    </motion.div>
  );
}

// Media Tab
function MediaTab({ bandId, canManageSlots }: { bandId: Id<"bands">; canManageSlots: boolean }) {
  return (
    <motion.div
      variants={panelFade}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      <div>
        <BandMediaSlotsSection
          bandId={bandId}
          canManageSlots={canManageSlots}
          title="Photos & Videos"
          description="Showcase your band with up to 6 photos and videos. Drag to reorder."
        />
      </div>
    </motion.div>
  );
}

// Shows Tab
function ShowsTab({
  pastShows,
  isPastShowsLoading,
}: {
  pastShows: any[];
  isPastShowsLoading: boolean;
}) {
  return (
    <motion.div
      variants={panelFade}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={Ticket} title="Show History" className="mb-0" />
          {pastShows.length > 0 && (
            <Badge variant="highlight">{pastShows.length} shows</Badge>
          )}
        </div>
        <PastShowFlyerSection
          shows={pastShows}
          emptyMessage="No past shows yet. Start creating events to build your history!"
          isLoading={isPastShowsLoading}
          tone="band"
        />
      </div>
    </motion.div>
  );
}

// Settings Tab
function SettingsTab({
  onOpenSettingsMenu,
  canManageMembers,
}: {
  onOpenSettingsMenu: () => void;
  canManageMembers: boolean;
}) {
  return (
    <motion.div
      variants={panelFade}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-5"
    >
      <div>
        <SectionTitle icon={Settings} title="Band Management" />
        <div className="space-y-3">
          <button

            onClick={onOpenSettingsMenu}
            className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-band/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-band/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-band" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Manage Members</p>
                <p className="text-xs text-muted-foreground">
                  {canManageMembers ? "Invite and manage band members" : "View band members"}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div>
        <SectionTitle icon={LogOut} title="Account" />
        <SignOutButton>
          <button

            className="w-full flex items-center justify-center gap-2 py-4 border border-red-500/20 text-red-500 font-medium text-sm bg-red-500/5 hover:bg-red-500/10 transition-colors rounded-xl"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </SignOutButton>
      </div>
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
          ? "bg-band/15 text-band border border-band/25"
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
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-muted/30 border border-dashed border-border rounded-2xl">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
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

      className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-muted-foreground hover:border-band/30 hover:text-band transition-colors text-xs font-medium rounded-xl"
    >
      {getIcon()}
      <span>{label}</span>
    </motion.a>
  );
}
