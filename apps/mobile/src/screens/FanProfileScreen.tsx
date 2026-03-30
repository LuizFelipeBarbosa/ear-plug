import { ProfileWorkspaceSwitcher } from "@/components/ui/ProfileWorkspaceSwitcher";
import {
  ActionButton,
  AppScreen,
  Avatar,
  EmptyState,
  HeroHeader,
  IconButton,
  LoadingPanel,
  MiniBadge,
  RowLink,
  SectionCard,
  SectionTitle,
  SegmentedTabs,
  StatCard,
} from "@/components/ui/AppPrimitives";
import { useProfileContext } from "@/context/ProfileContext";
import { useSavedBands } from "@/hooks/useBand";
import { useCurrentUser } from "@/hooks/useUser";
import { useSavedVenues } from "@/hooks/useVenues";
import { uploadUriToConvexStorage } from "@/lib/convexUpload";
import { validatePickedImageAsset } from "@/lib/mediaUpload";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Genre } from "@ear-plug/shared/types";
import {
  composePersonalName,
  getPersonalNameValidationError,
  normalizePersonalNamePart,
  splitPersonalName,
} from "@ear-plug/shared/utils";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useAction, useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Edit3, Heart, LogOut, MapPin, Ticket, Warehouse, Music4, ArrowRight } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

const GENRE_OPTIONS: Genre[] = ["indie", "rock", "jazz", "electronic", "folk", "pop", "alternative"];

type ProfileTab = "overview" | "saved" | "activity" | "settings";

export function FanProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const updateClerkPersonalName = useAction(api.users.updateClerkPersonalName);
  const { setBandMode } = useProfileContext();
  const { user, updateProfile, isLoading } = useCurrentUser();
  const { savedBands } = useSavedBands();
  const { savedVenues } = useSavedVenues();

  const publicProfile = useQuery(api.users.getPublicFanProfile, user ? { fanId: user._id } : "skip");
  const myBands = useQuery(api.bands.listMyBands) ?? [];
  const generateAvatarUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const setAvatarFromStorage = useMutation(api.users.setAvatarFromStorage);
  const clearAvatar = useMutation(api.users.clearAvatar);

  const [tab, setTab] = useState<ProfileTab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [location, setLocation] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [pendingSave, setPendingSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editableName = useMemo(() => {
    const fallbackName = splitPersonalName(user?.name);

    return {
      firstName: clerkUser?.firstName ?? fallbackName.firstName,
      lastName: clerkUser?.lastName ?? fallbackName.lastName,
    };
  }, [clerkUser?.firstName, clerkUser?.lastName, user?.name]);

  const stats = useMemo(() => {
    const memberSince = user
      ? new Date(user.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : "Now";

    return {
      showsAttended: String(user?.showsAttended ?? 0),
      savedArtists: String(publicProfile?.savedArtists?.length ?? savedBands.length),
      venues: String(savedVenues.length),
      memberSince,
    };
  }, [publicProfile?.savedArtists?.length, savedBands.length, savedVenues.length, user]);

  if (isLoading || !user) {
    return (
      <AppScreen>
        <LoadingPanel label="Loading profile..." tone="fan" />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scroll
      header={
        <HeroHeader
          title="Profile"
          subtitle="Your fan identity, saved artists, activity history, and workspace controls."
          eyebrow="Fan Workspace"
          tone="fan"
          action={
            <IconButton
              icon={<Edit3 size={18} color="#ffffff" />}
              onPress={() => {
                setFirstName(editableName.firstName);
                setLastName(editableName.lastName);
                setLocation(user.location ?? "");
                setSelectedGenres((user.topGenres as Genre[] | undefined) ?? []);
                setSaveError(null);
                setEditOpen(true);
              }}
              tone="fan"
              accessibilityLabel="Edit profile"
            />
          }
        >
          <SectionCard tone="fan">
            <View className="flex-row items-start gap-4">
              <Avatar uri={user.avatar} label={user.name} size={64} tone="fan" />
              <View className="flex-1">
                <Text className="text-xl font-semibold text-slate-950">{user.name}</Text>
                <View className="mt-2 flex-row items-center gap-2">
                  <MapPin size={14} color="#64748b" />
                  <Text className="text-sm text-slate-500">{user.location || "Location not set"}</Text>
                </View>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {publicProfile?.gigDna ? <MiniBadge label={publicProfile.gigDna.label} tone="fan" /> : null}
                  <MiniBadge label={`Member since ${stats.memberSince}`} tone="neutral" />
                </View>
              </View>
            </View>
          </SectionCard>

          <View className="mt-4 flex-row gap-2">
            <StatCard label="Shows" value={stats.showsAttended} tone="fan" />
            <StatCard label="Saved Artists" value={stats.savedArtists} tone="fan" />
            <StatCard label="Venues" value={stats.venues} tone="fan" />
          </View>
        </HeroHeader>
      }
    >
      <SegmentedTabs
        value={tab}
        tone="fan"
        onChange={(value) => setTab(value as ProfileTab)}
        options={[
          { value: "overview", label: "Overview" },
          { value: "saved", label: "Saved" },
          { value: "activity", label: "Activity" },
          { value: "settings", label: "Settings" },
        ]}
      />

      <View className="mt-5">
        {tab === "overview" ? (
          <View className="gap-4">
            <SectionCard tone="fan">
              <SectionTitle
                title="Workspace"
                subtitle="Create a band, switch spaces, or respond to invites from the same control point as web."
              />
              <ProfileWorkspaceSwitcher />
            </SectionCard>

            <SectionCard>
              <SectionTitle
                title={myBands.length ? `Your Bands (${myBands.length})` : "Band Workspaces"}
                subtitle="Band profile, media, shows, and member management all live behind the same workspace model as web."
              />

              {myBands.length ? (
                <View className="gap-3">
                  {myBands.map((entry) => (
                    <Pressable
                      key={entry.band._id}
                      onPress={() => setBandMode(entry.band._id)}
                      className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 active:opacity-80"
                    >
                      <View className="flex-row items-start gap-3">
                        <Avatar uri={entry.band.image} label={entry.band.name} size={56} tone="band" />
                        <View className="flex-1">
                          <View className="flex-row items-start justify-between gap-2">
                            <View className="flex-1">
                              <Text className="text-base font-semibold text-slate-950">{entry.band.name}</Text>
                              <Text className="mt-1 text-xs leading-5 text-slate-500">
                                {entry.band.location || "Bay Area"} • {(entry.band.genres ?? []).join(", ") || "Genre pending"}
                              </Text>
                            </View>
                            <MiniBadge
                              label={entry.membership.role}
                              tone={entry.membership.role === "owner" ? "warning" : "band"}
                            />
                          </View>

                          <View className="mt-3 flex-row items-center gap-2">
                            <View className="h-8 w-8 items-center justify-center rounded-2xl bg-band/10">
                              <Music4 size={16} color="#7c3aed" />
                            </View>
                            <Text className="flex-1 text-sm font-medium text-band">Open band profile</Text>
                            <ArrowRight size={16} color="#7c3aed" />
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <EmptyState
                  tone="band"
                  title="No bands yet"
                  message="Create your first band from the workspace switcher above. Once it exists, this profile immediately becomes the entry point to the band profile."
                />
              )}
            </SectionCard>

            <SectionCard>
              <SectionTitle
                title="Top Genres"
                subtitle="Your attendance history shapes this live listening fingerprint."
              />
              <View className="flex-row flex-wrap gap-2">
                {publicProfile?.topGenres?.length ? (
                  publicProfile.topGenres.map((genre) => (
                    <MiniBadge key={genre.genre} label={`${genre.label} ${genre.attendedCount}`} tone="fan" />
                  ))
                ) : (
                  <Text className="text-sm text-slate-500">No genre activity yet.</Text>
                )}
              </View>
            </SectionCard>

            {publicProfile?.mostViewedSavedArtists?.length ? (
              <SectionCard>
                <SectionTitle
                  title="Most Visited Artists"
                  subtitle="Bands you return to most often across saves and profile visits."
                />
                <View className="gap-3">
                  {publicProfile.mostViewedSavedArtists.map((artist) => (
                    <RowLink
                      key={artist.bandId}
                      title={artist.name}
                      subtitle={`${artist.location || "Bay Area"} • ${artist.viewCount} views${artist.isSaved ? " • saved" : ""}`}
                      onPress={() => router.push(`/bands/${artist.bandId}`)}
                      right={<Heart size={16} color={artist.isSaved ? "#2563eb" : "#94a3b8"} />}
                    />
                  ))}
                </View>
              </SectionCard>
            ) : null}
          </View>
        ) : null}

        {tab === "saved" ? (
          <View className="gap-4">
            <SectionCard>
              <SectionTitle
                title={`Saved Artists (${publicProfile?.savedArtists?.length ?? 0})`}
                subtitle="Bands you’ve followed from public profiles and discover."
              />
              <View className="gap-3">
                {publicProfile?.savedArtists?.length ? (
                  publicProfile.savedArtists.map((artist) => (
                    <RowLink
                      key={artist.bandId}
                      title={artist.name}
                      subtitle={`${artist.location || "Bay Area"} • ${(artist.genres ?? []).join(", ") || "Genres pending"}`}
                      onPress={() => router.push(`/bands/${artist.bandId}`)}
                      right={<Heart size={16} color="#2563eb" />}
                    />
                  ))
                ) : (
                  <EmptyState
                    tone="fan"
                    title="No saved artists yet"
                    message="Follow a band from Discover or a public profile and it will appear here."
                  />
                )}
              </View>
            </SectionCard>

            <SectionCard>
              <SectionTitle
                title={`Saved Venues (${savedVenues.length})`}
                subtitle="Venue follows stay visible from the same fan profile surface."
              />
              <View className="gap-3">
                {savedVenues.length ? (
                  savedVenues.map((venue) => (
                    <RowLink
                      key={venue._id}
                      title={venue.name}
                      subtitle={`${venue.city} • Capacity ${venue.capacity}`}
                      right={<Warehouse size={16} color="#64748b" />}
                    />
                  ))
                ) : (
                  <Text className="text-sm text-slate-500">No saved venues yet.</Text>
                )}
              </View>
            </SectionCard>
          </View>
        ) : null}

        {tab === "activity" ? (
          <View className="gap-4">
            <SectionCard>
              <SectionTitle
                title="Recent Activity"
                subtitle="Past attended shows and the venues you keep showing up for."
              />
              <View className="gap-3">
                {publicProfile?.pastShows?.length ? (
                  publicProfile.pastShows.map((show) => (
                    <RowLink
                      key={show.eventId}
                      title={show.title}
                      subtitle={`${show.venue.name} • ${show.venue.city} • ${new Date(show.dateTime).toLocaleDateString()}`}
                      onPress={() => router.push(`/gig/${show.eventId}`)}
                      right={<Ticket size={16} color="#64748b" />}
                    />
                  ))
                ) : (
                  <EmptyState
                    tone="fan"
                    title="No recent activity yet"
                    message="Checked-in shows and past RSVPs will build your activity feed."
                  />
                )}
              </View>
            </SectionCard>
          </View>
        ) : null}

        {tab === "settings" ? (
          <View className="gap-4">
            <SectionCard>
              <SectionTitle
                title="Account"
                subtitle="Profile editing, workspace creation, and sign-out live together here."
              />
              <View className="gap-3">
                <ActionButton
                  label="Edit Profile"
                  tone="fan"
                  onPress={() => {
                    setFirstName(editableName.firstName);
                    setLastName(editableName.lastName);
                    setLocation(user.location ?? "");
                    setSelectedGenres((user.topGenres as Genre[] | undefined) ?? []);
                    setSaveError(null);
                    setEditOpen(true);
                  }}
                />
                <ActionButton label="Sign Out" variant="danger" icon={<LogOut size={16} color="#ffffff" />} onPress={() => signOut()} />
              </View>
            </SectionCard>
          </View>
        ) : null}
      </View>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[88%] rounded-t-[24px] bg-white p-5">
            <Text className="text-lg font-semibold text-slate-950">Edit Profile</Text>

            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="#94a3b8"
              autoComplete="name-given"
              textContentType="givenName"
              className="mt-4 min-h-[48px] rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            />

            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor="#94a3b8"
              autoComplete="name-family"
              textContentType="familyName"
              className="mt-4 min-h-[48px] rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            />

            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Location"
              placeholderTextColor="#94a3b8"
              className="mt-3 min-h-[48px] rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            />

            <Text className="mt-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-slate-500">
              Top Genres
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {GENRE_OPTIONS.map((genre) => {
                const active = selectedGenres.includes(genre);
                return (
                  <Pressable
                    key={genre}
                    onPress={() => {
                      setSelectedGenres((current) => {
                        if (current.includes(genre)) {
                          return current.filter((item) => item !== genre);
                        }
                        if (current.length >= 5) return current;
                        return [...current, genre];
                      });
                    }}
                    className={`rounded-full border px-3 py-2 active:opacity-70 ${active ? "border-blue-200 bg-blue-100" : "border-slate-200 bg-white"}`}
                  >
                    <Text className={`text-xs font-semibold ${active ? "text-blue-700" : "text-slate-600"}`}>
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-4 flex-row gap-2">
              <View className="flex-1">
                <ActionButton
                  label="Upload Avatar"
                  tone="fan"
                  variant="secondary"
                  onPress={async () => {
                    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (!permission.granted) return;

                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      quality: 0.8,
                    });

                    if (result.canceled || !result.assets[0]) return;

                    try {
                      const asset = result.assets[0];
                      const { mimeType } = validatePickedImageAsset(asset, "Image");
                      const { uploadUrl } = await generateAvatarUploadUrl({});
                      const uploaded = await uploadUriToConvexStorage(
                        uploadUrl,
                        asset.uri,
                        mimeType,
                      );
                      await setAvatarFromStorage({ storageId: uploaded.storageId as Id<"_storage"> });
                      setSaveError(null);
                    } catch (error) {
                      setSaveError(
                        error instanceof Error ? error.message : "Failed to upload avatar.",
                      );
                    }
                  }}
                />
              </View>
              <View className="flex-1">
                <ActionButton
                  label="Clear Avatar"
                  variant="danger"
                  onPress={async () => {
                    try {
                      await clearAvatar({});
                      setSaveError(null);
                    } catch (error) {
                      setSaveError(
                        error instanceof Error ? error.message : "Failed to clear avatar.",
                      );
                    }
                  }}
                />
              </View>
            </View>

            {saveError ? <Text className="mt-3 text-sm text-red-600">{saveError}</Text> : null}

            <View className="mt-5 gap-2">
              <ActionButton
                label={pendingSave ? "Saving..." : "Save Changes"}
                tone="fan"
                disabled={pendingSave}
                onPress={async () => {
                  if (!clerkUser) {
                    setSaveError("Account details are still loading.");
                    return;
                  }

                  const validationError = getPersonalNameValidationError(
                    firstName,
                    lastName,
                  );
                  if (validationError) {
                    setSaveError(validationError);
                    return;
                  }

                  const normalizedFirstName = normalizePersonalNamePart(firstName);
                  const normalizedLastName = normalizePersonalNamePart(lastName);
                  const currentFirstName = normalizePersonalNamePart(clerkUser?.firstName);
                  const currentLastName = normalizePersonalNamePart(clerkUser?.lastName);
                  const shouldUpdateClerkName =
                    normalizedFirstName !== currentFirstName ||
                    normalizedLastName !== currentLastName;

                  setPendingSave(true);
                  setSaveError(null);
                  try {
                    if (shouldUpdateClerkName) {
                      await updateClerkPersonalName({
                        firstName: normalizedFirstName,
                        lastName: normalizedLastName,
                      });
                      await clerkUser.reload();
                    }
                    await updateProfile({
                      name: composePersonalName(
                        normalizedFirstName,
                        normalizedLastName,
                      ),
                      location: location.trim() || undefined,
                      topGenres: selectedGenres,
                    });
                    setEditOpen(false);
                  } catch (error) {
                    setSaveError(error instanceof Error ? error.message : "Failed to save profile.");
                  } finally {
                    setPendingSave(false);
                  }
                }}
              />
              <ActionButton label="Cancel" variant="secondary" onPress={() => setEditOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}
