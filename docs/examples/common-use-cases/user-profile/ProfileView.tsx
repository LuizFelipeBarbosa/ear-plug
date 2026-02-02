/**
 * Profile View Component
 *
 * Displays user profile information in a read-only view.
 * Adapts display based on user role (fan vs musician).
 *
 * Features:
 * - User avatar and basic info
 * - Role-specific stats and details
 * - Genre preferences display
 * - Link to edit mode
 */
"use client";

import { useCurrentUser } from "@/hooks/useUser";
import { useCurrentBand } from "@/hooks/useBand";
import { useUserEvents } from "@/hooks/useEvents";
import { GENRES, GENRE_COLORS } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Main profile view component.
 * Automatically detects user role and displays appropriate content.
 *
 * @example
 * // In a page component
 * export default function ProfilePage() {
 *   return <ProfileView />;
 * }
 */
export function ProfileView() {
  const { user, isLoading, isFan, isMusician } = useCurrentUser();

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-zinc-500">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Profile Header */}
      <ProfileHeader user={user} />

      {/* Role-specific content */}
      {isFan && <FanProfileContent user={user} />}
      {isMusician && <MusicianProfileContent />}

      {/* Edit Profile Link */}
      <div className="pt-4 border-t border-zinc-800">
        <Link
          href="/profile/edit"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white border border-zinc-700 hover:border-lime hover:text-lime transition-colors"
        >
          Edit Profile
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/**
 * User type for profile display.
 */
interface ProfileUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  location?: string;
  role: "fan" | "musician";
  topGenres?: string[];
  memberSince: number;
  showsAttended?: number;
}

/**
 * Profile header with avatar and basic info.
 */
function ProfileHeader({ user }: { user: ProfileUser }) {
  const memberSinceDate = new Date(user.memberSince).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="flex items-start gap-6">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-24 h-24 rounded-full object-cover border-2 border-lime"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-night-tertiary border-2 border-zinc-700 flex items-center justify-center">
            <span className="text-3xl font-bold text-zinc-500">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-white truncate">{user.name}</h1>
        <p className="text-zinc-400">{user.email}</p>

        {user.location && (
          <p className="text-zinc-500 mt-1 flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {user.location}
          </p>
        )}

        {/* Role badge and member since */}
        <div className="flex items-center gap-3 mt-3">
          <span
            className={cn(
              "px-3 py-1 text-xs font-bold uppercase tracking-wider",
              user.role === "musician"
                ? "bg-violet text-white"
                : "bg-lime text-night"
            )}
          >
            {user.role}
          </span>
          <span className="text-sm text-zinc-500">
            Member since {memberSinceDate}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Fan-specific profile content.
 */
function FanProfileContent({ user }: { user: ProfileUser }) {
  const { rsvps, pastRsvps, isLoading } = useUserEvents();

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Shows Attended"
          value={user.showsAttended ?? pastRsvps.length}
          loading={isLoading}
        />
        <StatCard
          label="Upcoming RSVPs"
          value={rsvps.length}
          loading={isLoading}
        />
        <StatCard
          label="Genres Following"
          value={user.topGenres?.length ?? 0}
          loading={false}
        />
      </div>

      {/* Favorite Genres */}
      {user.topGenres && user.topGenres.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">
            Favorite Genres
          </h2>
          <div className="flex flex-wrap gap-2">
            {user.topGenres.map((genre) => (
              <GenreTag key={genre} genre={genre} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Musician-specific profile content.
 */
function MusicianProfileContent() {
  const { band, bandWithStats, isLoading } = useCurrentBand();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-zinc-800 animate-pulse rounded" />
        <div className="h-20 bg-zinc-800 animate-pulse rounded" />
      </div>
    );
  }

  if (!band) {
    return (
      <div className="p-6 bg-night-tertiary border border-zinc-800 rounded-lg text-center">
        <h2 className="text-lg font-semibold text-white mb-2">
          Create Your Band Profile
        </h2>
        <p className="text-zinc-400 mb-4">
          Set up your band profile to start booking gigs and connecting with
          venues.
        </p>
        <Link href="/profile/band/create" className="btn-brutalist">
          Create Band
        </Link>
      </div>
    );
  }

  const stats = bandWithStats?.stats;

  return (
    <div className="space-y-6">
      {/* Band Info */}
      <div className="p-4 bg-night-tertiary border border-zinc-800 rounded-lg">
        <div className="flex items-center gap-4">
          {band.image ? (
            <img
              src={band.image}
              alt={band.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center">
              <span className="text-2xl">🎸</span>
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">{band.name}</h2>
            <p className="text-zinc-400">{band.location}</p>
            <div className="flex gap-2 mt-2">
              {band.genres.map((genre) => (
                <GenreTag key={genre} genre={genre} small />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Band Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Shows This Month" value={stats.showsThisMonth} />
          <StatCard label="Total RSVPs" value={stats.totalRsvps} />
          <StatCard label="New Fans" value={stats.newFans} />
        </div>
      )}

      {/* Band Bio */}
      {band.bio && (
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">About</h3>
          <p className="text-white">{band.bio}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Stat card sub-component.
 */
function StatCard({
  label,
  value,
  loading = false,
}: {
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <div className="p-4 bg-night-tertiary border border-zinc-800 rounded-lg text-center">
      {loading ? (
        <div className="h-8 w-12 mx-auto bg-zinc-800 animate-pulse rounded" />
      ) : (
        <div className="text-2xl font-bold text-lime">{value}</div>
      )}
      <div className="text-sm text-zinc-400 mt-1">{label}</div>
    </div>
  );
}

/**
 * Genre tag sub-component.
 */
function GenreTag({ genre, small = false }: { genre: string; small?: boolean }) {
  const genreInfo = GENRES.find((g) => g.value === genre);
  const color = GENRE_COLORS[genre as keyof typeof GENRE_COLORS] ?? "#6b7280";

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium border",
        small ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
      style={{
        borderColor: color,
        color: color,
      }}
    >
      {genreInfo?.label ?? genre}
    </span>
  );
}

/**
 * Profile skeleton loader.
 */
function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-pulse">
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 rounded-full bg-zinc-800" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-48 bg-zinc-800 rounded" />
          <div className="h-4 w-64 bg-zinc-800 rounded" />
          <div className="h-4 w-32 bg-zinc-800 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-zinc-800 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
