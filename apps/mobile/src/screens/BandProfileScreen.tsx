import { ProfileWorkspaceSwitcher } from "@/components/ui/ProfileWorkspaceSwitcher";
import { useProfileContext } from "@/context/ProfileContext";
import { useBandPastShows, useCurrentBand } from "@/hooks/useBand";
import { useBandMediaSlots } from "@/hooks/useBandMediaSlots";
import { uploadUriToConvexStorage } from "@/lib/convexUpload";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Genre } from "@ear-plug/shared/types";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

const GENRES: Genre[] = ["indie", "rock", "jazz", "electronic", "folk", "pop", "alternative"];
type TabType = "overview" | "media" | "shows" | "settings";

export function BandProfileScreen() {
  const { signOut } = useAuth();
  const { band, bandWithStats } = useCurrentBand();
  const { pastShows } = useBandPastShows(band?._id);
  const { setPersonalMode } = useProfileContext();

  const myBands = useQuery(api.bands.listMyBands) ?? [];
  const activeMembership = myBands.find((entry) => entry.band._id === band?._id);
  const role = activeMembership?.membership.role;
  const canManage = role === "owner" || role === "admin";
  const canTransferOwnership = role === "owner";

  const members = useQuery(api.bandMembers.listMembers, band ? { bandId: band._id } : "skip") ?? [];
  const invites = useQuery(
    api.bandMembers.listBandInvites,
    band && canManage ? { bandId: band._id } : "skip",
  ) ?? [];

  const { slots, generateUploadUrl, upsertSlot, clearSlot } = useBandMediaSlots(band?._id);

  const inviteExistingUser = useMutation(api.bandMembers.inviteExistingUser);
  const updateMemberRole = useMutation(api.bandMembers.updateMemberRole);
  const removeMember = useMutation(api.bandMembers.removeMember);
  const revokeInvite = useMutation(api.bandMembers.revokeInvite);
  const transferOwnership = useMutation(api.bandMembers.transferOwnership);
  const deleteBand = useMutation(api.bands.deleteBand);

  const updateBand = useMutation(api.bands.update);
  const generateImageUploadUrl = useMutation(api.bands.generateImageUploadUrl);
  const setImageFromStorage = useMutation(api.bands.setImageFromStorage);
  const clearBandImage = useMutation(api.bands.clearImage);

  const [tab, setTab] = useState<TabType>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [bio, setBio] = useState("");

  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [selectedInviteUserId, setSelectedInviteUserId] = useState<string | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const assignableUsers = useQuery(
    api.bandMembers.searchAssignableBandInviteUsers,
    band && canManage && inviteQuery.trim().length >= 2
      ? { bandId: band._id, query: inviteQuery.trim(), limit: 8 }
      : "skip",
  );

  const deletePhrase = band ? `I CONFIRM I WANT TO DELETE ${band.name}` : "";

  const selectedInviteUser = useMemo(
    () => assignableUsers?.users?.find((user) => user.userId === selectedInviteUserId),
    [assignableUsers?.users, selectedInviteUserId],
  );

  if (!band) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-gray-500 text-center">
          Switch to a band workspace to view this profile.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900">Band Profile</Text>
        <TouchableOpacity
          onPress={() => {
            setName(band.name);
            setLocation(band.location);
            setSelectedGenres((band.genres as Genre[] | undefined) ?? []);
            setBio(band.bio ?? "");
            setEditOpen(true);
          }}
          className="rounded-xl border border-gray-300 px-3 py-2"
        >
          <Text className="text-xs font-semibold text-gray-700">Edit</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-4">
        <ProfileWorkspaceSwitcher />
      </View>

      <View className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <Text className="text-xl font-semibold text-gray-900">{band.name}</Text>
        <Text className="text-sm text-gray-600 mt-1">{band.location}</Text>
        <Text className="text-xs text-gray-500 mt-1 uppercase">Role: {role ?? "member"}</Text>
        <Text className="text-xs text-gray-500 mt-1">
          {(band.genres ?? []).map((genre) => genre.charAt(0).toUpperCase() + genre.slice(1)).join(" • ")}
        </Text>

        {bandWithStats ? (
          <View className="mt-3 flex-row gap-2">
            <Metric label="Shows" value={String(bandWithStats.stats.showsThisMonth)} />
            <Metric label="RSVPs" value={String(bandWithStats.stats.totalRsvps)} />
            <Metric label="New Fans" value={String(bandWithStats.stats.newFans)} />
          </View>
        ) : null}

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

              const { uploadUrl } = await generateImageUploadUrl({ bandId: band._id });
              const uploaded = await uploadUriToConvexStorage(uploadUrl, result.assets[0].uri);
              await setImageFromStorage({ bandId: band._id, storageId: uploaded.storageId as Id<"_storage"> });
            }}
            className="flex-1 rounded-lg border border-gray-300 py-2"
          >
            <Text className="text-center text-xs font-semibold text-gray-700">Upload Image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => void clearBandImage({ bandId: band._id })}
            className="flex-1 rounded-lg border border-red-300 py-2"
          >
            <Text className="text-center text-xs font-semibold text-red-700">Clear Image</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="mt-4 flex-row">
        <TabButton label="Overview" active={tab === "overview"} onPress={() => setTab("overview")} />
        <TabButton label="Media" active={tab === "media"} onPress={() => setTab("media")} />
        <TabButton label="Shows" active={tab === "shows"} onPress={() => setTab("shows")} />
        <TabButton label="Settings" active={tab === "settings"} onPress={() => setTab("settings")} />
      </View>

      {tab === "overview" ? (
        <View className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <Text className="text-sm font-semibold text-gray-900">Bio</Text>
          <Text className="text-sm text-gray-600 mt-1">{band.bio || "No bio added yet."}</Text>

          <Text className="text-sm font-semibold text-gray-900 mt-4">Members ({members.length})</Text>
          {members.map((member) => (
            <View key={member.user._id} className="mt-2 rounded-lg border border-gray-200 p-3">
              <Text className="font-medium text-gray-900">{member.user.name}</Text>
              <Text className="text-xs text-gray-500 uppercase">{member.membership.role}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {tab === "media" ? (
        <View className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <Text className="text-sm font-semibold text-gray-900">Media Slots</Text>
          {slots.map((slot) => (
            <View key={slot.slotIndex} className="mt-2 rounded-lg border border-gray-200 p-3">
              <Text className="font-medium text-gray-900">Slot #{slot.slotIndex + 1}</Text>
              <Text className="text-xs text-gray-500 mt-1">
                {slot.isFilled ? `${slot.mediaType} uploaded` : "Empty"}
              </Text>

              <View className="mt-2 flex-row gap-2">
                <TouchableOpacity
                  onPress={async () => {
                    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (!permission.granted) return;
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      quality: 0.8,
                    });
                    if (result.canceled || !result.assets[0]) return;

                    const { uploadUrl } = await generateUploadUrl({ bandId: band._id });
                    const uploaded = await uploadUriToConvexStorage(uploadUrl, result.assets[0].uri);
                    await upsertSlot({
                      bandId: band._id,
                      slotIndex: slot.slotIndex,
                      storageId: uploaded.storageId as Id<"_storage">,
                      mediaType: "image",
                    });
                  }}
                  className="flex-1 rounded-lg border border-gray-300 py-2"
                >
                  <Text className="text-center text-xs font-semibold text-gray-700">Upload</Text>
                </TouchableOpacity>

                {slot.isFilled ? (
                  <TouchableOpacity
                    onPress={() => void clearSlot({ bandId: band._id, slotIndex: slot.slotIndex })}
                    className="flex-1 rounded-lg border border-red-300 py-2"
                  >
                    <Text className="text-center text-xs font-semibold text-red-700">Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {tab === "shows" ? (
        <View className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <Text className="text-sm font-semibold text-gray-900">Past Shows</Text>
          {pastShows.length > 0 ? (
            pastShows.map((show) => (
              <View key={show.eventId} className="mt-2 rounded-lg border border-gray-200 p-3">
                <Text className="font-medium text-gray-900">{show.title}</Text>
                <Text className="text-xs text-gray-500 mt-1">{show.venueName} • {show.venueCity}</Text>
                <Text className="text-xs text-gray-500">{new Date(show.dateTime).toLocaleDateString()}</Text>
              </View>
            ))
          ) : (
            <Text className="mt-2 text-xs text-gray-500">No past shows yet.</Text>
          )}
        </View>
      ) : null}

      {tab === "settings" ? (
        <View className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <Text className="text-sm font-semibold text-gray-900">Member Management</Text>
          {members.map((member) => (
            <View key={member.user._id} className="mt-2 rounded-lg border border-gray-200 p-3">
              <Text className="font-medium text-gray-900">{member.user.name}</Text>
              <Text className="text-xs text-gray-500 uppercase">{member.membership.role}</Text>

              {canManage && member.membership.role !== "owner" ? (
                <View className="mt-2 flex-row gap-2">
                  <TouchableOpacity
                    onPress={() =>
                      void updateMemberRole({
                        bandId: band._id,
                        memberUserId: member.user._id,
                        role: member.membership.role === "admin" ? "member" : "admin",
                      })
                    }
                    className="flex-1 rounded-lg border border-gray-300 py-2"
                  >
                    <Text className="text-center text-xs font-semibold text-gray-700">
                      {member.membership.role === "admin" ? "Set Member" : "Set Admin"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => void removeMember({ bandId: band._id, memberUserId: member.user._id })}
                    className="flex-1 rounded-lg border border-red-300 py-2"
                  >
                    <Text className="text-center text-xs font-semibold text-red-700">Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {canTransferOwnership && member.membership.role !== "owner" ? (
                <TouchableOpacity
                  onPress={() =>
                    void transferOwnership({
                      bandId: band._id,
                      newOwnerUserId: member.user._id,
                    })
                  }
                  className="mt-2 rounded-lg border border-amber-300 py-2"
                >
                  <Text className="text-center text-xs font-semibold text-amber-700">Transfer Ownership</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          {canManage ? (
            <>
              <Text className="text-sm font-semibold text-gray-900 mt-5">Invite Member</Text>
              <TextInput
                value={inviteQuery}
                onChangeText={(value) => {
                  setInviteQuery(value);
                  setSelectedInviteUserId(null);
                }}
                placeholder="Search users by name"
                className="mt-2 rounded-xl border border-gray-200 px-3 py-2"
              />

              {(assignableUsers?.users ?? []).map((candidate) => (
                <TouchableOpacity
                  key={candidate.userId}
                  onPress={() => setSelectedInviteUserId(candidate.userId)}
                  className={`mt-2 rounded-lg border p-3 ${
                    selectedInviteUserId === candidate.userId ? "border-violet-400 bg-violet-50" : "border-gray-200"
                  }`}
                >
                  <Text className="font-medium text-gray-900">{candidate.name}</Text>
                  <Text className="text-xs text-gray-500">{candidate.inviteState}</Text>
                </TouchableOpacity>
              ))}

              <View className="mt-2 flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setInviteRole("member")}
                  className={`flex-1 rounded-xl border py-2 ${
                    inviteRole === "member" ? "border-violet-400 bg-violet-50" : "border-gray-200"
                  }`}
                >
                  <Text className={`text-center text-xs font-semibold ${inviteRole === "member" ? "text-violet-700" : "text-gray-600"}`}>
                    Member
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setInviteRole("admin")}
                  className={`flex-1 rounded-xl border py-2 ${
                    inviteRole === "admin" ? "border-violet-400 bg-violet-50" : "border-gray-200"
                  }`}
                >
                  <Text className={`text-center text-xs font-semibold ${inviteRole === "admin" ? "text-violet-700" : "text-gray-600"}`}>
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={async () => {
                  if (!selectedInviteUser || selectedInviteUser.inviteState !== "eligible") {
                    setError("Select an eligible user to invite.");
                    return;
                  }

                  setError(null);
                  await inviteExistingUser({
                    bandId: band._id,
                    targetUserId: selectedInviteUser.userId as Id<"users">,
                    role: inviteRole,
                  });
                  setInviteQuery("");
                  setSelectedInviteUserId(null);
                }}
                className="mt-3 rounded-xl bg-violet-600 py-2.5"
              >
                <Text className="text-center text-sm font-semibold text-white">Send Invite</Text>
              </TouchableOpacity>

              {invites.length > 0 ? (
                <>
                  <Text className="text-sm font-semibold text-gray-900 mt-5">Invites</Text>
                  {invites.map((invite) => (
                    <View key={invite._id} className="mt-2 rounded-lg border border-gray-200 p-3">
                      <Text className="font-medium text-gray-900">{invite.targetUser?.name || invite.email}</Text>
                      <Text className="text-xs text-gray-500 mt-1">{invite.status} • {invite.role}</Text>
                      {invite.status === "pending" ? (
                        <TouchableOpacity
                          onPress={() => void revokeInvite({ inviteId: invite._id })}
                          className="mt-2 rounded-lg border border-red-300 py-2"
                        >
                          <Text className="text-center text-xs font-semibold text-red-700">Revoke Invite</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                </>
              ) : null}
            </>
          ) : null}

          {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

          {canTransferOwnership ? (
            <View className="mt-6 rounded-xl border border-red-300 bg-red-50 p-3">
              <Text className="text-sm font-semibold text-red-700">Danger Zone</Text>
              <Text className="text-xs text-red-700 mt-1">Type exact confirmation phrase to delete this band.</Text>
              <Text className="mt-2 rounded-md bg-white px-2 py-1 text-[11px] text-red-700">{deletePhrase}</Text>

              <TextInput
                value={deleteText}
                onChangeText={setDeleteText}
                placeholder="Confirmation phrase"
                className="mt-2 rounded-xl border border-red-200 px-3 py-2 bg-white"
              />

              <TouchableOpacity
                onPress={async () => {
                  await deleteBand({ bandId: band._id, confirmationText: deleteText.trim() });
                  setPersonalMode();
                }}
                disabled={deleteText.trim() !== deletePhrase}
                className={`mt-2 rounded-xl py-2.5 ${
                  deleteText.trim() === deletePhrase ? "bg-red-600" : "bg-red-300"
                }`}
              >
                <Text className="text-center text-sm font-semibold text-white">Delete Band</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={() => signOut()}
            className="mt-6 rounded-xl border border-red-300 py-3"
          >
            <Text className="text-center font-semibold text-red-700">Sign Out</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white p-5 max-h-[88%]">
            <Text className="text-lg font-semibold text-gray-900">Edit Band Profile</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Band name"
              className="mt-3 rounded-xl border border-gray-200 px-3 py-2"
            />

            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Location"
              className="mt-3 rounded-xl border border-gray-200 px-3 py-2"
            />

            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Bio"
              multiline
              className="mt-3 rounded-xl border border-gray-200 px-3 py-2 h-24"
            />

            <Text className="mt-3 text-xs font-medium text-gray-500 uppercase">Genres</Text>
            <View className="mt-2 flex-row flex-wrap">
              {GENRES.map((genre) => {
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
                      active ? "border-violet-400 bg-violet-50" : "border-gray-200"
                    }`}
                  >
                    <Text className={`text-xs ${active ? "text-violet-700" : "text-gray-600"}`}>
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={async () => {
                await updateBand({
                  bandId: band._id,
                  name: name.trim(),
                  location: location.trim(),
                  bio: bio.trim() || undefined,
                  genres: selectedGenres,
                });
                setEditOpen(false);
              }}
              className="mt-4 rounded-xl bg-violet-600 py-3"
            >
              <Text className="text-center font-semibold text-white">Save</Text>
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

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`mr-2 rounded-xl border px-3 py-2 ${active ? "border-violet-300 bg-violet-50" : "border-gray-200"}`}
    >
      <Text className={`text-xs font-semibold ${active ? "text-violet-700" : "text-gray-600"}`}>{label}</Text>
    </TouchableOpacity>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl border border-gray-200 bg-white p-2">
      <Text className="text-base font-bold text-gray-900">{value}</Text>
      <Text className="text-[10px] text-gray-500">{label}</Text>
    </View>
  );
}
