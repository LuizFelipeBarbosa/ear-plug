import { useProfileContext } from "@/context/ProfileContext";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { GENRES } from "@ear-plug/shared/constants";
import type { Genre } from "@ear-plug/shared/types";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ActionButton, MiniBadge, PillButton, SectionCard, SectionTitle } from "@/components/ui/AppPrimitives";
import { ArrowRight, Music4, UserRound } from "lucide-react-native";

function WorkspaceCard({
  title,
  subtitle,
  active,
  tone,
  roleLabel,
  onPress,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  tone: "personal" | "band";
  roleLabel?: string;
  onPress: () => void;
}) {
  const isPersonal = tone === "personal";

  return (
    <Pressable onPress={onPress} className="active:opacity-70">
      <SectionCard tone={active ? (isPersonal ? "fan" : "band") : "neutral"}>
        <View className="flex-row items-start gap-3">
          <View className={`h-11 w-11 items-center justify-center rounded-[18px] ${isPersonal ? "bg-fan/10" : "bg-band/10"}`}>
            {isPersonal ? <UserRound size={18} color="#2563eb" /> : <Music4 size={18} color="#7c3aed" />}
          </View>
          <View className="flex-1">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-900">{title}</Text>
                <Text className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</Text>
              </View>
              {roleLabel ? (
                <MiniBadge label={roleLabel} tone={isPersonal ? "fan" : "band"} />
              ) : (
                <ArrowRight size={16} color={isPersonal ? "#2563eb" : "#7c3aed"} />
              )}
            </View>
          </View>
        </View>
      </SectionCard>
    </Pressable>
  );
}

export function ProfileWorkspaceSwitcher() {
  const { mode, bandId, bands, setBandMode, setPersonalMode, notice, clearNotice } = useProfileContext();
  const pendingInvites = useQuery(api.bandMembers.listMyPendingInvites) ?? [];
  const createBand = useMutation(api.bands.create);
  const acceptInvite = useMutation(api.bandMembers.acceptInvite);
  const declineInvite = useMutation(api.bandMembers.declineInvite);

  const [open, setOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [creationCode, setCreationCode] = useState("");
  const [location, setLocation] = useState("");
  const [genre, setGenre] = useState<Genre>("indie");
  const [pendingCreate, setPendingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);

  const currentLabel = useMemo(() => {
    if (mode !== "band" || !bandId) return "Personal Profile";
    return bands.find((entry) => entry.band._id === bandId)?.band.name ?? "Band Workspace";
  }, [bandId, bands, mode]);

  const resetCreateForm = () => {
    setName("");
    setCreationCode("");
    setLocation("");
    setGenre("indie");
    setCreateError(null);
    setShowCreateForm(false);
  };

  const handleBandSelect = (nextBandId: Id<"bands">) => {
    setBandMode(nextBandId);
    setOpen(false);
  };

  return (
    <View>
      <Pressable onPress={() => setOpen(true)} className="active:opacity-70">
        <SectionCard tone={mode === "band" ? "band" : "fan"}>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.8px] text-slate-500">Workspace</Text>
              <Text className="mt-2 text-base font-semibold text-slate-950">{currentLabel}</Text>
              <Text className="mt-1 text-xs leading-5 text-slate-500">
                Personal is your default home. Band workspaces open full band profile, calendar, inbox, analytics, and settings.
              </Text>
            </View>
            {pendingInvites.length > 0 ? <MiniBadge label={`${pendingInvites.length} invites`} tone="warning" /> : null}
          </View>
        </SectionCard>
      </Pressable>

      {notice ? (
        <Pressable onPress={clearNotice} className="mt-2 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3">
          <Text className="text-xs leading-5 text-amber-800">{notice}</Text>
        </Pressable>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/45" onPress={() => setOpen(false)}>
          <Pressable className="mx-4 my-8 flex-1 rounded-[32px] bg-[#f8fafc]" onPress={() => {}}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
              <SectionTitle
                title={showCreateForm ? "Create Band Workspace" : "Workspaces"}
                subtitle={
                  showCreateForm
                    ? "Every account starts personal. Create a band when you need band tools."
                    : "Switch between personal and band contexts, then handle invites from the same menu."
                }
              />

              {showCreateForm ? (
                <>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Band name"
                    placeholderTextColor="#94a3b8"
                    className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900"
                  />

                  <TextInput
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Location"
                    placeholderTextColor="#94a3b8"
                    className="mt-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900"
                  />

                  <TextInput
                    value={creationCode}
                    onChangeText={setCreationCode}
                    placeholder="Band creation code"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    className="mt-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900"
                  />

                  <Text className="mt-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-slate-500">
                    Primary Genre
                  </Text>
                  <View className="mt-3 flex-row flex-wrap">
                    {GENRES.map((option) => (
                      <PillButton
                        key={option.value}
                        label={option.label}
                        active={genre === option.value}
                        tone="band"
                        onPress={() => setGenre(option.value)}
                      />
                    ))}
                  </View>

                  {createError ? <Text className="mt-3 text-sm text-red-600">{createError}</Text> : null}

                  <View className="mt-5 gap-2">
                    <ActionButton
                      label={pendingCreate ? "Creating..." : "Create Band"}
                      tone="band"
                      disabled={pendingCreate}
                      onPress={async () => {
                        if (!name.trim() || !location.trim() || !creationCode.trim()) {
                          setCreateError("Band name, location, and creation code are required.");
                          return;
                        }

                        setCreateError(null);
                        setPendingCreate(true);

                        try {
                          const createdBandId = await createBand({
                            name: name.trim(),
                            creationCode: creationCode.trim(),
                            location: location.trim(),
                            genres: [genre],
                          });
                          resetCreateForm();
                          setBandMode(createdBandId);
                          setOpen(false);
                        } catch (error) {
                          setCreateError(error instanceof Error ? error.message : "Failed to create band.");
                        } finally {
                          setPendingCreate(false);
                        }
                      }}
                    />
                    <ActionButton label="Back" variant="secondary" onPress={resetCreateForm} />
                  </View>
                </>
              ) : (
                <>
                  <View className="gap-3">
                    <WorkspaceCard
                      title="Personal Profile"
                      subtitle="Discover shows, manage your profile, and create bands."
                      active={mode === "personal"}
                      tone="personal"
                      onPress={() => {
                        setPersonalMode();
                        setOpen(false);
                      }}
                    />

                    {bands.map((entry) => {
                      const active = mode === "band" && bandId === entry.band._id;
                      return (
                          <WorkspaceCard
                          key={entry.band._id}
                          title={entry.band.name}
                          subtitle="Open band dashboard, calendar, inbox, analytics, and profile."
                          active={active}
                          tone="band"
                          roleLabel={entry.membership.role}
                          onPress={() => handleBandSelect(entry.band._id)}
                        />
                      );
                    })}
                  </View>

                  <View className="mt-4">
                    <ActionButton
                      label={bands.length === 0 ? "Create First Band" : "Create Another Band"}
                      tone="band"
                      onPress={() => {
                        setCreateError(null);
                        setShowCreateForm(true);
                      }}
                    />
                  </View>

                  {pendingInvites.length > 0 ? (
                    <View className="mt-6">
                      <SectionTitle title="Pending Invites" subtitle="Accept or decline invites without leaving profile." />
                      <View className="gap-3">
                        {pendingInvites.map((invite) => (
                          <SectionCard key={invite._id} tone="band">
                            <Text className="text-sm font-semibold text-slate-900">{invite.band?.name || "Band Invite"}</Text>
                            <Text className="mt-1 text-xs text-slate-500">
                              {invite.role} • invited by {invite.invitedByUser?.name || "a band member"}
                            </Text>

                            <View className="mt-4 flex-row gap-2">
                              <View className="flex-1">
                                <ActionButton
                                  label={pendingInviteId === invite._id ? "Working..." : "Accept"}
                                  tone="band"
                                  disabled={pendingInviteId === invite._id}
                                  onPress={async () => {
                                    setPendingInviteId(invite._id);
                                    try {
                                      await acceptInvite({ inviteId: invite._id });
                                      setBandMode(invite.bandId);
                                    } finally {
                                      setPendingInviteId(null);
                                    }
                                  }}
                                />
                              </View>
                              <View className="flex-1">
                                <ActionButton
                                  label="Decline"
                                  variant="secondary"
                                  disabled={pendingInviteId === invite._id}
                                  onPress={async () => {
                                    setPendingInviteId(invite._id);
                                    try {
                                      await declineInvite({ inviteId: invite._id });
                                    } finally {
                                      setPendingInviteId(null);
                                    }
                                  }}
                                />
                              </View>
                            </View>
                          </SectionCard>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
