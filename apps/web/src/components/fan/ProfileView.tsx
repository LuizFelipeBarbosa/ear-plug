"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  Calendar,
  Check,
  Edit,
  LogOut,
  MapPin,
  Music,
  Plus,
  Settings,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useUser";
import { useSavedBands } from "@/hooks/useBand";
import { useSavedVenues } from "@/hooks/useVenues";
import { useProfileContext } from "@/hooks/useProfileContext";
import { EditProfileModal } from "@/components/ui/EditProfileModal";
import { ThemeToggleRow } from "@/components/ui/ThemeToggle";
import { CreateBandForm } from "@/components/band/CreateBandForm";
import { ProfileWorkspaceSwitcher } from "@/components/profile/ProfileWorkspaceSwitcher";
import { GENRE_COLORS } from "@ear-plug/shared/constants";
import { getInitials } from "@ear-plug/shared/utils";
import type { Genre } from "@ear-plug/shared/types";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const PANEL_TRANSITION_MS = 220;

export function FanProfileView() {
  const router = useRouter();
  const { user, updateProfile } = useCurrentUser();
  const { savedBands } = useSavedBands();
  const { savedVenues } = useSavedVenues();
  const { setBandMode } = useProfileContext();

  const myBands = useQuery(api.bands.listMyBands) ?? [];
  const pendingInvites = useQuery(api.bandMembers.listMyPendingInvites) ?? [];
  const acceptInvite = useMutation(api.bandMembers.acceptInvite);
  const declineInvite = useMutation(api.bandMembers.declineInvite);

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
    month: "long",
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

  return (
    <div className="min-h-screen pb-6 bg-night overflow-x-hidden">
      <header className="relative bg-night-secondary p-6 overflow-visible">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center justify-between mb-6 gap-3">
            <ProfileWorkspaceSwitcher className="flex-1 min-w-0" variant="header" />
            <button
              type="button"
              onClick={openWorkspaceMenu}
              className="p-2 flex items-center justify-center hover:bg-night-tertiary border border-zinc-800 hover:border-lime/30 transition-colors touch-target"
              aria-label="Open personal workspace menu"
            >
              <Settings className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <div className="bg-night-tertiary/80 backdrop-blur-sm border-2 border-zinc-800 p-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 overflow-hidden bg-night-secondary border-2 border-lime/30 flex items-center justify-center flex-shrink-0">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={80}
                    height={80}
                    className="object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-lime">{getInitials(user.name)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white uppercase tracking-tight truncate">
                  {user.name}
                </h2>
                {user.location && (
                  <div className="flex items-center gap-1 text-zinc-400 text-sm mt-1">
                    <MapPin className="w-4 h-4 text-lime" />
                    <span>{user.location}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="p-2 flex items-center justify-center hover:bg-night-secondary border border-zinc-800 hover:border-lime/30 transition-colors touch-target"
                aria-label="Edit profile"
              >
                <Edit className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 relative z-10">
        <div className="bg-night-tertiary border-2 border-zinc-800 p-4">
          <div className="flex items-center justify-around text-center">
            <StatItem
              icon={<Ticket className="w-5 h-5 text-lime" />}
              value={user.showsAttended || 0}
              label="Shows Attended"
            />
            <div className="w-px h-12 bg-zinc-800" />
            <StatItem
              icon={<Music className="w-5 h-5 text-violet" />}
              value={savedBands.length}
              label="Saved Artists"
            />
            <div className="w-px h-12 bg-zinc-800" />
            <StatItem
              icon={<Calendar className="w-5 h-5 text-lime" />}
              value={memberSinceDate}
              label="Member Since"
              isText
            />
          </div>
        </div>
      </div>

      <section className="p-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
          Top Genres
        </h3>
        {user.topGenres && user.topGenres.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {user.topGenres.map((genre) => (
              <span
                key={genre}
                className="px-4 py-2 border-2 text-night text-xs font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: GENRE_COLORS[genre],
                  borderColor: GENRE_COLORS[genre],
                }}
              >
                {genre}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">
            Listen to more shows to discover your top genres
          </p>
        )}
      </section>

      <section className="p-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
          Saved Artists / Venues
        </h3>
        <div className="bg-night-tertiary border-2 border-zinc-800 p-4 text-sm text-zinc-400">
          <p>Saved artists: {savedBands.length}</p>
          <p>Saved venues: {savedVenues.length}</p>
        </div>
      </section>

      <section className="p-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
          Settings
        </h3>
        <div className="bg-night-tertiary border-2 border-zinc-800 p-4">
          <ThemeToggleRow />
        </div>
      </section>

      <div className="p-4 pt-4">
        <SignOutButton>
          <button className="w-full flex items-center justify-center gap-2 py-4 border-2 border-red-500/30 text-red-400 font-bold uppercase tracking-wider text-sm hover:bg-red-500/10 transition-colors touch-target">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </SignOutButton>
      </div>

      {isWorkspaceMenuOpen && (
        <div
          className={cn(
            "fixed inset-0 z-[60] transition-opacity duration-200",
            isWorkspaceMenuVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <button
            type="button"
            onClick={closeWorkspaceMenu}
            className={cn(
              "absolute inset-0 bg-black/70 transition-opacity duration-200",
              isWorkspaceMenuVisible ? "opacity-100" : "opacity-0"
            )}
            aria-label="Close personal workspace menu"
          />

          <aside
            className={cn(
              "absolute right-0 top-0 h-full w-full max-w-xl bg-night-secondary border-l-2 border-lime/20 overflow-y-auto transition-transform duration-200 ease-out will-change-transform",
              isWorkspaceMenuVisible ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="sticky top-0 z-10 bg-night-secondary border-b border-zinc-800 p-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                Workspace
              </h3>
              <button
                type="button"
                onClick={closeWorkspaceMenu}
                className="p-2 border border-zinc-700 text-zinc-400 hover:text-white hover:border-lime/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <section className="p-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
                Band Creation
              </h4>

              {myBands.length === 0 ? (
                <div className="bg-night-tertiary border-2 border-zinc-800 p-4">
                  <p className="text-zinc-400 text-sm mb-3">
                    Create your first band workspace to unlock band tools.
                  </p>
                  <button
                    onClick={() => {
                      closeWorkspaceMenu();
                      setShowCreateBandForm(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-lime text-night border-2 border-lime font-bold uppercase tracking-wider text-xs hover:bg-transparent hover:text-lime transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Band
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-zinc-500 px-1 pb-1">
                    Use the profile dropdown to switch between personal and band workspaces.
                  </p>
                  <button
                    onClick={() => {
                      closeWorkspaceMenu();
                      setShowCreateBandForm(true);
                    }}
                    className="w-full bg-night-tertiary border-2 border-dashed border-lime/40 px-4 py-3 text-lime text-xs font-bold uppercase tracking-wider hover:border-lime"
                  >
                    + Create Another Band
                  </button>
                  {myBands.map((entry) => (
                    <div
                      key={entry.band._id}
                      className="w-full bg-night-tertiary border-2 border-zinc-800 px-4 py-3 text-left"
                    >
                      <p className="text-white font-bold uppercase tracking-wide text-sm">
                        {entry.band.name}
                      </p>
                      <p className="text-zinc-500 text-xs uppercase tracking-wider mt-1">
                        Role: {entry.membership.role}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {pendingInvites.length > 0 && (
              <section className="p-4 pt-0">
                <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
                  Pending Invites
                </h4>
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite._id}
                      className="bg-night-tertiary border-2 border-zinc-800 p-4"
                    >
                      <p className="text-white font-bold uppercase tracking-wide text-sm">
                        {invite.band?.name || "Band"}
                      </p>
                      <p className="text-zinc-500 text-xs uppercase tracking-wider mt-1">
                        Invited as {invite.role}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleAcceptInvite(invite._id, invite.bandId)}
                          disabled={processingInviteId === invite._id}
                          className={cn(
                            "flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border-2 text-xs font-bold uppercase tracking-wider transition-colors",
                            processingInviteId === invite._id
                              ? "border-zinc-700 text-zinc-500"
                              : "border-lime bg-lime text-night hover:bg-transparent hover:text-lime"
                          )}
                        >
                          <Check className="w-4 h-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineInvite(invite._id)}
                          disabled={processingInviteId === invite._id}
                          className={cn(
                            "flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border-2 text-xs font-bold uppercase tracking-wider transition-colors",
                            processingInviteId === invite._id
                              ? "border-zinc-700 text-zinc-500"
                              : "border-zinc-700 text-zinc-300 hover:border-red-500/40 hover:text-red-400"
                          )}
                        >
                          <X className="w-4 h-4" />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      )}

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

function StatItem({
  icon,
  value,
  label,
  isText = false,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  isText?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      {icon}
      <span
        className={cn(
          "font-bold text-white mt-1",
          isText ? "text-xs" : "text-xl"
        )}
      >
        {value}
      </span>
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}
