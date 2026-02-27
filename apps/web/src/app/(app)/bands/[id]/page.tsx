"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, MapPin, Music, UserCheck, UserPlus, Users } from "lucide-react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { BandPublicMediaSlotsSection } from "@/components/band/slots/BandPublicMediaSlotsSection";
import { useProfileContext } from "@/hooks/useProfileContext";
import { GENRE_COLORS } from "@ear-plug/shared/constants";
import { getInitials } from "@ear-plug/shared/utils";
import type { Genre } from "@ear-plug/shared/types";
import { useEffect, useMemo, useRef, useState } from "react";

interface PageProps {
  params: { id: string };
}

export default function BandFeedPage({ params }: PageProps) {
  const router = useRouter();
  const bandId = params.id as Id<"bands">;
  const { mode } = useProfileContext();

  const toggleSave = useMutation(api.bands.toggleSave);
  const trackProfileView = useMutation(api.bands.trackProfileView);

  const publicProfile = useQuery(api.bands.getPublicBandProfile, { bandId });
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
      // Allow retry on future renders if tracking call fails.
      trackedBandIdRef.current = null;
    });
  }, [bandId, mode, publicProfile?.band, trackProfileView]);

  const band = publicProfile?.band;
  const isViewerMember = Boolean(publicProfile?.viewerMembershipRole);
  const isFollowing =
    optimisticFollowState?.isFollowing ?? publicProfile?.isFollowing ?? false;
  const followerCount =
    optimisticFollowState?.followerCount ?? publicProfile?.followerCount ?? 0;
  const canToggleFollow = !isViewerMember;
  const followButtonLabel = useMemo(() => {
    if (isFollowing) return "Following";
    return "Follow";
  }, [isFollowing]);

  const handleToggleFollow = async () => {
    if (!publicProfile || !canToggleFollow || isSavingFollow) {
      return;
    }

    setFollowError(null);
    setIsSavingFollow(true);

    const nextIsFollowing = !isFollowing;
    const nextFollowerCount = Math.max(
      0,
      followerCount + (nextIsFollowing ? 1 : -1)
    );
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
      <div className="min-h-screen bg-night p-4 space-y-4">
        <div className="h-11 bg-night-tertiary border border-zinc-800 animate-shimmer" />
        <div className="h-40 bg-night-tertiary border border-zinc-800 animate-shimmer" />
        <div className="h-64 bg-night-tertiary border border-zinc-800 animate-shimmer" />
      </div>
    );
  }

  if (!band) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white font-bold uppercase tracking-wide mb-2">Band not found</p>
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="px-4 py-2 border-2 border-lime text-lime text-xs font-bold uppercase tracking-wider hover:bg-lime hover:text-night transition-colors"
          >
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night pb-6">
      <header className="p-4 border-b-2 border-lime/20 bg-night-secondary sticky top-0 z-20">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-lime transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-night-tertiary border-2 border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 overflow-hidden bg-night-secondary border border-zinc-700 flex items-center justify-center flex-shrink-0">
              {band.image ? (
                <Image
                  src={band.image}
                  alt={band.name}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-lime">{getInitials(band.name)}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-white uppercase tracking-tight truncate">
                {band.name}
              </h1>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(band.genres || []).map((genre) => (
                  <span
                    key={genre}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-night"
                    style={{ backgroundColor: GENRE_COLORS[genre as Genre] }}
                  >
                    <Music className="w-3 h-3" />
                    {genre}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-lime" />
                  {band.location}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-lime" />
                  {followerCount} followers
                </span>
                {band.memberCount ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-violet" />
                    {band.memberCount} members
                  </span>
                ) : null}
              </div>
            </div>

            {canToggleFollow ? (
              <button
                type="button"
                onClick={handleToggleFollow}
                disabled={isSavingFollow}
                className={`px-3 py-2 border text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  isFollowing
                    ? "border-lime/50 bg-lime/20 text-lime hover:bg-lime/30"
                    : "border-lime/40 text-lime hover:bg-lime hover:text-night"
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {isFollowing ? (
                    <UserCheck className="w-3.5 h-3.5" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  {followButtonLabel}
                </span>
              </button>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 border border-zinc-700 px-2.5 py-1.5">
                Band Member
              </span>
            )}
          </div>

          {band.bio ? (
            <p className="mt-3 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800 pt-3">
              {band.bio}
            </p>
          ) : null}

          {followError ? (
            <p className="mt-3 text-xs text-red-400 border border-red-500/30 bg-red-500/10 px-3 py-2">
              {followError}
            </p>
          ) : null}
        </div>
      </header>

      <main className="p-4">
        <BandPublicMediaSlotsSection
          bandId={band._id}
          title="Band Media"
          description="Read-only profile media slots."
        />
      </main>
    </div>
  );
}
