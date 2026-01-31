"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import {
  MapPin,
  Calendar,
  Ticket,
  Music,
  ChevronRight,
  LogOut,
  Settings,
  Edit,
  Code,
  Users,
  Mic2,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useUser";
import { useSavedBands } from "@/hooks/useBand";
import { useSavedVenues } from "@/hooks/useVenues";
import { GenreFilter } from "@/components/ui/GenreFilter";
import { EditProfileModal } from "@/components/ui/EditProfileModal";
import { ThemeToggleRow } from "@/components/ui/ThemeToggle";
import { GENRE_COLORS, getRelativeTime } from "@ear-plug/shared/constants";
import { getInitials } from "@ear-plug/shared/utils";
import { cn } from "@/lib/utils";
import type { Genre } from "@ear-plug/shared/types";

const IS_DEV = process.env.NODE_ENV === "development";

export function FanProfileView() {
  const router = useRouter();
  const { user, updateProfile, setRole } = useCurrentUser();
  const { savedBands, isLoading: bandsLoading } = useSavedBands();
  const { savedVenues, isLoading: venuesLoading } = useSavedVenues();

  const [selectedGenre, setSelectedGenre] = useState<Genre | undefined>();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Dev mode state
  const [showDevMode, setShowDevMode] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hidden dev mode trigger - tap version 5 times
  const handleVersionTap = useCallback(() => {
    if (!IS_DEV) return;

    setTapCount((prev) => {
      const newCount = prev + 1;

      // Clear existing timeout
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }

      // Reset count after 2 seconds of inactivity
      tapTimeoutRef.current = setTimeout(() => {
        setTapCount(0);
      }, 2000);

      // Activate dev mode after 5 taps
      if (newCount >= 5) {
        setShowDevMode(true);
        return 0;
      }

      return newCount;
    });
  }, []);

  const handleRoleSwitch = async (role: "fan" | "musician") => {
    await setRole(role);
    router.refresh();
  };

  if (!user) return null;

  const handleSaveProfile = async (data: {
    name: string;
    location?: string;
    avatar?: string;
    topGenres?: Genre[];
  }) => {
    await updateProfile(data);
  };

  const memberSinceDate = new Date(user.memberSince).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const handleGenreClick = (genre: Genre | undefined) => {
    setSelectedGenre(genre);
    if (genre) {
      router.push(`/home?genre=${genre}`);
    }
  };

  return (
    <div className="min-h-screen pb-6 bg-night">
      {/* Header - Dark with gradient accent */}
      <header className="relative bg-night-secondary p-6 overflow-hidden">
        {/* Subtle gradient accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white uppercase tracking-tight">Profile</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 flex items-center justify-center hover:bg-night-tertiary border border-zinc-800 hover:border-lime/30 transition-colors touch-target"
            >
              <Edit className="w-5 h-5 text-zinc-400" />
            </button>
            <button className="p-2 flex items-center justify-center hover:bg-night-tertiary border border-zinc-800 hover:border-lime/30 transition-colors touch-target">
              <Settings className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="relative flex items-center gap-4">
          <div className="w-20 h-20 overflow-hidden bg-night-tertiary border-2 border-lime/30 flex items-center justify-center">
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
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">{user.name}</h2>
            {user.location && (
              <div className="flex items-center gap-1 text-zinc-400 text-sm mt-1">
                <MapPin className="w-4 h-4 text-lime" />
                <span>{user.location}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stats Card */}
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

      {/* Top Genres */}
      <div className="p-4 mt-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
          Top Genres
        </h3>
        {user.topGenres && user.topGenres.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {user.topGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => handleGenreClick(genre)}
                className="px-4 py-2 border-2 text-night text-xs font-bold uppercase tracking-wider hover:shadow-brutal transition-all"
                style={{
                  backgroundColor: GENRE_COLORS[genre],
                  borderColor: GENRE_COLORS[genre],
                }}
              >
                {genre.charAt(0).toUpperCase() + genre.slice(1)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">
            Listen to more shows to discover your top genres
          </p>
        )}
      </div>

      {/* Saved Artists */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            Saved Artists
          </h3>
          <button className="text-lime text-xs font-bold uppercase tracking-wider flex items-center hover:underline">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {bandsLoading ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-20 h-20 bg-night-tertiary border-2 border-zinc-800 animate-shimmer flex-shrink-0"
              />
            ))}
          </div>
        ) : savedBands.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {savedBands.slice(0, 6).map((band) => (
              <div
                key={band._id}
                className="flex flex-col items-center flex-shrink-0"
              >
                <div className="w-16 h-16 overflow-hidden bg-night-tertiary border-2 border-zinc-800 mb-2">
                  {band.image ? (
                    <Image
                      src={band.image}
                      alt={band.name}
                      width={64}
                      height={64}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet/30 to-lime/30 flex items-center justify-center">
                      <Music className="w-6 h-6 text-zinc-600" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-zinc-400 text-center truncate w-16">
                  {band.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">
            No saved artists yet
          </p>
        )}
      </div>

      {/* Saved Venues */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            Saved Venues
          </h3>
          <button className="text-lime text-xs font-bold uppercase tracking-wider flex items-center hover:underline">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {venuesLoading ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-32 h-20 bg-night-tertiary border-2 border-zinc-800 animate-shimmer flex-shrink-0"
              />
            ))}
          </div>
        ) : savedVenues.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {savedVenues.slice(0, 4).map((venue) => (
              <div
                key={venue._id}
                className="w-36 flex-shrink-0 bg-night-tertiary border-2 border-zinc-800 p-3 hover:border-lime/30 transition-colors"
              >
                <h4 className="font-bold text-white text-sm truncate uppercase tracking-wide">
                  {venue.name}
                </h4>
                <p className="text-xs text-zinc-500 truncate">{venue.city}</p>
                <p className="text-xs text-violet font-medium mt-1 uppercase">
                  Cap: {venue.capacity}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">
            No saved venues yet
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="p-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
          Settings
        </h3>
        <div className="bg-night-tertiary border-2 border-zinc-800 p-4">
          <ThemeToggleRow />
        </div>
      </div>

      {/* Sign Out */}
      <div className="p-4 pt-4">
        <SignOutButton>
          <button className="w-full flex items-center justify-center gap-2 py-4 border-2 border-red-500/30 text-red-400 font-bold uppercase tracking-wider text-sm hover:bg-red-500/10 transition-colors touch-target">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </SignOutButton>
      </div>

      {/* Version - tap 5 times for dev mode */}
      {IS_DEV && (
        <div className="p-4 text-center">
          <button
            onClick={handleVersionTap}
            className="text-xs text-zinc-600 select-none uppercase tracking-widest"
          >
            v1.0.0 {tapCount > 0 && `(${tapCount}/5)`}
          </button>
        </div>
      )}

      {/* Dev Mode Panel */}
      {showDevMode && IS_DEV && (
        <div className="mx-4 mb-4 p-4 bg-night-tertiary border-2 border-lime/30">
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-5 h-5 text-lime" />
            <h3 className="font-bold text-white uppercase tracking-wide text-sm">
              Developer Mode
            </h3>
            <button
              onClick={() => setShowDevMode(false)}
              className="ml-auto text-xs text-zinc-400 hover:text-lime uppercase"
            >
              Hide
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">
                Switch Role (current: {user.role})
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRoleSwitch("fan")}
                  disabled={user.role === "fan"}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors touch-target",
                    user.role === "fan"
                      ? "bg-lime text-night border-2 border-lime"
                      : "bg-night-secondary border-2 border-zinc-800 text-zinc-400 hover:border-lime/30"
                  )}
                >
                  <Users className="w-4 h-4" />
                  Fan
                </button>
                <button
                  onClick={() => handleRoleSwitch("musician")}
                  disabled={user.role === "musician"}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors touch-target",
                    user.role === "musician"
                      ? "bg-violet text-white border-2 border-violet"
                      : "bg-night-secondary border-2 border-zinc-800 text-zinc-400 hover:border-violet/30"
                  )}
                >
                  <Mic2 className="w-4 h-4" />
                  Musician
                </button>
              </div>
            </div>

            <div className="text-xs text-zinc-600 font-mono">
              <p>User ID: {user._id}</p>
              <p>Clerk ID: {user.clerkId}</p>
            </div>
          </div>
        </div>
      )}

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
