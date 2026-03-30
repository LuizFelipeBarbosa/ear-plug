import { ProfileWorkspaceSwitcher } from "@/components/ui/ProfileWorkspaceSwitcher";
import {
  ActionButton,
  AppScreen,
  Avatar,
  EmptyState,
  HeroHeader,
  IconButton,
  MiniBadge,
  RowLink,
  SectionCard,
  SectionTitle,
  SegmentedTabs,
  StatCard,
} from "@/components/ui/AppPrimitives";
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
import { Edit3, Image as ImageIcon, LogOut, ShieldCheck, Trash2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Image, Modal, Pressable, Text, TextInput, View } from "react-native";

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
  const invites = useQuery(api.bandMembers.listBandInvites, band && canManage ? { bandId: band._id } : "skip") ?? [];
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
  const [notice, setNotice] = useState<string | null>(null);

  const assignableUsers = useQuery(
    api.bandMembers.searchAssignableBandInviteUsers,
    band && canManage && inviteQuery.trim().length >= 2
      ? { bandId: band._id, query: inviteQuery.trim(), limit: 8 }
      : "skip",
  );

  const selectedInviteUser = useMemo(
    () => assignableUsers?.users?.find((user) => user.userId === selectedInviteUserId),
    [assignableUsers?.users, selectedInviteUserId],
  );

  const deletePhrase = band ? `I CONFIRM I WANT TO DELETE ${band.name}` : "";

  if (!band) {
    return (
      <AppScreen>
        <EmptyState
          tone="band"
          title="No band selected"
          message="Open the workspace switcher from your profile to create or select a band."
          action={<ActionButton label="Back to Personal" tone="band" onPress={setPersonalMode} />}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scroll
      header={
        <HeroHeader
          title="Band Profile"
          subtitle="Everything the band workspace needs: overview, media, shows, members, invites, and settings."
          eyebrow="Band Workspace"
          tone="band"
          action={
            <IconButton
              icon={<Edit3 size={18} color="#ffffff" />}
              onPress={() => {
                setName(band.name);
                setLocation(band.location);
                setSelectedGenres((band.genres as Genre[] | undefined) ?? []);
                setBio(band.bio ?? "");
                setEditOpen(true);
              }}
              tone="band"
              accessibilityLabel="Edit band profile"
            />
          }
        >
          <SectionCard tone="band">
            <View className="flex-row items-start gap-4">
              <Avatar uri={band.image} label={band.name} size={64} tone="band" />
              <View className="flex-1">
                <Text className="text-xl font-semibold text-slate-950">{band.name}</Text>
                <Text className="mt-2 text-sm text-slate-500">{band.location}</Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  <MiniBadge label={role ?? "member"} tone="band" />
                  {(band.genres ?? []).map((genre) => (
                    <MiniBadge key={genre} label={genre} tone="neutral" />
                  ))}
                </View>
              </View>
            </View>
          </SectionCard>

          {bandWithStats ? (
            <View className="mt-4 flex-row gap-2">
              <StatCard label="Shows" value={String(bandWithStats.stats.showsThisMonth)} tone="band" />
              <StatCard label="RSVPs" value={String(bandWithStats.stats.totalRsvps)} tone="band" />
              <StatCard label="New Fans" value={String(bandWithStats.stats.newFans)} tone="band" />
            </View>
          ) : null}
        </HeroHeader>
      }
    >
      <SegmentedTabs
        value={tab}
        tone="band"
        onChange={(value) => setTab(value as TabType)}
        options={[
          { value: "overview", label: "Overview" },
          { value: "media", label: "Media" },
          { value: "shows", label: "Shows" },
          { value: "settings", label: "Settings" },
        ]}
      />

      <View className="mt-5">
        {tab === "overview" ? (
          <View className="gap-4">
            <SectionCard tone="band">
              <SectionTitle
                title="Workspace"
                subtitle="Band switching and creation stay discoverable inside the profile flow."
              />
              <ProfileWorkspaceSwitcher />
            </SectionCard>

            <SectionCard>
              <SectionTitle title="Bio" subtitle="Your public-facing band story and positioning." />
              <Text className="text-sm leading-6 text-slate-600">{band.bio || "No bio added yet."}</Text>
            </SectionCard>

            <SectionCard>
              <SectionTitle title={`Members (${members.length})`} subtitle="Role hierarchy is surfaced directly from membership state." />
              <View className="gap-3">
                {members.map((member) => (
                  <RowLink
                    key={member.user._id}
                    title={member.user.name}
                    subtitle={member.user.location || "Bay Area"}
                    right={<MiniBadge label={member.membership.role} tone={member.membership.role === "owner" ? "warning" : "band"} />}
                  />
                ))}
              </View>
            </SectionCard>
          </View>
        ) : null}

        {tab === "media" ? (
          <View className="gap-4">
            <SectionCard>
              <SectionTitle
                title="Profile Media"
                subtitle="Six fixed media slots, matching the web band profile contract."
              />
              <View className="gap-3">
                {slots.map((slot) => (
                  <SectionCard key={slot.slotIndex} tone={slot.isFilled ? "band" : "neutral"}>
                    <View className="flex-row items-start gap-3">
                      <View className="h-24 w-24 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100">
                        {slot.isFilled && slot.mediaUrl ? (
                          <Image source={{ uri: slot.mediaUrl }} style={{ height: 96, width: 96 }} resizeMode="cover" />
                        ) : (
                          <View className="flex-1 items-center justify-center">
                            <ImageIcon size={24} color="#94a3b8" />
                          </View>
                        )}
                      </View>

                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-slate-900">Slot {slot.slotIndex + 1}</Text>
                        <Text className="mt-1 text-xs text-slate-500">
                          {slot.isFilled ? `${slot.mediaType} uploaded` : "Empty slot"}
                        </Text>
                        {slot.caption ? <Text className="mt-2 text-xs text-slate-500">{slot.caption}</Text> : null}
                        {slot.location ? <Text className="mt-1 text-xs text-slate-500">{slot.location}</Text> : null}
                      </View>
                    </View>

                    <View className="mt-4 flex-row gap-2">
                      <View className="flex-1">
                        <ActionButton
                          label={slot.isFilled ? "Replace" : "Upload"}
                          tone="band"
                          variant={slot.isFilled ? "secondary" : "primary"}
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
                        />
                      </View>
                      {slot.isFilled ? (
                        <View className="flex-1">
                          <ActionButton
                            label="Clear"
                            variant="danger"
                            onPress={() => void clearSlot({ bandId: band._id, slotIndex: slot.slotIndex })}
                          />
                        </View>
                      ) : null}
                    </View>
                  </SectionCard>
                ))}
              </View>
            </SectionCard>
          </View>
        ) : null}

        {tab === "shows" ? (
          <View className="gap-4">
            <SectionCard>
              <SectionTitle
                title="Past Shows"
                subtitle="Recent confirmed shows remain accessible from the band profile surface."
              />
              <View className="gap-3">
                {pastShows.length > 0 ? (
                  pastShows.map((show) => (
                    <RowLink
                      key={show.eventId}
                      title={show.title}
                      subtitle={`${show.venueName} • ${show.venueCity} • ${new Date(show.dateTime).toLocaleDateString()}`}
                    />
                  ))
                ) : (
                  <Text className="text-sm text-slate-500">No past shows yet.</Text>
                )}
              </View>
            </SectionCard>
          </View>
        ) : null}

        {tab === "settings" ? (
          <View className="gap-4">
            <SectionCard>
              <SectionTitle
                title="Band Image"
                subtitle="Primary artwork for the band profile header and public surfaces."
              />
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <ActionButton
                    label="Upload Image"
                    tone="band"
                    variant="secondary"
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
                  />
                </View>
                <View className="flex-1">
                  <ActionButton label="Clear Image" variant="danger" onPress={() => void clearBandImage({ bandId: band._id })} />
                </View>
              </View>
            </SectionCard>

            <SectionCard>
              <SectionTitle
                title="Member Management"
                subtitle="Invite users, adjust roles, remove members, and transfer ownership."
              />
              <View className="gap-3">
                {members.map((member) => (
                  <SectionCard key={member.user._id} tone="neutral">
                    <View className="flex-row items-start gap-3">
                      <Avatar uri={member.user.avatar} label={member.user.name} size={52} tone="band" />
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-slate-900">{member.user.name}</Text>
                        <Text className="mt-1 text-xs text-slate-500">{member.user.location || "Bay Area"}</Text>
                        <View className="mt-2">
                          <MiniBadge label={member.membership.role} tone={member.membership.role === "owner" ? "warning" : "band"} />
                        </View>
                      </View>
                    </View>

                    {canManage && member.membership.role !== "owner" ? (
                      <View className="mt-4 flex-row gap-2">
                        <View className="flex-1">
                          <ActionButton
                            label={member.membership.role === "admin" ? "Set Member" : "Set Admin"}
                            variant="secondary"
                            onPress={() =>
                              void updateMemberRole({
                                bandId: band._id,
                                memberUserId: member.user._id,
                                role: member.membership.role === "admin" ? "member" : "admin",
                              })
                            }
                          />
                        </View>
                        <View className="flex-1">
                          <ActionButton
                            label="Remove"
                            variant="danger"
                            onPress={() => void removeMember({ bandId: band._id, memberUserId: member.user._id })}
                          />
                        </View>
                      </View>
                    ) : null}

                    {canTransferOwnership && member.membership.role !== "owner" ? (
                      <View className="mt-2">
                        <ActionButton
                          label="Transfer Ownership"
                          tone="band"
                          onPress={() =>
                            void transferOwnership({
                              bandId: band._id,
                              newOwnerUserId: member.user._id,
                            })
                          }
                        />
                      </View>
                    ) : null}
                  </SectionCard>
                ))}
              </View>
            </SectionCard>

            {canManage ? (
              <SectionCard>
                <SectionTitle
                  title="Invite Member"
                  subtitle="Search existing users and invite them directly into the band workspace."
                />
                <TextInput
                  value={inviteQuery}
                  onChangeText={(value) => {
                    setInviteQuery(value);
                    setSelectedInviteUserId(null);
                    setError(null);
                    setNotice(null);
                  }}
                  placeholder="Search users by name"
                  placeholderTextColor="#94a3b8"
                  className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                />

                {(assignableUsers?.users ?? []).length > 0 ? (
                  <View className="mt-3 gap-2">
                    {assignableUsers?.users.map((candidate) => (
                      <Pressable
                        key={candidate.userId}
                        onPress={() => setSelectedInviteUserId(candidate.userId)}
                        className={`rounded-[18px] border px-4 py-3 active:opacity-70 ${selectedInviteUserId === candidate.userId ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-white"}`}
                      >
                        <Text className="text-sm font-semibold text-slate-900">{candidate.name}</Text>
                        <Text className="mt-1 text-xs text-slate-500">{candidate.inviteState}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <View className="mt-4 flex-row gap-2">
                  <View className="flex-1">
                    <ActionButton
                      label="Member"
                      variant={inviteRole === "member" ? "primary" : "secondary"}
                      tone="band"
                      onPress={() => setInviteRole("member")}
                    />
                  </View>
                  <View className="flex-1">
                    <ActionButton
                      label="Admin"
                      variant={inviteRole === "admin" ? "primary" : "secondary"}
                      tone="band"
                      onPress={() => setInviteRole("admin")}
                    />
                  </View>
                </View>

                {notice ? <Text className="mt-3 text-sm text-emerald-700">{notice}</Text> : null}
                {error ? <Text className="mt-3 text-sm text-red-600">{error}</Text> : null}

                <View className="mt-4">
                  <ActionButton
                    label="Send Invite"
                    tone="band"
                    onPress={async () => {
                      if (!selectedInviteUser || selectedInviteUser.inviteState !== "eligible") {
                        setError("Select an eligible user to invite.");
                        return;
                      }

                      setError(null);
                      setNotice(null);
                      const result = await inviteExistingUser({
                        bandId: band._id,
                        targetUserId: selectedInviteUser.userId as Id<"users">,
                        role: inviteRole,
                      });

                      if (result.action === "already_member") {
                        setError("Selected user is already a member.");
                        return;
                      }
                      if (result.action === "already_pending") {
                        setError("Selected user already has a pending invite.");
                        return;
                      }

                      setNotice("Invite sent.");
                      setInviteQuery("");
                      setSelectedInviteUserId(null);
                    }}
                  />
                </View>
              </SectionCard>
            ) : null}

            {invites.length > 0 ? (
              <SectionCard>
                <SectionTitle title="Pending Invites" subtitle="Pending, accepted, declined, and revoked invite history." />
                <View className="gap-3">
                  {invites.map((invite) => (
                    <SectionCard key={invite._id} tone="neutral">
                      <Text className="text-sm font-semibold text-slate-900">
                        {invite.targetUser?.name || invite.email}
                      </Text>
                      <Text className="mt-1 text-xs text-slate-500">
                        {invite.status} • {invite.role}
                      </Text>
                      {invite.status === "pending" ? (
                        <View className="mt-3">
                          <ActionButton
                            label="Revoke Invite"
                            variant="danger"
                            onPress={() => void revokeInvite({ inviteId: invite._id })}
                          />
                        </View>
                      ) : null}
                    </SectionCard>
                  ))}
                </View>
              </SectionCard>
            ) : null}

            {canTransferOwnership ? (
              <SectionCard tone="danger">
                <SectionTitle
                  title="Danger Zone"
                  subtitle="Deleting a band removes the workspace, memberships, and associated media."
                />
                <Text className="text-xs text-red-700">Type the confirmation phrase exactly:</Text>
                <Text className="mt-2 rounded-[18px] border border-red-200 bg-white px-4 py-3 text-xs text-red-700">
                  {deletePhrase}
                </Text>

                <TextInput
                  value={deleteText}
                  onChangeText={setDeleteText}
                  placeholder="Confirmation phrase"
                  placeholderTextColor="#fca5a5"
                  className="mt-3 rounded-[18px] border border-red-200 bg-white px-4 py-3 text-red-900"
                />

                <View className="mt-4">
                  <ActionButton
                    label="Delete Band"
                    variant="danger"
                    disabled={deleteText.trim() !== deletePhrase}
                    icon={<Trash2 size={16} color="#ffffff" />}
                    onPress={async () => {
                      await deleteBand({ bandId: band._id, confirmationText: deleteText.trim() });
                      setPersonalMode();
                    }}
                  />
                </View>
              </SectionCard>
            ) : null}

            <SectionCard>
              <ActionButton label="Sign Out" variant="danger" icon={<LogOut size={16} color="#ffffff" />} onPress={() => signOut()} />
            </SectionCard>
          </View>
        ) : null}
      </View>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[88%] rounded-t-[24px] bg-white p-5">
            <Text className="text-lg font-semibold text-slate-950">Edit Band Profile</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Band name"
              placeholderTextColor="#94a3b8"
              className="mt-4 min-h-[48px] rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            />

            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Location"
              placeholderTextColor="#94a3b8"
              className="mt-3 min-h-[48px] rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            />

            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Bio"
              placeholderTextColor="#94a3b8"
              multiline
              className="mt-3 h-28 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            />

            <Text className="mt-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-slate-500">Genres</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {GENRES.map((genre) => {
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
                    className={`rounded-full border px-3 py-2 active:opacity-70 ${active ? "border-violet-200 bg-violet-100" : "border-slate-200 bg-white"}`}
                  >
                    <Text className={`text-xs font-semibold ${active ? "text-violet-700" : "text-slate-600"}`}>
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-5 gap-2">
              <ActionButton
                label="Save Changes"
                tone="band"
                icon={<ShieldCheck size={16} color="#ffffff" />}
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
              />
              <ActionButton label="Cancel" variant="secondary" onPress={() => setEditOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}
