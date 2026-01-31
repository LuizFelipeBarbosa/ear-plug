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
    <div className="min-h-screen pb-6">
      {/* Header */}
      <header className="bg-gradient-to-b from-primary-600 to-primary-800 text-white p-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Profile</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.name}
                width={80}
                height={80}
                className="object-cover"
              />
            ) : (
              <span className="text-2xl font-bold">{getInitials(user.name)}</span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            {user.location && (
              <div className="flex items-center gap-1 text-white/80 text-sm mt-1">
                <MapPin className="w-4 h-4" />
                <span>{user.location}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stats Card */}
      <div className="px-4 -mt-14">
        <div className="bg-white dark:bg-surface-dark-secondary rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-around text-center">
            <StatItem
              icon={<Ticket className="w-5 h-5 text-primary-500" />}
              value={user.showsAttended || 0}
              label="Shows Attended"
            />
            <div className="w-px h-12 bg-gray-200 dark:bg-gray-700" />
            <StatItem
              icon={<Music className="w-5 h-5 text-accent-500" />}
              value={savedBands.length}
              label="Saved Artists"
            />
            <div className="w-px h-12 bg-gray-200 dark:bg-gray-700" />
            <StatItem
              icon={<Calendar className="w-5 h-5 text-success-500" />}
              value={memberSinceDate}
              label="Member Since"
              isText
            />
          </div>
        </div>
      </div>

      {/* Top Genres */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Top Genres
        </h3>
        {user.topGenres && user.topGenres.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {user.topGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => handleGenreClick(genre)}
                className="px-4 py-2 rounded-full text-white text-sm font-medium"
                style={{ backgroundColor: GENRE_COLORS[genre] }}
              >
                {genre.charAt(0).toUpperCase() + genre.slice(1)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Listen to more shows to discover your top genres
          </p>
        )}
      </div>

      {/* Saved Artists */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Saved Artists
          </h3>
          <button className="text-primary-600 text-sm font-medium flex items-center">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {bandsLoading ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-surface-dark-secondary animate-pulse flex-shrink-0"
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
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 mb-2">
                  {band.image ? (
                    <Image
                      src={band.image}
                      alt={band.name}
                      width={64}
                      height={64}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-400 to-accent-400" />
                  )}
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 text-center truncate w-16">
                  {band.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No saved artists yet
          </p>
        )}
      </div>

      {/* Saved Venues */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Saved Venues
          </h3>
          <button className="text-primary-600 text-sm font-medium flex items-center">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {venuesLoading ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-32 h-20 rounded-xl bg-gray-100 dark:bg-surface-dark-secondary animate-pulse flex-shrink-0"
              />
            ))}
          </div>
        ) : savedVenues.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {savedVenues.slice(0, 4).map((venue) => (
              <div
                key={venue._id}
                className="w-36 flex-shrink-0 bg-gray-100 dark:bg-surface-dark-secondary rounded-xl p-3"
              >
                <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {venue.name}
                </h4>
                <p className="text-xs text-gray-500 truncate">{venue.city}</p>
                <p className="text-xs text-primary-600 mt-1">
                  Cap: {venue.capacity}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No saved venues yet
          </p>
        )}
      </div>

      {/* Settings */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Settings
        </h3>
        <ThemeToggleRow />
      </div>

      {/* Sign Out */}
      <div className="p-4 pt-4">
        <SignOutButton>
          <button className="w-full flex items-center justify-center gap-2 py-3 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
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
            className="text-xs text-gray-400 dark:text-gray-600 select-none"
          >
            v1.0.0 {tapCount > 0 && `(${tapCount}/5)`}
          </button>
        </div>
      )}

      {/* Dev Mode Panel */}
      {showDevMode && IS_DEV && (
        <div className="mx-4 mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
              Developer Mode
            </h3>
            <button
              onClick={() => setShowDevMode(false)}
              className="ml-auto text-xs text-yellow-600 hover:text-yellow-800"
            >
              Hide
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
                Switch Role (current: {user.role})
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRoleSwitch("fan")}
                  disabled={user.role === "fan"}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors",
                    user.role === "fan"
                      ? "bg-primary-500 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <Users className="w-4 h-4" />
                  Fan
                </button>
                <button
                  onClick={() => handleRoleSwitch("musician")}
                  disabled={user.role === "musician"}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors",
                    user.role === "musician"
                      ? "bg-accent-500 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <Mic2 className="w-4 h-4" />
                  Musician
                </button>
              </div>
            </div>
            
            <div className="text-xs text-yellow-600 dark:text-yellow-400">
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
          "font-bold text-gray-900 dark:text-white mt-1",
          isText ? "text-sm" : "text-xl"
        )}
      >
        {value}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}
