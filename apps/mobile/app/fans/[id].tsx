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
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function PublicFanProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const fanId = id as Id<"users">;

  const profile = useQuery(api.users.getPublicFanProfile, { fanId });

  if (profile === undefined) {
    return (
      <AppScreen>
        <SectionCard tone="fan">
          <Text className="text-sm text-slate-500">Loading fan profile...</Text>
        </SectionCard>
      </AppScreen>
    );
  }

  if (!profile) {
    return (
      <AppScreen>
        <EmptyState
          tone="fan"
          title="Fan profile not found"
          message="This fan profile is unavailable."
          action={<ActionButton label="Go Back" tone="fan" onPress={() => router.back()} />}
        />
      </AppScreen>
    );
  }

  const { fan, topGenres, savedArtists, pastShows, gigDna } = profile;

  return (
    <AppScreen
      scroll
      header={
        <HeroHeader
          title={fan.name}
          subtitle={fan.location || "Location not set"}
          eyebrow="Public Fan"
          tone="fan"
          action={
            <TouchableOpacity onPress={() => router.back()} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
              <View className="flex-row items-center gap-2">
                <ArrowLeft size={14} color="#334155" />
                <Text className="text-xs font-semibold text-slate-700">Back</Text>
              </View>
            </TouchableOpacity>
          }
        >
          <SectionCard tone="fan">
            <View className="flex-row items-start gap-4">
              <Avatar uri={fan.avatar} label={fan.name} size={72} tone="fan" />
              <View className="flex-1">
                <Text className="text-xl font-semibold text-slate-950">{fan.name}</Text>
                <Text className="mt-2 text-sm text-slate-500">
                  Member since {new Date(fan.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  <MiniBadge label={`${fan.showsAttended} shows`} tone="fan" />
                  {gigDna ? <MiniBadge label={gigDna.label} tone="neutral" /> : null}
                </View>
              </View>
            </View>
          </SectionCard>

          <View className="mt-4 flex-row gap-2">
            <StatCard label="Top Genres" value={String(topGenres.length)} tone="fan" />
            <StatCard label="Saved Artists" value={String(savedArtists.length)} tone="fan" />
            <StatCard label="Activity" value={String(pastShows.length)} tone="fan" />
          </View>
        </HeroHeader>
      }
    >
      <View className="gap-4">
        <SectionCard>
          <SectionTitle title="Top Genres" subtitle="Favorite genres emerge from attended shows." />
          <View className="flex-row flex-wrap gap-2">
            {topGenres.length > 0 ? (
              topGenres.map((entry) => <MiniBadge key={entry.genre} label={`${entry.label} ${entry.attendedCount}`} tone="fan" />)
            ) : (
              <Text className="text-sm text-slate-500">No genre activity yet.</Text>
            )}
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle title="Saved Artists" subtitle="Artists this fan has explicitly followed." />
          <View className="gap-3">
            {savedArtists.length > 0 ? (
              savedArtists.map((artist) => (
                <RowLink
                  key={artist.bandId}
                  title={artist.name}
                  subtitle={`${artist.location || "Bay Area"} • ${(artist.genres ?? []).join(", ") || "Genres pending"}`}
                  onPress={() => router.push(`/bands/${artist.bandId}`)}
                />
              ))
            ) : (
              <Text className="text-sm text-slate-500">No saved artists yet.</Text>
            )}
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle title="Recent Activity" subtitle="Past attended shows remain accessible from the public profile." />
          <View className="gap-3">
            {pastShows.length > 0 ? (
              pastShows.map((show) => (
                <RowLink
                  key={show.eventId}
                  title={show.title}
                  subtitle={`${show.venue.name} • ${show.venue.city} • ${new Date(show.dateTime).toLocaleDateString()}`}
                  onPress={() => router.push(`/gig/${show.eventId}`)}
                />
              ))
            ) : (
              <Text className="text-sm text-slate-500">No past activity yet.</Text>
            )}
          </View>
        </SectionCard>
      </View>
    </AppScreen>
  );
}
