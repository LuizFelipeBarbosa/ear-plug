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
} from "lucide-react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { BandPublicMediaSlotsSection } from "@/components/band/slots/BandPublicMediaSlotsSection";
import { PastShowFlyerSection } from "@/components/events/PastShowFlyerSection";
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
  const pastGigs = useQuery(api.events.listPublicPastByBand, {
    bandId,
    limit: 6,
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
  }, [
    publicProfile?.isFollowing,
    publicProfile?.followerCount,
    isSavingFollow,
  ]);

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
      followerCount + (nextIsFollowing ? 1 : -1),
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
        error instanceof Error
          ? error.message
          : "Failed to update follow state",
      );
    } finally {
      setIsSavingFollow(false);
    }
  };

  if (publicProfile === undefined) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <div className="h-11 bg-muted border border-border animate-shimmer" />
        <div className="h-40 bg-muted border border-border animate-shimmer" />
        <div className="h-64 bg-muted border border-border animate-shimmer" />
      </div>
    );
  }

  if (!band) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white font-bold   mb-2">Band not found</p>
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="px-4 py-2 border-2 border-fan text-fan text-xs font-bold   hover:bg-fan hover:text-foreground transition-colors"
          >
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="p-4 border-b-2 border-fan/20 bg-card">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-3 inline-flex items-center gap-2 text-xs font-bold   text-muted-foreground hover:text-fan transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-muted border-2 border-border p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 overflow-hidden bg-card border border-border flex items-center justify-center flex-shrink-0">
              {band.image ? (
                <Image
                  src={band.image}
                  alt={band.name}
                  width={80}
                  height={80}
                  className="object-cover"
                />
              ) : (
                <span className="text-lg sm:text-xl font-bold text-fan">
                  {getInitials(band.name)}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-white   leading-tight [overflow-wrap:anywhere]">
                {band.name}
              </h1>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(band.genres || []).map((genre) => (
                  <span
                    key={genre}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] leading-none font-bold   text-foreground"
                    style={{ backgroundColor: GENRE_COLORS[genre as Genre] }}
                  >
                    <Music className="w-2.5 h-2.5" />
                    {genre}
                  </span>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1 sm:flex sm:flex-wrap sm:items-center sm:gap-3 text-sm sm:text-xs text-muted-foreground">
                <span className="inline-flex items-start gap-1 leading-tight">
                  <MapPin className="w-3.5 h-3.5 text-fan shrink-0 mt-0.5 sm:mt-0" />
                  {band.location}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-fan shrink-0" />
                  {followerCount} followers
                </span>
                {band.memberCount ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-band shrink-0" />
                    {band.memberCount} members
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border">
            {canToggleFollow ? (
              <button
                type="button"
                onClick={handleToggleFollow}
                disabled={isSavingFollow}
                className={`w-full sm:w-auto px-3 py-2 border text-xs sm:text-[10px] font-bold   transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  isFollowing
                    ? "border-fan/50 bg-fan/20 text-fan hover:bg-fan/30"
                    : "border-fan/40 text-fan hover:bg-fan hover:text-foreground"
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
              <span className="inline-flex w-full sm:w-auto justify-center text-[10px] font-bold   text-muted-foreground border border-border px-2.5 py-1.5">
                Band Member
              </span>
            )}
          </div>

          {band.bio ? (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
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

      <main className="p-4 space-y-6">
        <BandPublicMediaSlotsSection
          bandId={band._id}
          title="Band Media"
          description="Read-only profile media slots."
        />

        <PastShowFlyerSection
          shows={(pastGigs ?? []).map((gig) => ({
            eventId: gig._id,
            title: gig.title,
            dateTime: gig.dateTime,
            image: gig.image,
            venueName: gig.venue.name,
            venueCity: gig.venue.city,
          }))}
          emptyMessage="No past gigs yet."
          isLoading={pastGigs === undefined}
          title="Past Gigs"
        />
      </main>
    </div>
  );
}
