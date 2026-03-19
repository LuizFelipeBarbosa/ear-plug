import {
  ActionButton,
  AppScreen,
  Avatar,
  EmptyState,
  HeroHeader,
  MiniBadge,
  RowLink,
  SectionCard,
  SectionTitle,
  StatCard,
} from "@/components/ui/AppPrimitives";
import { useProfileContext } from "@/context/ProfileContext";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Heart } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function PublicBandProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bandId = id as Id<"bands">;
  const { mode } = useProfileContext();

  const profile = useQuery(api.bands.getPublicBandProfile, { bandId });
  const pastShows = useQuery(api.events.listPublicPastByBand, { bandId, limit: 20 }) ?? [];
  const toggleSave = useMutation(api.bands.toggleSave);
  const trackProfileView = useMutation(api.bands.trackProfileView);
  const trackedRef = useRef<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [optimisticFollowing, setOptimisticFollowing] = useState<boolean | null>(null);
  const [optimisticFollowers, setOptimisticFollowers] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "personal" || !profile?.band) return;
    if (trackedRef.current === bandId) return;
    trackedRef.current = bandId;
    void trackProfileView({ bandId }).catch(() => {
      trackedRef.current = null;
    });
  }, [bandId, mode, profile?.band, trackProfileView]);

  const isFollowing = optimisticFollowing ?? profile?.isFollowing ?? false;
  const followerCount = optimisticFollowers ?? profile?.followerCount ?? 0;
  const canFollow = !profile?.viewerMembershipRole;

  const genres = useMemo(() => {
    if (!profile?.band) return [];
    if (profile.band.genres && profile.band.genres.length > 0) return profile.band.genres;
    return profile.band.genre ? [profile.band.genre] : [];
  }, [profile?.band]);

  const onToggleFollow = async () => {
    if (!canFollow || !profile || isSaving) return;

    setError(null);
    setIsSaving(true);
    const nextFollow = !isFollowing;
    const nextCount = Math.max(0, followerCount + (nextFollow ? 1 : -1));
    setOptimisticFollowing(nextFollow);
    setOptimisticFollowers(nextCount);

    try {
      await toggleSave({ bandId });
    } catch (err) {
      setOptimisticFollowing(isFollowing);
      setOptimisticFollowers(followerCount);
      setError(err instanceof Error ? err.message : "Failed to update follow status.");
    } finally {
      setIsSaving(false);
    }
  };

  if (profile === undefined) {
    return (
      <AppScreen>
        <SectionCard tone="fan">
          <Text className="text-sm text-slate-500">Loading band profile...</Text>
        </SectionCard>
      </AppScreen>
    );
  }

  if (!profile?.band) {
    return (
      <AppScreen>
        <EmptyState
          tone="fan"
          title="Band not found"
          message="This profile is unavailable."
          action={<ActionButton label="Go Back" tone="fan" onPress={() => router.back()} />}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scroll
      header={
        <HeroHeader
          title={profile.band.name}
          subtitle={profile.band.location}
          eyebrow="Public Band"
          tone="band"
          action={
            <TouchableOpacity onPress={() => router.back()} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
              <View className="flex-row items-center gap-2">
                <ArrowLeft size={14} color="#334155" />
                <Text className="text-xs font-semibold text-slate-700">Back</Text>
              </View>
            </TouchableOpacity>
          }
        >
          <SectionCard tone="band">
            <View className="flex-row items-start gap-4">
              <Avatar uri={profile.band.image} label={profile.band.name} size={72} tone="band" />
              <View className="flex-1">
                <Text className="text-xl font-semibold text-slate-950">{profile.band.name}</Text>
                <Text className="mt-2 text-sm leading-6 text-slate-600">{profile.band.bio || "No public bio yet."}</Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {genres.map((genre) => (
                    <MiniBadge key={genre} label={genre} tone="band" />
                  ))}
                </View>
              </View>
            </View>
          </SectionCard>

          <View className="mt-4 flex-row gap-2">
            <StatCard label="Followers" value={String(followerCount)} tone="band" />
            <StatCard label="Past Shows" value={String(pastShows.length)} tone="band" />
          </View>
        </HeroHeader>
      }
    >
      <View className="gap-4">
        {canFollow ? (
          <ActionButton
            label={isSaving ? "Updating..." : isFollowing ? "Following" : "Follow Band"}
            tone="band"
            onPress={() => void onToggleFollow()}
            icon={<Heart size={16} color="#ffffff" fill={isFollowing ? "#ffffff" : "transparent"} />}
          />
        ) : (
          <SectionCard>
            <Text className="text-center text-sm font-semibold text-slate-600">You are a member of this band</Text>
          </SectionCard>
        )}

        {error ? (
          <SectionCard tone="danger">
            <Text className="text-sm text-red-700">{error}</Text>
          </SectionCard>
        ) : null}

        <SectionCard>
          <SectionTitle title="Past Shows" subtitle="The public band page keeps past event history easy to browse." />
          <View className="gap-3">
            {pastShows.length > 0 ? (
              pastShows.map((show) => (
                <RowLink
                  key={show._id}
                  title={show.title || "Untitled Gig"}
                  subtitle={`${new Date(show.dateTime).toLocaleDateString()} • ${show.venue?.name || "Unknown Venue"} • ${show.venue?.city || "Unknown City"}`}
                  onPress={() => router.push(`/gig/${show._id}`)}
                />
              ))
            ) : (
              <Text className="text-sm text-slate-500">No past shows yet.</Text>
            )}
          </View>
        </SectionCard>
      </View>
    </AppScreen>
  );
}
