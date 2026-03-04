import { ProfileWorkspaceSwitcher } from "@/components/ui/ProfileWorkspaceSwitcher";
import { useProfileContext } from "@/context/ProfileContext";
import { useCurrentUser } from "@/hooks/useUser";
import { uploadUriToConvexStorage } from "@/lib/convexUpload";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Genre } from "@ear-plug/shared/types";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

const GENRE_OPTIONS: Genre[] = ["indie", "rock", "jazz", "electronic", "folk", "pop", "alternative"];

export function FanProfileScreen() {
  const { signOut } = useAuth();
  const { user, updateProfile } = useCurrentUser();
  const { setBandMode } = useProfileContext();

  const publicProfile = useQuery(api.users.getPublicFanProfile, user ? { fanId: user._id } : "skip");
  const pendingInvites = useQuery(api.bandMembers.listMyPendingInvites) ?? [];
  const acceptInvite = useMutation(api.bandMembers.acceptInvite);
  const declineInvite = useMutation(api.bandMembers.declineInvite);
  const generateAvatarUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const setAvatarFromStorage = useMutation(api.users.setAvatarFromStorage);
  const clearAvatar = useMutation(api.users.clearAvatar);

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [pendingSave, setPendingSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const topGenres = useMemo(() => publicProfile?.topGenres ?? [], [publicProfile?.topGenres]);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900">Profile</Text>
        <TouchableOpacity
          onPress={() => {
            setName(user.name);
            setLocation(user.location ?? "");
            setSelectedGenres((user.topGenres as Genre[] | undefined) ?? []);
            setSaveError(null);
            setEditOpen(true);
          }}
          className="rounded-xl border border-gray-300 px-3 py-2"
        >
          <Text className="text-xs font-semibold text-gray-700">Edit</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <Text className="text-xl font-semibold text-gray-900">{user.name}</Text>
        <Text className="text-sm text-gray-600 mt-1">{user.location || "Location not set"}</Text>
        <Text className="text-xs text-gray-500 mt-1">
          Member since {new Date(user.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </Text>
        <Text className="text-xs text-gray-500">Shows attended: {user.showsAttended || 0}</Text>
      </View>

      <View className="mt-4">
        <ProfileWorkspaceSwitcher />
      </View>

      {pendingInvites.length > 0 ? (
        <View className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <Text className="text-sm font-semibold text-gray-900">Band Invites</Text>
          {pendingInvites.map((invite) => (
            <View key={invite._id} className="mt-2 rounded-lg border border-violet-200 bg-white p-3">
              <Text className="font-semibold text-gray-900">{invite.band?.name || "Unknown Band"}</Text>
              <Text className="text-xs text-gray-500 mt-1">Role: {invite.role}</Text>
              <View className="mt-2 flex-row gap-2">
                <TouchableOpacity
                  onPress={async () => {
                    await acceptInvite({ inviteId: invite._id });
                    if (invite.band?._id) {
                      setBandMode(invite.band._id as Id<"bands">);
                    }
                  }}
                  className="flex-1 rounded-lg bg-violet-600 py-2"
                >
                  <Text className="text-center text-xs font-semibold text-white">Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void declineInvite({ inviteId: invite._id })}
                  className="flex-1 rounded-lg border border-red-300 py-2"
                >
                  <Text className="text-center text-xs font-semibold text-red-700">Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <Text className="text-sm font-semibold text-gray-900">Top Genres</Text>
        <View className="mt-2 flex-row flex-wrap">
          {topGenres.length > 0 ? (
            topGenres.map((genre) => (
              <View key={genre.genre} className="mr-2 mb-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1">
                <Text className="text-xs text-blue-700">
                  {genre.label} ({genre.attendedCount})
                </Text>
              </View>
            ))
          ) : (
            <Text className="text-xs text-gray-500">No genre activity yet.</Text>
          )}
        </View>
      </View>

      <View className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <Text className="text-sm font-semibold text-gray-900">Saved Artists</Text>
        <FlatList
          className="mt-2"
          horizontal
          data={publicProfile?.savedArtists ?? []}
          keyExtractor={(item) => item.bandId}
          renderItem={({ item }) => (
            <View className="mr-3 w-40 rounded-xl border border-gray-200 p-3">
              <Text className="font-semibold text-gray-900" numberOfLines={1}>{item.name}</Text>
              <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>{item.location}</Text>
            </View>
          )}
          ListEmptyComponent={() => <Text className="text-xs text-gray-500">No saved artists yet.</Text>}
        />
      </View>

      <View className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <Text className="text-sm font-semibold text-gray-900">Recent Activity</Text>
        {(publicProfile?.pastShows ?? []).slice(0, 5).map((show) => (
          <View key={show.eventId} className="mt-2 rounded-lg border border-gray-200 p-3">
            <Text className="font-medium text-gray-900">{show.title}</Text>
            <Text className="text-xs text-gray-500 mt-1">{show.venue.name} • {show.venue.city}</Text>
            <Text className="text-xs text-gray-500">{new Date(show.dateTime).toLocaleDateString()}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => signOut()}
        className="mt-6 rounded-xl border border-red-300 py-3"
      >
        <Text className="text-center font-semibold text-red-700">Sign Out</Text>
      </TouchableOpacity>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white p-5 max-h-[88%]">
            <Text className="text-lg font-semibold text-gray-900">Edit Profile</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              className="mt-3 rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
            />

            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Location"
              className="mt-3 rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
            />

            <Text className="mt-3 text-xs font-medium text-gray-500 uppercase">Top Genres</Text>
            <View className="mt-2 flex-row flex-wrap">
              {GENRE_OPTIONS.map((genre) => {
                const active = selectedGenres.includes(genre);
                return (
                  <TouchableOpacity
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
                    className={`mr-2 mb-2 rounded-full border px-3 py-1 ${
                      active ? "border-blue-300 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    <Text className={`text-xs ${active ? "text-blue-700" : "text-gray-600"}`}>
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="mt-3 flex-row gap-2">
              <TouchableOpacity
                onPress={async () => {
                  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (!permission.granted) return;

                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.8,
                  });

                  if (result.canceled || !result.assets[0]) return;

                  const { uploadUrl } = await generateAvatarUploadUrl({});
                  const uploaded = await uploadUriToConvexStorage(uploadUrl, result.assets[0].uri);
                  await setAvatarFromStorage({ storageId: uploaded.storageId as Id<"_storage"> });
                }}
                className="flex-1 rounded-xl border border-gray-300 py-2"
              >
                <Text className="text-center text-xs font-semibold text-gray-700">Upload Avatar</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => void clearAvatar({})} className="flex-1 rounded-xl border border-red-300 py-2">
                <Text className="text-center text-xs font-semibold text-red-700">Clear Avatar</Text>
              </TouchableOpacity>
            </View>

            {saveError ? <Text className="mt-2 text-sm text-red-600">{saveError}</Text> : null}

            <TouchableOpacity
              onPress={async () => {
                setPendingSave(true);
                setSaveError(null);
                try {
                  await updateProfile({
                    name: name.trim(),
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
              disabled={pendingSave}
              className="mt-4 rounded-xl bg-blue-600 py-3"
            >
              <Text className="text-center font-semibold text-white">{pendingSave ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setEditOpen(false)} className="mt-2 rounded-xl border border-gray-200 py-3">
              <Text className="text-center font-semibold text-gray-700">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
