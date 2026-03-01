"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { SignOutButton } from "@clerk/nextjs";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  MapPin,
  Users,
  Music,
  Settings,
  LogOut,
  Edit,
  Instagram,
  Youtube,
  ExternalLink,
  Crown,
  Shield,
  X,
} from "lucide-react";
import { useBandPastShows, useCurrentBand } from "@/hooks/useBand";
import { EditBandProfileModal } from "@/components/band/EditBandProfileModal";
import { BandMediaSlotsSection } from "@/components/band/slots/BandMediaSlotsSection";
import { PastShowFlyerSection } from "@/components/events/PastShowFlyerSection";
import { ProfileWorkspaceSwitcher } from "@/components/profile/ProfileWorkspaceSwitcher";
import { AvatarImage } from "@/components/ui/OptimizedImage";
import { GENRE_COLORS } from "@ear-plug/shared/constants";
import { getInitials } from "@ear-plug/shared/utils";
import { cn } from "@/lib/utils";
import type { BandInviteAssignableUser, Genre } from "@ear-plug/shared/types";

const PANEL_TRANSITION_MS = 220;

export function BandProfileView() {
  const { band, bandWithStats, isLoading } = useCurrentBand();
  const { pastShows, isLoading: isPastShowsLoading } = useBandPastShows(band?._id);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isSettingsMenuVisible, setIsSettingsMenuVisible] = useState(false);
  const settingsMenuCloseTimeout = useRef<number | null>(null);
  const [inviteQuery, setInviteQuery] = useState("");
  const [selectedInviteUser, setSelectedInviteUser] =
    useState<BandInviteAssignableUser | null>(null);
  const [inviteSuggestions, setInviteSuggestions] = useState<BandInviteAssignableUser[]>([]);
  const [showInviteSuggestions, setShowInviteSuggestions] = useState(false);
  const [isSearchingInviteUsers, setIsSearchingInviteUsers] = useState(false);
  const inviteAutocompleteRef = useRef<HTMLDivElement | null>(null);
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const convex = useConvex();

  const myBands = useQuery(api.bands.listMyBands);
  const activeMembership = myBands?.find((entry) => entry.band._id === band?._id);
  const memberRole = activeMembership?.membership.role;
  const canEditBandProfile = memberRole === "owner" || memberRole === "admin";
  const canManageMembers = memberRole === "owner" || memberRole === "admin";
  const canTransferOwnership = memberRole === "owner";

  const members = useQuery(
    api.bandMembers.listMembers,
    band ? { bandId: band._id } : "skip"
  );
  const invites = useQuery(
    api.bandMembers.listBandInvites,
    band && canManageMembers ? { bandId: band._id } : "skip"
  );

  const inviteExistingUser = useMutation(api.bandMembers.inviteExistingUser);
  const updateMemberRole = useMutation(api.bandMembers.updateMemberRole);
  const removeMember = useMutation(api.bandMembers.removeMember);
  const revokeInvite = useMutation(api.bandMembers.revokeInvite);
  const transferOwnership = useMutation(api.bandMembers.transferOwnership);

  useEffect(() => {
    return () => {
      if (settingsMenuCloseTimeout.current !== null) {
        window.clearTimeout(settingsMenuCloseTimeout.current);
      }
    };
  }, []);

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
      if (!band) {
        return [];
      }
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
      normalizedQuery.toLowerCase() ===
        selectedInviteUser.name.trim().toLowerCase()
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
          setInviteError(
            error instanceof Error ? error.message : "Failed to search users."
          );
          setInviteSuggestions([]);
          setShowInviteSuggestions(true);
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearchingInviteUsers(false);
          }
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

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 bg-night">
        <div className="animate-shimmer space-y-4">
          <div className="h-32 bg-night-tertiary border-2 border-zinc-800" />
          <div className="h-8 bg-night-tertiary w-1/2" />
        </div>
      </div>
    );
  }

  if (!band) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night">
        <p className="text-zinc-500">No band profile found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6 bg-night overflow-x-hidden">
      {/* Header */}
      <header className="relative bg-night-secondary border-b-2 border-lime/20 p-4 sm:p-6 overflow-visible">
        {/* Subtle gradient accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
            <ProfileWorkspaceSwitcher className="flex-1 min-w-0" variant="header" />
            <button
              type="button"
              onClick={openSettingsMenu}
              className="p-2 flex items-center justify-center hover:bg-night-tertiary border border-zinc-800 hover:border-lime/30 transition-colors touch-target"
              aria-label="Open band settings"
            >
              <Settings className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Band Card */}
          <div className="bg-night-tertiary/80 backdrop-blur-sm border-2 border-zinc-800 p-3 sm:p-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 overflow-hidden bg-night-secondary border-2 border-lime/30 flex-shrink-0">
                {band.image ? (
                  <Image
                    src={band.image}
                    alt={band.name}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl sm:text-2xl font-bold text-lime">
                    {getInitials(band.name)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <h2 className="flex-1 min-w-0 text-lg sm:text-xl font-bold text-white uppercase tracking-tight leading-tight [overflow-wrap:anywhere]">
                    {band.name}
                  </h2>
                  {canEditBandProfile && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="p-2 hover:bg-night-tertiary border border-zinc-800 hover:border-lime/30 transition-colors touch-target shrink-0"
                      aria-label="Edit band profile"
                    >
                      <Edit className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(band.genres || []).map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] leading-none font-bold uppercase tracking-wider text-night"
                      style={{ backgroundColor: GENRE_COLORS[g as Genre] }}
                    >
                      <Music className="w-2.5 h-2.5" />
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-2 text-sm sm:text-xs text-zinc-300">
                  <span className="inline-flex items-start gap-1 leading-tight">
                    <MapPin className="w-3.5 h-3.5 text-lime shrink-0 mt-0.5 sm:mt-0" />
                    {band.location}
                  </span>
                  {band.memberCount && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-violet shrink-0" />
                      {band.memberCount} members
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Bio */}
      {band.bio && (
        <section className="p-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-2">
            About
          </h3>
          <p className="text-zinc-400 leading-relaxed">
            {band.bio}
          </p>
        </section>
      )}

      {/* Social Links */}
      {band.socialLinks && (
        <section className="p-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
            Social Links
          </h3>
          <div className="flex flex-wrap gap-2">
            {band.socialLinks.spotify && (
              <SocialButton
                href={band.socialLinks.spotify}
                icon="spotify"
                label="Spotify"
              />
            )}
            {band.socialLinks.appleMusic && (
              <SocialButton
                href={band.socialLinks.appleMusic}
                icon="apple"
                label="Apple Music"
              />
            )}
            {band.socialLinks.instagram && (
              <SocialButton
                href={band.socialLinks.instagram}
                icon="instagram"
                label="Instagram"
              />
            )}
            {band.socialLinks.youtube && (
              <SocialButton
                href={band.socialLinks.youtube}
                icon="youtube"
                label="YouTube"
              />
            )}
            {band.socialLinks.tiktok && (
              <SocialButton
                href={band.socialLinks.tiktok}
                icon="tiktok"
                label="TikTok"
              />
            )}
            {band.socialLinks.website && (
              <SocialButton
                href={band.socialLinks.website}
                icon="website"
                label="Website"
              />
            )}
          </div>
        </section>
      )}

      {/* Stats Summary */}
      {bandWithStats?.stats && (
        <section className="p-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Shows This Month"
              value={bandWithStats.stats.showsThisMonth}
              accent="lime"
            />
            <StatCard label="Total RSVPs" value={bandWithStats.stats.totalRsvps} accent="violet" />
            <StatCard label="Followers" value={bandWithStats.stats.newFans} accent="lime" />
          </div>
        </section>
      )}

      {/* Media Slots */}
      <section className="p-4">
        <BandMediaSlotsSection
          bandId={band._id}
          canManageSlots={canEditBandProfile}
          title="Photos & Videos"
          description="Manage six profile media slots for fans to see."
        />
      </section>

      <section className="p-4">
        <PastShowFlyerSection
          shows={pastShows}
          emptyMessage="No past shows yet."
          isLoading={isPastShowsLoading}
        />
      </section>

      {/* Sign Out */}
      <div className="p-4 pt-8">
        <SignOutButton>
          <button className="w-full flex items-center justify-center gap-2 py-4 border-2 border-red-500/30 text-red-400 font-bold uppercase tracking-wider text-sm hover:bg-red-500/10 transition-colors touch-target">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </SignOutButton>
      </div>

      {isSettingsMenuOpen && (
        <div
          className={cn(
            "fixed inset-0 z-[60] transition-opacity duration-200",
            isSettingsMenuVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <button
            type="button"
            onClick={closeSettingsMenu}
            className={cn(
              "absolute inset-0 bg-black/70 transition-opacity duration-200",
              isSettingsMenuVisible ? "opacity-100" : "opacity-0"
            )}
            aria-label="Close band settings menu"
          />

          <aside
            className={cn(
              "absolute right-0 top-0 h-full w-full max-w-xl bg-night-secondary border-l-2 border-lime/20 overflow-y-auto transition-transform duration-200 ease-out will-change-transform",
              isSettingsMenuVisible ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="sticky top-0 z-10 bg-night-secondary border-b border-zinc-800 p-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                Band Settings
              </h3>
              <button
                type="button"
                onClick={closeSettingsMenu}
                className="p-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-lime/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <section className="p-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
                Members
              </h4>
              {!canManageMembers && (
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                  Member access is read-only.
                </p>
              )}

              <div className="bg-night-tertiary border-2 border-zinc-800 p-4 space-y-3">
                {members === undefined ? (
                  <p className="text-zinc-500 text-sm">Loading members...</p>
                ) : members.length === 0 ? (
                  <p className="text-zinc-500 text-sm">No members found.</p>
                ) : (
                  members.map((entry) => (
                    <div
                      key={entry.membership._id}
                      className="flex items-center justify-between gap-3 border border-zinc-800 bg-night-secondary px-3 py-2"
                    >
                      <div>
                        <p className="text-white text-sm font-semibold">{entry.user.name}</p>
                        <p className="text-zinc-500 text-xs uppercase tracking-wider">
                          {entry.membership.role}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {entry.membership.role === "owner" ? (
                          <Crown className="w-4 h-4 text-lime" />
                        ) : entry.membership.role === "admin" ? (
                          <Shield className="w-4 h-4 text-violet" />
                        ) : null}

                        {canManageMembers && entry.membership.role !== "owner" && (
                          <>
                            <button
                              onClick={() =>
                                updateMemberRole({
                                  bandId: band._id,
                                  memberUserId: entry.user._id,
                                  role:
                                    entry.membership.role === "member"
                                      ? "admin"
                                      : "member",
                                })
                              }
                              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-zinc-700 text-zinc-300 hover:border-lime/30"
                            >
                              {entry.membership.role === "member"
                                ? "Make Admin"
                                : "Make Member"}
                            </button>
                            <button
                              onClick={() =>
                                removeMember({
                                  bandId: band._id,
                                  memberUserId: entry.user._id,
                                })
                              }
                              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-red-500/40 text-red-400 hover:bg-red-500/10"
                            >
                              Remove
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
                            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-violet/40 text-violet hover:bg-violet/10"
                          >
                            Transfer Owner
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {canManageMembers && (
              <section className="p-4 pt-0">
                <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
                  Invite Members
                </h4>
                <div className="bg-night-tertiary border-2 border-zinc-800 p-4">
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                    <div className="relative flex-1" ref={inviteAutocompleteRef}>
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
                          if (inviteError) {
                            setInviteError(null);
                          }
                          setShowInviteSuggestions(nextValue.trim().length >= 2);
                        }}
                        onFocus={() => {
                          if (!selectedInviteUser && inviteQuery.trim().length >= 2) {
                            setShowInviteSuggestions(true);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setShowInviteSuggestions(false);
                          }
                        }}
                        placeholder="Search users by name..."
                        className="w-full bg-night-secondary border-2 border-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime"
                      />

                      {showInviteSuggestions && !selectedInviteUser && (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-50 border border-zinc-700 bg-night-secondary shadow-2xl overflow-hidden">
                          {isSearchingInviteUsers ? (
                            <p className="px-3 py-2 text-xs uppercase tracking-wider text-zinc-500">
                              Searching...
                            </p>
                          ) : inviteSuggestions.length === 0 ? (
                            <p className="px-3 py-2 text-xs uppercase tracking-wider text-zinc-500">
                              No users found
                            </p>
                          ) : (
                            <div className="max-h-64 overflow-y-auto">
                              {inviteSuggestions.map((candidate) => {
                                const stateBadge =
                                  candidate.inviteState === "already_member"
                                    ? "Already Member"
                                    : candidate.inviteState === "pending_invite"
                                      ? "Pending Invite"
                                      : null;
                                return (
                                  <button
                                    key={candidate.userId}
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => handleSelectInviteUser(candidate)}
                                    className="w-full px-3 py-2 text-left hover:bg-night-tertiary border-b border-zinc-800 last:border-b-0"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <AvatarImage
                                        src={candidate.avatar}
                                        alt={candidate.name}
                                        size={28}
                                        className="rounded-full border border-zinc-700 shrink-0"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm text-white truncate">
                                          {candidate.name}
                                        </p>
                                      </div>
                                      {stateBadge && (
                                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 border border-zinc-700 text-zinc-400 shrink-0">
                                          {stateBadge}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <select
                      value={inviteRole}
                      onChange={(event) =>
                        setInviteRole(event.target.value as "admin" | "member")
                      }
                      className="bg-night-secondary border-2 border-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-lime"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={handleInvite}
                      disabled={
                        isInviting ||
                        !selectedInviteUser ||
                        selectedInviteUser.inviteState !== "eligible"
                      }
                      className={cn(
                        "px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 transition-colors",
                        isInviting ||
                          !selectedInviteUser ||
                          selectedInviteUser.inviteState !== "eligible"
                          ? "border-zinc-700 text-zinc-500"
                          : "border-lime bg-lime text-night hover:bg-transparent hover:text-lime"
                      )}
                    >
                      {isInviting ? "Inviting..." : "Invite"}
                    </button>
                  </div>

                  {selectedInviteUser && (
                    <p className="mt-2 text-[11px] uppercase tracking-wider text-zinc-500">
                      Selected: {selectedInviteUser.name}
                    </p>
                  )}

                  {inviteNotice && (
                    <p className="mt-2 text-xs uppercase tracking-wider text-lime font-semibold">
                      {inviteNotice}
                    </p>
                  )}

                  {inviteError && (
                    <p className="mt-2 text-xs uppercase tracking-wider text-red-400 font-semibold">
                      {inviteError}
                    </p>
                  )}

                  <div className="mt-4 space-y-2">
                    {(invites ?? []).map((invite) => (
                      <div
                        key={invite._id}
                        className="flex items-center justify-between border border-zinc-800 bg-night-secondary px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <AvatarImage
                            src={invite.targetUser?.avatar}
                            alt={invite.targetUser?.name ?? "Invited user"}
                            size={28}
                            className="rounded-full border border-zinc-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">
                              {invite.targetUser?.name ?? "Invited user"}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                              {invite.role} • {invite.status}
                            </p>
                          </div>
                        </div>
                        {invite.status === "pending" && (
                          <button
                            onClick={() => revokeInvite({ inviteId: invite._id })}
                            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-red-500/40 text-red-400 hover:bg-red-500/10"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </aside>
        </div>
      )}

      {/* Edit Profile Modal */}
      <EditBandProfileModal
        isOpen={canEditBandProfile && showEditModal}
        onClose={() => setShowEditModal(false)}
        band={{
          _id: band._id,
          name: band.name,
          genres: band.genres || [],
          location: band.location,
          bio: band.bio,
          memberCount: band.memberCount,
          image: band.image,
          socialLinks: band.socialLinks,
        }}
      />
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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-4 py-2 bg-night-tertiary border-2 border-zinc-800 text-zinc-300 hover:border-lime/30 hover:text-lime transition-colors text-xs font-bold uppercase tracking-wider"
    >
      {getIcon()}
      <span>{label}</span>
    </a>
  );
}

function StatCard({ label, value, accent = "lime" }: { label: string; value: number; accent?: "lime" | "violet" }) {
  return (
    <div className="bg-night-tertiary border-2 border-zinc-800 p-4 text-center relative overflow-hidden hover:border-lime/20 transition-colors">
      <div className={cn(
        "absolute top-0 left-0 right-0 h-0.5",
        accent === "lime" ? "bg-lime" : "bg-violet"
      )} />
      <div className={cn(
        "text-2xl font-bold",
        accent === "lime" ? "text-lime" : "text-violet"
      )}>
        {value}
      </div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}
